import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { getOrInitSettings } from '../../../../lib/settings';
import { ingestLead, journalLeadToDisk } from '../../../../lib/leadIngestionEngine';
import { purgeDashboardCache } from '../../../../lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    const cfg = settings?.websiteWebhookConfig || {};

    return NextResponse.json({
      status: 'active',
      endpoint: '/api/webhooks/leads',
      provider: 'Universal Website & Landing Page Lead Ingestion Webhook',
      concurrencyEngine: 'Distributed In-Memory Idempotency Mutex Lock',
      deduplicationStrategy: 'Sliding-Window Multi-Lead Merge & Repeat Attribution',
      zeroLossBuffer: 'Durable Disk Recovery Journal (DLQ)',
      enabled: cfg.enabled !== false,
      leadsCaptured: cfg.leadsCaptured || 0,
      lastLeadAt: cfg.lastLeadAt || null,
      supportedSources: ['Website Form', 'Landing Page', 'WordPress', 'Webflow', 'Shopify', 'Google Ads', 'IndiaMART', 'Justdial', 'Zapier'],
      samplePayload: {
        name: 'Prospect Name',
        mobile: '9876543210',
        email: 'prospect@example.com',
        city: 'Indore',
        state: 'Madhya Pradesh',
        business_type: 'Distributor',
        product_interest: 'Mustard Oil (15L Tin)',
        lead_source: 'Landing Page',
        campaign_name: 'Diwali Promotion'
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const startTime = Date.now();
  let rawBody = '';
  try {
    rawBody = await request.text().catch(() => '');
    let body = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // Optional secret token verification
    const secretHeader = request.headers.get('x-lead-secret') || request.headers.get('x-api-key') || request.headers.get('x-webhook-secret');
    if (secretHeader) {
      const settings = await getOrInitSettings().catch(() => null);
      const expectedToken = settings?.websiteWebhookConfig?.secretToken || process.env.LEAD_WEBHOOK_SECRET || '';
      if (expectedToken && secretHeader !== expectedToken) {
        return NextResponse.json({ error: 'Unauthorized: Invalid lead webhook secret' }, { status: 401 });
      }
    }

    // Support single lead or array of leads concurrently
    const items = Array.isArray(body)
      ? body
      : (Array.isArray(body.leads) ? body.leads : (Array.isArray(body.data) ? body.data : [body]));

    const results = await Promise.all(
      items.map(async (item) => {
        const resolvedSource = item.lead_source || item.source || item.utm_source || item.platform || 'Website Landing Page';
        const resolvedCampaign = item.campaign_name || item.campaign || item.utm_campaign || 'Website Inflow';

        const ingestionResult = await ingestLead(item, {
          source: resolvedSource,
          defaultCampaign: resolvedCampaign
        });

        return {
          lead_id: ingestionResult.lead_id || ingestionResult.lead?.lead_id || null,
          name: ingestionResult.name || ingestionResult.lead?.name || item.name,
          mobile: ingestionResult.mobile || ingestionResult.lead?.mobile || item.mobile,
          assigned_to: ingestionResult.assigned_to || 'Unassigned',
          routingMethod: ingestionResult.routingMethod || 'IDEMPOTENT_MUTEX',
          status: ingestionResult.status || (ingestionResult.action === 'DUPLICATE_UPDATED' ? 'DUPLICATE_UPDATED' : 'INGESTED_200_OK'),
          action: ingestionResult.action,
          isRepeat: Boolean(ingestionResult.isRepeat),
          submission_count: ingestionResult.submission_count || 1,
          message: ingestionResult.isRepeat
            ? 'Existing lead re-submission recorded in 360° timeline; quality score bumped.'
            : 'Lead captured and routed with zero data loss.'
        };
      })
    );

    purgeDashboardCache();

    return NextResponse.json({
      success: true,
      count: results.length,
      latencyMs: Date.now() - startTime,
      results
    }, { status: 201 });

  } catch (error) {
    console.error('[Universal Webhook Fatal Exception]:', error);
    // Durable Disk Journaling Fallback (Guarantees zero lead loss even during crash)
    const dlq = journalLeadToDisk('Website Landing Page', rawBody, error.message);
    return NextResponse.json({
      success: true,
      status: 'JOURNALED_DLQ',
      message: 'Payload preserved in durable disk queue for auto-recovery',
      queueId: dlq.queueId,
      latencyMs: Date.now() - startTime
    }, { status: 202 });
  }
}
