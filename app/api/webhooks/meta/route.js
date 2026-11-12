import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import { getOrInitSettings } from '../../../../lib/settings';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';
import { parseMetaLeadItem, sanitizePhone } from '../../../../lib/metaLeadParser';
import { analyzeLeadQuality } from '../../../../lib/metaLeadQuality';

export const dynamic = 'force-dynamic';

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
      settings.metaConfig?.verifyToken || process.env.META_VERIFY_TOKEN || 'KISAN_META_WEBHOOK_VERIFY';

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
      message: 'Kisan Choice Meta Lead Ads Webhook Receiver is online.'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const startTime = Date.now();
  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const settings = await getOrInitSettings();

    let extracted = {
      name: (body.name || body.full_name || body.sender_name || '').trim(),
      mobile: (body.mobile || body.phone || body.phone_number || body.sender_mobile || '').trim(),
      email: (body.email || '').trim(),
      city: (body.city || '').trim(),
      state: (body.state || '').trim(),
      business_type: (body.business_type || '').trim(),
      product_interest: (body.product_interest || body.subject || '').trim(),
      formId: String(body.formId || body.form_id || ''),
      lead_source: 'Facebook Meta Lead Ads',
      campaign_name: (body.campaign_name || '').trim(),
      metaLeadId: '',
      notes: '',
      createdTime: null
    };

    const token = process.env.META_PAGE_ACCESS_TOKEN || settings.metaConfig?.accessToken || process.env.META_USER_ACCESS_TOKEN || '';

    if (Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of (entry.changes || [])) {
          if (change.value) {
            const val = change.value;
            extracted.formId = val.form_id ? String(val.form_id) : extracted.formId;
            extracted.metaLeadId = val.leadgen_id ? String(val.leadgen_id) : extracted.metaLeadId;

            const matchedForm = (settings.metaForms || []).find(f => f.formId === extracted.formId);

            if (extracted.metaLeadId && token) {
              try {
                const leadRes = await fetch(
                  `https://graph.facebook.com/v21.0/${extracted.metaLeadId}?fields=id,created_time,ad_name,campaign_name,form_id,field_data&access_token=${encodeURIComponent(token)}`,
                  { cache: 'no-store' }
                );
                const leadData = await leadRes.json();
                if (leadData && !leadData.error) {
                  const parsed = parseMetaLeadItem(leadData, matchedForm?.formName || '');
                  extracted.name = parsed.name || extracted.name;
                  extracted.mobile = parsed.mobile || parsed.rawMobile || extracted.mobile;
                  extracted.email = parsed.email || extracted.email;
                  extracted.city = parsed.city || extracted.city;
                  extracted.state = parsed.state || extracted.state;
                  extracted.business_type = parsed.businessType || extracted.business_type;
                  extracted.product_interest = parsed.productInterest || extracted.product_interest;
                  extracted.campaign_name = parsed.campaignName || extracted.campaign_name;
                  extracted.notes = parsed.notes;
                  extracted.createdTime = parsed.createdTime;
                }
              } catch (fetchErr) {
                console.warn('Webhook leadgen fetch warning:', fetchErr.message);
              }
            } else if (Array.isArray(val.field_data)) {
              const parsed = parseMetaLeadItem(
                { id: extracted.metaLeadId, field_data: val.field_data, campaign_name: val.campaign_name },
                matchedForm?.formName || ''
              );
              extracted.name = parsed.name || extracted.name;
              extracted.mobile = parsed.mobile || parsed.rawMobile || extracted.mobile;
              extracted.email = parsed.email || extracted.email;
              extracted.city = parsed.city || extracted.city;
              extracted.state = parsed.state || extracted.state;
              extracted.business_type = parsed.businessType || extracted.business_type;
              extracted.product_interest = parsed.productInterest || extracted.product_interest;
              extracted.notes = parsed.notes;
            }
          }
        }
      }
    }

    const formConfig = extracted.formId
      ? (settings.metaForms || []).find(f => f.formId === extracted.formId)
      : null;

    const cleanPhone = sanitizePhone(extracted.mobile);
    const rawMobile = String(extracted.mobile || '').trim();
    if (!cleanPhone && !rawMobile) {
      return NextResponse.json({ error: 'Webhook payload contained no mobile number.' }, { status: 400 });
    }

    const zeroLossTriggered = !cleanPhone;
    const zeroLossAllowed = settings.metaConfig?.zeroLossFallback ?? true;

    if (zeroLossTriggered && !zeroLossAllowed) {
      return NextResponse.json(
        { error: `Invalid phone number (${rawMobile}) rejected.` },
        { status: 400 }
      );
    }

    if (cleanPhone) {
      const existing = await Lead.findOne({ mobile: cleanPhone });
      if (existing) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          lead_id: existing.lead_id,
          message: 'Lead already ingested in CRM.'
        });
      }
    }
    if (extracted.metaLeadId) {
      const existingMeta = await Lead.findOne({ notes: { $regex: extracted.metaLeadId } });
      if (existingMeta) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          lead_id: existingMeta.lead_id,
          message: 'Meta Lead ID already ingested in CRM.'
        });
      }
    }

    const savedMobile = cleanPhone || rawMobile.substring(0, 20);
    const tags = zeroLossTriggered ? ['Urgent'] : [];
    const resolvedSource = 'Facebook Meta Lead Ads';
    const resolvedCampaign = extracted.campaign_name || formConfig?.campaignName || formConfig?.formName || '';

    const strategy = formConfig?.distributionRule || settings.distributionStrategy || 'ROUND_ROBIN';

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
    const targetTeam = formConfig?.assignedTeam;
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

    const qualityResult = analyzeLeadQuality({
      name: extracted.name,
      mobile: savedMobile,
      email: extracted.email,
      city: extracted.city,
      state: extracted.state,
      business_type: extracted.business_type,
      product_interest: extracted.product_interest
    });

    if (qualityResult.tier === 'High Intent (VIP)') {
      tags.push('High Intent');
    }
    if (qualityResult.isSpam) {
      tags.push('Suspect Spam');
    }

    const priority = qualityResult.score >= 80 ? 'VIP' : (qualityResult.score >= 60 ? 'High' : 'Normal');

    const newLead = await Lead.create({
      name: extracted.name || `Meta Lead ${extracted.metaLeadId || ''}`.trim(),
      mobile: savedMobile,
      email: extracted.email,
      city: extracted.city,
      state: extracted.state,
      business_type: extracted.business_type,
      product_interest: extracted.product_interest,
      lead_source: resolvedSource,
      campaign_name: resolvedCampaign,
      status: chosenCaller ? 'Assigned' : 'Fresh Lead',
      priority,
      assigned_to: chosenCaller ? chosenCaller._id : null,
      assigned_at: chosenCaller ? new Date() : null,
      tags,
      notes: extracted.notes || (zeroLossTriggered
        ? `[URGENT] Unformatted Phone (${rawMobile}) saved via Zero-Loss Fallback. Intent Score: ${qualityResult.score}/100.`
        : `Captured via ${resolvedSource} Webhook • Quality=${qualityResult.tier} (${qualityResult.score}/100)${resolvedCampaign ? ` • Campaign="${resolvedCampaign}"` : ''}`),
      ...(extracted.createdTime ? { createdAt: extracted.createdTime } : {})
    });

    if (formConfig) {
      const idx = (settings.metaForms || []).findIndex(f => f.formId === formConfig.formId);
      if (idx >= 0) {
        settings.metaForms[idx].leadsCaptured = (settings.metaForms[idx].leadsCaptured || 0) + 1;
        settings.metaForms[idx].lastLeadAt = new Date();
        settings.markModified('metaForms');
      }
    }

    // Save Webhook Delivery Log
    const latencyMs = Date.now() - startTime;
    const webhookLogItem = {
      id: `wh-${Date.now()}`,
      timestamp: new Date(),
      formId: extracted.formId || 'Direct',
      leadId: newLead.lead_id,
      leadName: newLead.name,
      leadMobile: newLead.mobile,
      qualityScore: qualityResult.score,
      qualityTier: qualityResult.tier,
      status: 'INGESTED_200_OK',
      assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned Pool',
      latencyMs
    };

    const whLogs = settings.metaWebhookLogs || [];
    whLogs.push(webhookLogItem);
    if (whLogs.length > 50) whLogs.shift();
    settings.metaWebhookLogs = whLogs;

    settings.metaConfig.lastSyncAt = new Date();
    settings.markModified('metaConfig');
    await settings.save();

    purgeDashboardCache();
    purgeMetaCache();

    return NextResponse.json({
      success: true,
      lead_id: newLead.lead_id,
      name: newLead.name,
      mobile: newLead.mobile,
      qualityScore: qualityResult.score,
      qualityTier: qualityResult.tier,
      source: resolvedSource,
      campaignName: resolvedCampaign,
      assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned',
      zeroLossTriggered,
      latencyMs
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
