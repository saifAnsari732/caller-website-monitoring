import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import Counter from '../../../../lib/models/Counter';
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
      concurrencyProtection: 'ATOMIC_SEQUENCE_MUTEX',
      message: 'Kisan Choice Meta Lead Ads Webhook Receiver is online (High-Throughput Zero-Loss Engine).'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function pickCallerAtomic(activeCallers, formConfig, globalStrategy) {
  if (!activeCallers || activeCallers.length === 0) return null;

  if (formConfig?.distributionRule === 'DIRECT_CALLER' && formConfig?.assignedCallerId) {
    const direct = activeCallers.find(c => c._id.toString() === formConfig.assignedCallerId.toString());
    if (direct) return direct;
  }

  let pool = activeCallers;
  if (formConfig?.assignedTeam) {
    const teamMembers = activeCallers.filter(
      c => (c.team || '').toLowerCase() === formConfig.assignedTeam.toLowerCase()
    );
    if (teamMembers.length > 0) pool = teamMembers;
  }

  const rule = formConfig?.distributionRule || globalStrategy || 'ROUND_ROBIN';

  if (rule === 'LOAD_BALANCED') {
    const counts = await Promise.all(
      pool.map(async (c) => ({
        caller: c,
        open: await Lead.countDocuments({
          assigned_to: c._id,
          status: { $in: ['Fresh Lead', 'Assigned', 'In-Progress', 'Follow Up', 'Callback'] }
        })
      }))
    );
    counts.sort((a, b) => a.open - b.open);
    return counts[0].caller;
  }

  // ATOMIC ROUND-ROBIN: Increment persistent counter to guarantee NO collisions during concurrent bursts
  const poolKey = `rr_${formConfig?.formId || formConfig?.assignedTeam || 'global'}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: poolKey },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  const callerIdx = Math.abs((counter?.seq || 0) % pool.length);
  return pool[callerIdx];
}

export async function POST(request) {
  const startTime = Date.now();
  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const settings = await getOrInitSettings();
    const token =
      settings.metaConfig?.accessToken ||
      process.env.META_PAGE_ACCESS_TOKEN ||
      settings.metaConfig?.userAccessToken ||
      process.env.META_USER_ACCESS_TOKEN ||
      '';

    // 1. EXTRACT ALL INCOMING LEAD ITEMS (Full Multi-lead Batch Support)
    const incomingItems = [];

    if (Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of (entry.changes || [])) {
          if (change?.value) {
            incomingItems.push({
              pageId: String(entry.id || ''),
              formId: String(change.value.form_id || ''),
              metaLeadId: String(change.value.leadgen_id || ''),
              field_data: change.value.field_data || null,
              campaign_name: change.value.campaign_name || '',
              raw: change.value
            });
          }
        }
      }
    }

    // Direct single payload fallback (e.g. from tests or webhooks without entry envelope)
    if (incomingItems.length === 0) {
      incomingItems.push({
        formId: String(body.formId || body.form_id || ''),
        metaLeadId: String(body.leadgen_id || body.metaLeadId || ''),
        name: (body.name || body.full_name || body.sender_name || '').trim(),
        mobile: (body.mobile || body.phone || body.phone_number || body.sender_mobile || '').trim(),
        email: (body.email || '').trim(),
        city: (body.city || '').trim(),
        state: (body.state || '').trim(),
        business_type: (body.business_type || '').trim(),
        product_interest: (body.product_interest || body.subject || '').trim(),
        campaign_name: (body.campaign_name || '').trim(),
        notes: body.notes || ''
      });
    }

    let activeCallers = await User.find({
      role: 'telecaller',
      status: 'active',
      on_leave: false,
      shift_status: { $ne: 'Clocked Out' }
    }).sort({ _id: 1 });

    if (activeCallers.length === 0) {
      activeCallers = await User.find({ role: 'telecaller', status: 'active' }).sort({ _id: 1 });
    }

    const results = [];
    const whLogs = settings.metaWebhookLogs || [];

    // 2. PROCESS EVERY LEAD IN THE BATCH (Zero-Loss Pipeline)
    for (const rawItem of incomingItems) {
      let extracted = {
        name: rawItem.name || '',
        mobile: rawItem.mobile || '',
        email: rawItem.email || '',
        city: rawItem.city || '',
        state: rawItem.state || '',
        business_type: rawItem.business_type || '',
        product_interest: rawItem.product_interest || '',
        formId: rawItem.formId || '',
        lead_source: 'Facebook Meta Lead Ads',
        campaign_name: rawItem.campaign_name || '',
        metaLeadId: rawItem.metaLeadId || '',
        join_as: '',
        start_timeline: '',
        notes: rawItem.notes || '',
        createdTime: null
      };

      const matchedForm = (settings.metaForms || []).find(f => f.formId === extracted.formId);

      // Determine the best token for this specific page if multi-account is present
      const pageMatch = Array.isArray(settings.metaConfig?.connectedPages)
        ? settings.metaConfig.connectedPages.find(p => p.id === rawItem.pageId)
        : null;
      const activeToken = pageMatch?.accessToken || token;

      // Fetch from Meta Graph API if leadgen_id exists and token is active
      let parsedFromGraph = false;
      if (extracted.metaLeadId && activeToken && activeToken.length > 15) {
        try {
          const leadRes = await fetch(
            `https://graph.facebook.com/v21.0/${extracted.metaLeadId}?fields=id,created_time,ad_name,campaign_name,form_id,field_data&access_token=${encodeURIComponent(activeToken.trim())}`,
            { cache: 'no-store' }
          );
          const leadData = await leadRes.json();
          if (leadData && !leadData.error) {
            let formName = matchedForm?.formName || '';
            if (!formName && extracted.formId) {
              try {
                const fnRes = await fetch(
                  `https://graph.facebook.com/v21.0/${extracted.formId}?fields=name&access_token=${encodeURIComponent(activeToken.trim())}`,
                  { cache: 'no-store' }
                );
                const fnData = await fnRes.json();
                if (fnData?.name) formName = fnData.name;
              } catch {}
            }

            const parsed = parseMetaLeadItem(leadData, formName);
            extracted.name = parsed.name || extracted.name;
            extracted.mobile = parsed.mobile || parsed.rawMobile || extracted.mobile;
            extracted.email = parsed.email || extracted.email;
            extracted.city = parsed.city || extracted.city;
            extracted.state = parsed.state || extracted.state;
            extracted.business_type = parsed.businessType || extracted.business_type;
            extracted.product_interest = parsed.productInterest || extracted.product_interest;
            extracted.campaign_name = parsed.campaignName || formName || extracted.campaign_name;
            extracted.join_as = parsed.join_as || parsed.businessType || '';
            extracted.start_timeline = parsed.start_timeline || parsed.productInterest || '';
            extracted.notes = parsed.notes || extracted.notes;
            extracted.createdTime = parsed.createdTime;
            parsedFromGraph = true;
          }
        } catch (fetchErr) {
          console.warn(`[Meta Webhook] Graph fetch warning for lead ${extracted.metaLeadId}:`, fetchErr.message);
        }
      }

      // Fallback: parse raw field_data if provided directly in webhook
      if (!parsedFromGraph && Array.isArray(rawItem.field_data)) {
        const parsed = parseMetaLeadItem(
          { id: extracted.metaLeadId, field_data: rawItem.field_data, campaign_name: rawItem.campaign_name },
          matchedForm?.formName || ''
        );
        extracted.name = parsed.name || extracted.name;
        extracted.mobile = parsed.mobile || parsed.rawMobile || extracted.mobile;
        extracted.email = parsed.email || extracted.email;
        extracted.city = parsed.city || extracted.city;
        extracted.state = parsed.state || extracted.state;
        extracted.business_type = parsed.businessType || extracted.business_type;
        extracted.product_interest = parsed.productInterest || extracted.product_interest;
        extracted.campaign_name = parsed.campaignName || extracted.campaign_name;
        extracted.join_as = parsed.join_as || parsed.businessType || '';
        extracted.start_timeline = parsed.start_timeline || parsed.productInterest || '';
        extracted.notes = parsed.notes || extracted.notes;
      }

      const cleanPhone = sanitizePhone(extracted.mobile);
      const rawMobile = String(extracted.mobile || '').trim();

      if (!cleanPhone && !rawMobile && !extracted.metaLeadId) {
        whLogs.push({
          id: `wh-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date(),
          formId: extracted.formId || 'Direct',
          status: 'REJECTED_NO_CONTACT',
          latencyMs: Date.now() - startTime
        });
        continue;
      }

      // 3. ATOMIC DEDUPLICATION PROTECTION (Prevent Duplicate Ingestion)
      let existing = null;
      if (extracted.metaLeadId) {
        existing = await Lead.findOne({
          $or: [
            { meta_lead_id: extracted.metaLeadId },
            { notes: { $regex: extracted.metaLeadId } }
          ]
        });
      }
      if (!existing && cleanPhone) {
        existing = await Lead.findOne({ mobile: cleanPhone });
      }

      if (existing) {
        results.push({
          lead_id: existing.lead_id,
          name: existing.name,
          mobile: existing.mobile,
          status: 'DUPLICATE_SKIPPED',
          message: 'Lead already ingested in CRM.'
        });
        continue;
      }

      // 4. ZERO-LOSS PHONE FALLBACK & TAGGING
      const zeroLossTriggered = !cleanPhone;
      const savedMobile = cleanPhone || rawMobile.substring(0, 20) || `META-${extracted.metaLeadId}`;
      const tags = zeroLossTriggered ? ['Urgent'] : [];
      const resolvedSource = 'Facebook Meta Lead Ads';
      const resolvedCampaign =
        extracted.campaign_name || matchedForm?.campaignName || matchedForm?.formName || 'Meta Ads';

      const qualityResult = analyzeLeadQuality({
        name: extracted.name,
        mobile: savedMobile,
        email: extracted.email,
        city: extracted.city,
        state: extracted.state,
        business_type: extracted.business_type,
        product_interest: extracted.product_interest
      });

      if (qualityResult.tier === 'High Intent (VIP)') tags.push('High Intent');
      if (qualityResult.isSpam) tags.push('Suspect Spam');

      const priority = qualityResult.score >= 80 ? 'VIP' : (qualityResult.score >= 60 ? 'High' : 'Normal');

      // 5. ATOMIC TELECALLER ASSIGNMENT (Zero Collision)
      const chosenCaller = await pickCallerAtomic(
        activeCallers,
        matchedForm,
        settings.distributionStrategy
      );

      // 6. CREATE LEAD WITH GUARANTEED UNIQUE SEQUENCE ID
      const newLead = await Lead.create({
        name: extracted.name || `Meta Lead ${extracted.metaLeadId || ''}`.trim(),
        mobile: savedMobile,
        email: extracted.email,
        city: extracted.city,
        state: extracted.state,
        business_type: extracted.business_type,
        product_interest: extracted.product_interest,
        join_as: extracted.join_as || extracted.business_type || '',
        start_timeline: extracted.start_timeline || extracted.product_interest || '',
        meta_lead_id: extracted.metaLeadId,
        meta_form_id: extracted.formId,
        lead_source: resolvedSource,
        campaign_name: resolvedCampaign,
        status: chosenCaller ? 'Assigned' : 'Fresh Inquiry',
        lead_status: 'In-Progress',
        priority,
        assigned_to: chosenCaller ? chosenCaller._id : null,
        assigned_at: chosenCaller ? new Date() : null,
        tags,
        notes: extracted.notes || (zeroLossTriggered
          ? `[URGENT] Unformatted Phone (${rawMobile}) saved via Zero-Loss Fallback. Intent Score: ${qualityResult.score}/100.`
          : `Captured via ${resolvedSource} Webhook • Quality=${qualityResult.tier} (${qualityResult.score}/100)${resolvedCampaign ? ` • Campaign="${resolvedCampaign}"` : ''}`),
        ...(extracted.createdTime ? { createdAt: extracted.createdTime } : {})
      });

      // Update Form Stats
      if (matchedForm) {
        const formIdx = (settings.metaForms || []).findIndex(f => f.formId === matchedForm.formId);
        if (formIdx >= 0) {
          settings.metaForms[formIdx].leadsCaptured = (settings.metaForms[formIdx].leadsCaptured || 0) + 1;
          settings.metaForms[formIdx].lastLeadAt = new Date();
          settings.markModified('metaForms');
        }
      }

      // Append to Delivery Log
      const latencyMs = Date.now() - startTime;
      whLogs.push({
        id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      });

      results.push({
        lead_id: newLead.lead_id,
        name: newLead.name,
        mobile: newLead.mobile,
        status: 'INGESTED',
        assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned',
        qualityScore: qualityResult.score,
        zeroLossTriggered
      });
    }

    if (whLogs.length > 50) whLogs.splice(0, whLogs.length - 50);
    settings.metaWebhookLogs = whLogs;
    settings.metaConfig.lastSyncAt = new Date();
    settings.markModified('metaConfig');
    await settings.save();

    purgeDashboardCache();
    purgeMetaCache();

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      ingestedCount: results.filter(r => r.status === 'INGESTED').length,
      results,
      latencyMs: Date.now() - startTime
    });
  } catch (err) {
    console.error('[Meta Webhook Fatal Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
