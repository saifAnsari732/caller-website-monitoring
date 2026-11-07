import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import { getOrInitSettings } from '../../../../lib/settings';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';

export const dynamic = 'force-dynamic';

function sanitizePhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  cleaned = cleaned.replace(/^\+91/, '').replace(/^91/, '');
  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.length === 10 && !/^0+$/.test(cleaned)) return cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
    if (cleaned.length === 10 && !/^0+$/.test(cleaned)) return cleaned;
  }
  return '';
}

export async function POST(request) {
  const startTime = Date.now();
  try {
    await connectDB();
    const {
      name,
      mobile,
      email,
      city,
      state,
      business_type,
      product_interest,
      formId,
      providerId,
      lead_source,
      campaign_name
    } = await request.json();

    const settings = await getOrInitSettings();
    const formConfig = formId
      ? (settings.metaForms || []).find(f => f.formId === formId)
      : (settings.metaForms || [])[0];
    const providerConfig = providerId
      ? (settings.connectedIntegrations || []).find(p => p.providerId === providerId)
      : null;

    const cleanPhone = sanitizePhone(mobile);
    const zeroLossTriggered = !cleanPhone;
    const zeroLossAllowed = settings.metaConfig?.zeroLossFallback ?? true;

    if (zeroLossTriggered && !zeroLossAllowed) {
      return NextResponse.json(
        { error: `Invalid phone number (${mobile || 'Empty'}) rejected because Zero-Loss Fallback is disabled.` },
        { status: 400 }
      );
    }

    const savedMobile = cleanPhone || (mobile ? String(mobile).substring(0, 20) : '0000000000');
    const tags = zeroLossTriggered ? ['Urgent'] : [];
    const resolvedSource = lead_source || providerConfig?.providerName || 'Facebook Meta Lead Ads';
    const resolvedCampaign = campaign_name || providerConfig?.campaignName || formConfig?.campaignName || 'Facebook Meta Lead Ads';
    const resolvedFormName = providerConfig ? `${providerConfig.providerName} Webhook` : (formConfig?.formName || 'KisanChoice Lead Form 2026');

    const notes = zeroLossTriggered
      ? `[URGENT] Invalid Phone Provided (${mobile || 'Empty'})! Saved via Zero-Loss Fallback.\nReceived via ${resolvedSource} Webhook (${resolvedFormName}).`
      : `Received via ${resolvedSource} Webhook. Source="${resolvedFormName}" • Campaign="${resolvedCampaign}"`;

    const strategy = providerConfig?.distributionRule || formConfig?.distributionRule || settings?.distributionStrategy || 'ROUND_ROBIN';
    const autoSyncAllowed = (settings.metaConfig?.autoSyncEnabled ?? true) && (formConfig ? formConfig.active !== false : true);

    let activeCallers = await User.find({
      role: 'telecaller',
      status: 'active',
      on_leave: false,
      shift_status: { $ne: 'Clocked Out' }
    }).sort({ _id: 1 });

    if (activeCallers.length === 0) {
      activeCallers = await User.find({ role: 'telecaller', status: 'active' }).sort({ _id: 1 });
    }

    // Filter by team if form or provider specifies an assignedTeam
    let callerPool = activeCallers;
    const targetTeam = providerConfig?.assignedTeam || formConfig?.assignedTeam;
    if (targetTeam) {
      const teamCallers = activeCallers.filter(
        c => (c.team || '').toLowerCase() === targetTeam.toLowerCase()
      );
      if (teamCallers.length > 0) callerPool = teamCallers;
    }

    let chosenCaller = null;
    if (autoSyncAllowed && callerPool.length > 0) {
      if (strategy === 'DIRECT_CALLER' && formConfig?.assignedCallerId) {
        chosenCaller = activeCallers.find(c => c._id.toString() === formConfig.assignedCallerId.toString()) || callerPool[0];
      } else if (strategy === 'LOAD_BALANCED') {
        const counts = await Promise.all(
          callerPool.map(async (c) => ({
            caller: c,
            open: await Lead.countDocuments({
              assigned_to: c._id,
              status: { $in: ['Fresh Lead', 'Assigned', 'Follow Up', 'Callback'] }
            })
          }))
        );
        counts.sort((a, b) => a.open - b.open);
        chosenCaller = counts[0].caller;
      } else {
        const lastLead = await Lead.findOne({ assigned_to: { $in: callerPool.map(p => p._id) } })
          .sort({ assigned_at: -1 })
          .lean();
        const lastIdx = lastLead?.assigned_to
          ? callerPool.findIndex(c => c._id.toString() === lastLead.assigned_to.toString())
          : -1;
        chosenCaller = callerPool[(lastIdx + 1) % callerPool.length];
      }
    }

    const newLead = await Lead.create({
      name: name || 'Meta Lead Prospect',
      mobile: savedMobile,
      email: email || '',
      city: city || 'Indore',
      state: state || 'Madhya Pradesh',
      business_type: business_type || 'Distributor',
      product_interest: product_interest || 'Mustard Oil (15L Tin)',
      lead_source: resolvedSource,
      campaign_name: resolvedCampaign,
      status: chosenCaller ? 'Assigned' : 'Fresh Lead',
      assigned_to: chosenCaller ? chosenCaller._id : null,
      assigned_at: chosenCaller ? new Date() : null,
      tags,
      notes
    });

    if (providerConfig) {
      const pIdx = (settings.connectedIntegrations || []).findIndex(p => p.providerId === providerConfig.providerId);
      if (pIdx >= 0) {
        settings.connectedIntegrations[pIdx].leadsCaptured = (settings.connectedIntegrations[pIdx].leadsCaptured || 0) + 1;
        settings.connectedIntegrations[pIdx].lastSyncAt = new Date();
        settings.markModified('connectedIntegrations');
      }
    } else if (formConfig) {
      const idx = (settings.metaForms || []).findIndex(f => f.formId === formConfig.formId);
      if (idx >= 0) {
        settings.metaForms[idx].leadsCaptured = (settings.metaForms[idx].leadsCaptured || 0) + 1;
        settings.metaForms[idx].lastLeadAt = new Date();
      }
    }
    settings.metaConfig.lastSyncAt = new Date();
    settings.markModified('metaForms');
    settings.markModified('metaConfig');
    await settings.save();

    // Invalidate Next.js cache so dashboard and metrics immediately reflect this simulated lead
    purgeDashboardCache();
    purgeMetaCache();

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      lead_id: newLead.lead_id,
      name: newLead.name,
      mobile: newLead.mobile,
      city: newLead.city,
      state: newLead.state,
      source: resolvedSource,
      campaignName: resolvedCampaign,
      formName: resolvedFormName,
      assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned',
      assignedTeam: chosenCaller?.team || targetTeam || 'North Region Sales',
      strategy,
      zeroLossTriggered,
      latencyMs
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
