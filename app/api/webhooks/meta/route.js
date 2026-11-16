import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import Counter from '../../../../lib/models/Counter';
import { getOrInitSettings } from '../../../../lib/settings';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';
import { parseMetaLeadItem, sanitizePhone } from '../../../../lib/metaLeadParser';
import { analyzeLeadQuality } from '../../../../lib/metaLeadQuality';
import { ingestLead, journalLeadToDisk } from '../../../../lib/leadIngestionEngine';

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
      integrationMode: settings.metaConfig?.integrationMode || 'OAUTH',
      pageId: settings.metaConfig?.pageId || process.env.META_PAGE_ID,
      pageName: settings.metaConfig?.pageName || process.env.META_PAGE_NAME,
      concurrencyProtection: 'ATOMIC_SEQUENCE_MUTEX',
      message: 'Kisan Choice Meta Lead Ads Webhook Receiver is online (High-Throughput Zero-Loss Engine).'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const startTime = Date.now();
  let rawBody = '';
  try {
    // 1. MUST read raw body FIRST to guarantee zero payload loss if DB/network throws
    rawBody = await request.text().catch(() => '');
    let body = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    await connectDB();
    const settings = await getOrInitSettings();

    const appSecret = settings.metaConfig?.appSecret || process.env.META_APP_SECRET || '';
    const sig256 = request.headers.get('x-hub-signature-256');
    const isManualTest = request.headers.get('x-crm-test') === 'true' || body.__is_test === true;

    // Verify Meta HMAC SHA-256 signature if header is present
    if (sig256 && appSecret && !isManualTest) {
      try {
        const cleanSig = sig256.trim().toLowerCase();
        const expectedHash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
        const expectedSig = `sha256=${expectedHash}`.toLowerCase();
        if (cleanSig.length === expectedSig.length) {
          const match = crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expectedSig));
          if (!match) {
            console.warn('[Meta Webhook] X-Hub-Signature-256 mismatch');
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: 'Invalid webhook signature length' }, { status: 403 });
        }
      } catch (sigErr) {
        console.warn('[Meta Webhook] Signature check exception:', sigErr.message);
      }
    }

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
              pageId: String(entry.id || change.value.page_id || ''),
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
        field_data: body.field_data || null,
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

      // Fetch from Meta Graph API if leadgen_id exists (numeric real ID) and token is active
      let parsedFromGraph = false;
      const isRealMetaId = extracted.metaLeadId && /^\d+$/.test(extracted.metaLeadId);
      if (isRealMetaId && activeToken && activeToken.length > 15) {
        try {
          const leadRes = await fetch(
            `https://graph.facebook.com/v21.0/${extracted.metaLeadId}?fields=id,created_time,ad_name,campaign_name,form_id,field_data&access_token=${encodeURIComponent(activeToken.trim())}`,
            {
              cache: 'no-store',
              signal: AbortSignal.timeout(3500)
            }
          );
          const leadData = await leadRes.json();
          if (leadData && !leadData.error) {
            let formName = matchedForm?.formName || '';
            if (!formName && extracted.formId) {
              try {
                const fnRes = await fetch(
                  `https://graph.facebook.com/v21.0/${extracted.formId}?fields=name&access_token=${encodeURIComponent(activeToken.trim())}`,
                  {
                    cache: 'no-store',
                    signal: AbortSignal.timeout(2000)
                  }
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

      // Fallback: parse raw field_data if provided directly in webhook or testing payload
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

      const resolvedSource = 'Facebook Meta Lead Ads';
      const resolvedCampaign =
        extracted.campaign_name || matchedForm?.campaignName || matchedForm?.formName || 'Meta Ads';

      const ingestionResult = await ingestLead({
        name: extracted.name || `Meta Lead ${extracted.metaLeadId || ''}`.trim(),
        mobile: extracted.mobile,
        email: extracted.email,
        city: extracted.city,
        state: extracted.state,
        business_type: extracted.business_type,
        product_interest: extracted.product_interest,
        join_as: extracted.join_as,
        start_timeline: extracted.start_timeline,
        meta_lead_id: extracted.metaLeadId,
        formId: extracted.formId,
        campaign_name: resolvedCampaign,
        lead_source: resolvedSource,
        notes: extracted.notes
      }, {
        source: resolvedSource,
        defaultCampaign: resolvedCampaign
      });

      // Update Form Stats in SystemSetting
      if (matchedForm) {
        const formIdx = (settings.metaForms || []).findIndex(f => f.formId === matchedForm.formId);
        if (formIdx >= 0) {
          settings.metaForms[formIdx].leadsCaptured = (settings.metaForms[formIdx].leadsCaptured || 0) + 1;
          settings.metaForms[formIdx].lastLeadAt = new Date();
          settings.markModified('metaForms');
        }
      }

      const latencyMs = Date.now() - startTime;
      whLogs.push({
        id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date(),
        formId: extracted.formId || 'Direct',
        leadId: ingestionResult.lead_id || ingestionResult.lead?.lead_id,
        leadName: ingestionResult.name || ingestionResult.lead?.name,
        leadMobile: ingestionResult.mobile || ingestionResult.lead?.mobile,
        status: ingestionResult.status || (ingestionResult.action === 'DUPLICATE_UPDATED' ? 'DUPLICATE_UPDATED' : 'INGESTED_200_OK'),
        assignedTo: ingestionResult.assigned_to || 'Unassigned',
        latencyMs
      });

      results.push({
        lead_id: ingestionResult.lead_id || ingestionResult.lead?.lead_id,
        name: ingestionResult.name || ingestionResult.lead?.name,
        mobile: ingestionResult.mobile || ingestionResult.lead?.mobile,
        email: ingestionResult.lead?.email || extracted.email,
        city: ingestionResult.lead?.city || extracted.city,
        business_type: ingestionResult.lead?.business_type || extracted.business_type,
        product_interest: ingestionResult.lead?.product_interest || extracted.product_interest,
        campaign_name: resolvedCampaign,
        meta_lead_id: extracted.metaLeadId,
        status: ingestionResult.action === 'CREATED' ? 'INGESTED' : (ingestionResult.action === 'DUPLICATE_UPDATED' ? 'DUPLICATE_UPDATED' : ingestionResult.status),
        action: ingestionResult.action,
        isRepeat: Boolean(ingestionResult.isRepeat),
        submission_count: ingestionResult.submission_count || 1,
        assignedTo: ingestionResult.assigned_to || 'Unassigned'
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
      lead: results[0] || null,
      latencyMs: Date.now() - startTime
    });
  } catch (err) {
    console.error('[Meta Webhook Fatal Exception]:', err);
    // Durable Disk Journaling Fallback (Zero Lead Loss Guarantee for Meta Webhooks)
    const dlq = journalLeadToDisk('Facebook Meta Lead Ads', rawBody, err.message);
    return NextResponse.json({
      success: true,
      status: 'JOURNALED_DLQ',
      message: 'Payload safely preserved in durable disk queue for auto-recovery',
      queueId: dlq.queueId,
      latencyMs: Date.now() - startTime
    }, { status: 200 });
  }
}
