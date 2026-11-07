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

// 1. Meta Webhook Verification Handshake (GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token=...)
export async function GET(request) {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    const source = searchParams.get('source');

    const expectedToken =
      settings.metaConfig?.verifyToken || process.env.META_VERIFY_TOKEN || 'OILFLOW_CRM_SECRET_2026';

    if (mode === 'subscribe') {
      if (token === expectedToken) {
        return new Response(challenge || 'OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      return NextResponse.json({ error: 'Invalid verify_token' }, { status: 403 });
    }

    return NextResponse.json({
      status: 'active',
      endpoint: '/api/webhooks/meta',
      source: source || 'facebook_instagram',
      verifyTokenConfigured: true,
      message: 'KisanConnect Multi-Channel Lead Webhook Receiver is online.'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Incoming Webhook Payload Receiver (POST /api/webhooks/meta?source=<providerId>)
export async function POST(request) {
  const startTime = Date.now();
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const sourceParam = searchParams.get('source') || '';
    const body = await request.json().catch(() => ({}));
    const settings = await getOrInitSettings();

    // Parse either standard JSON lead payload OR Meta Graph webhook entry[].changes[].value
    let extracted = {
      name: body.name || body.full_name || body.sender_name || '',
      mobile: body.mobile || body.phone || body.phone_number || body.sender_mobile || '',
      email: body.email || '',
      city: body.city || 'Indore',
      state: body.state || 'Madhya Pradesh',
      business_type: body.business_type || 'Distributor',
      product_interest: body.product_interest || body.subject || 'Mustard Oil (15L Tin)',
      formId: body.formId || body.form_id || '',
      providerId: body.providerId || sourceParam || '',
      lead_source: body.lead_source || '',
      campaign_name: body.campaign_name || ''
    };

    if (Array.isArray(body.entry) && body.entry[0]?.changes?.[0]?.value) {
      const val = body.entry[0].changes[0].value;
      extracted.formId = val.form_id || extracted.formId;
      if (Array.isArray(val.field_data)) {
        for (const f of val.field_data) {
          const v = Array.isArray(f.values) ? f.values[0] : '';
          if (f.name === 'full_name' || f.name.includes('name')) extracted.name = v;
          if (f.name === 'phone_number' || f.name.includes('phone')) extracted.mobile = v;
          if (f.name === 'city') extracted.city = v;
          if (f.name === 'state') extracted.state = v;
          if (f.name === 'email') extracted.email = v;
        }
      }
    }

    const providerConfig = extracted.providerId
      ? (settings.connectedIntegrations || []).find(p => p.providerId === extracted.providerId)
      : null;
    const formConfig = extracted.formId
      ? (settings.metaForms || []).find(f => f.formId === extracted.formId)
      : (settings.metaForms || [])[0];

    const cleanPhone = sanitizePhone(extracted.mobile);
    const zeroLossTriggered = !cleanPhone;
    const zeroLossAllowed = settings.metaConfig?.zeroLossFallback ?? true;

    if (zeroLossTriggered && !zeroLossAllowed) {
      return NextResponse.json(
        { error: `Invalid phone number (${extracted.mobile || 'Empty'}) rejected.` },
        { status: 400 }
      );
    }

    const savedMobile = cleanPhone || (extracted.mobile ? String(extracted.mobile).substring(0, 20) : '0000000000');
    const tags = zeroLossTriggered ? ['Urgent'] : [];
    const resolvedSource =
      extracted.lead_source || providerConfig?.providerName || 'Facebook Meta Lead Ads';
    const resolvedCampaign =
      extracted.campaign_name ||
      providerConfig?.campaignName ||
      formConfig?.campaignName ||
      'Facebook Meta Lead Ads';

    const strategy =
      providerConfig?.distributionRule ||
      formConfig?.distributionRule ||
      settings.distributionStrategy ||
      'ROUND_ROBIN';

    let activeCallers = await User.find({
      role: 'telecaller',
      status: 'active',
      on_leave: false,
      shift_status: { $ne: 'Clocked Out' }
    }).sort({ _id: 1 });

    if (activeCallers.length === 0) {
      activeCallers = await User.find({ role: 'telecaller', status: 'active' }).sort({ _id: 1 });
    }

    let callerPool = activeCallers;
    const targetTeam = providerConfig?.assignedTeam || formConfig?.assignedTeam;
    if (targetTeam) {
      const teamCallers = activeCallers.filter(
        c => (c.team || '').toLowerCase() === targetTeam.toLowerCase()
      );
      if (teamCallers.length > 0) callerPool = teamCallers;
    }

    let chosenCaller = null;
    if (callerPool.length > 0) {
      if (strategy === 'DIRECT_CALLER' && formConfig?.assignedCallerId) {
        chosenCaller =
          activeCallers.find(c => c._id.toString() === formConfig.assignedCallerId.toString()) ||
          callerPool[0];
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
      name: extracted.name || 'Webhook Lead Prospect',
      mobile: savedMobile,
      email: extracted.email || '',
      city: extracted.city || 'Indore',
      state: extracted.state || 'Madhya Pradesh',
      business_type: extracted.business_type || 'Distributor',
      product_interest: extracted.product_interest || 'Mustard Oil (15L Tin)',
      lead_source: resolvedSource,
      campaign_name: resolvedCampaign,
      status: chosenCaller ? 'Assigned' : 'Fresh Lead',
      assigned_to: chosenCaller ? chosenCaller._id : null,
      assigned_at: chosenCaller ? new Date() : null,
      tags,
      notes: zeroLossTriggered
        ? `[URGENT] Invalid Phone (${extracted.mobile || 'Empty'})! Saved via Zero-Loss Fallback (${resolvedSource}).`
        : `Captured via ${resolvedSource} Webhook • Campaign="${resolvedCampaign}"`
    });

    if (providerConfig) {
      const pIdx = (settings.connectedIntegrations || []).findIndex(
        p => p.providerId === providerConfig.providerId
      );
      if (pIdx >= 0) {
        settings.connectedIntegrations[pIdx].leadsCaptured =
          (settings.connectedIntegrations[pIdx].leadsCaptured || 0) + 1;
        settings.connectedIntegrations[pIdx].lastSyncAt = new Date();
        settings.markModified('connectedIntegrations');
      }
    } else if (formConfig) {
      const idx = (settings.metaForms || []).findIndex(f => f.formId === formConfig.formId);
      if (idx >= 0) {
        settings.metaForms[idx].leadsCaptured = (settings.metaForms[idx].leadsCaptured || 0) + 1;
        settings.metaForms[idx].lastLeadAt = new Date();
        settings.markModified('metaForms');
      }
    }
    settings.metaConfig.lastSyncAt = new Date();
    settings.markModified('metaConfig');
    await settings.save();

    // Invalidate Next.js cache so dashboard and metrics immediately reflect this lead
    purgeDashboardCache();
    purgeMetaCache();

    return NextResponse.json({
      success: true,
      lead_id: newLead.lead_id,
      name: newLead.name,
      source: resolvedSource,
      campaignName: resolvedCampaign,
      assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned',
      zeroLossTriggered,
      latencyMs: Date.now() - startTime
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
