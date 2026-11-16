import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import SystemSetting from '../../../../lib/models/SystemSetting';
import { getOrInitSettings } from '../../../../lib/settings';
import { syncLeadToNeoDove } from '../../../../lib/neodoveSync';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';
import { requireAdminApi } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function isAuthorized(request, settings) {
  const admin = await requireAdminApi(request);
  if (admin) return true;
  const expectedSecret = settings?.neodoveConfig?.secretToken || process.env.NEODOVE_SECRET_TOKEN || '';
  const apiKey = request.headers.get('x-api-key') || request.headers.get('x-admin-key') || request.headers.get('x-neodove-secret');
  if (expectedSecret && apiKey && apiKey === expectedSecret) {
    return true;
  }
  return false;
}

export async function GET(request) {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    if (!(await isAuthorized(request, settings))) {
      return NextResponse.json({ error: 'Unauthorized: Administrator authentication required' }, { status: 401 });
    }
    const neodove = settings.neodoveConfig || {};

    const [inboundCount, syncedOutCount] = await Promise.all([
      Lead.countDocuments({ lead_source: 'NeoDove' }),
      Lead.countDocuments({ neodove_synced: true })
    ]);

    return NextResponse.json({
      status: neodove.enabled ? 'ACTIVE' : 'CONFIGURED',
      config: {
        enabled: neodove.enabled || false,
        webhookUrl: neodove.webhookUrl || '',
        apiKeyConfigured: Boolean(neodove.apiKey),
        secretToken: neodove.secretToken || '',
        autoSync: neodove.autoSync || false,
        syncLeadStages: neodove.syncLeadStages !== false,
        lastInboundAt: neodove.lastInboundAt || null,
        lastOutboundAt: neodove.lastOutboundAt || null,
        leadsCaptured: inboundCount,
        leadsSyncedOut: syncedOutCount
      },
      inboundWebhookEndpoint: '/api/webhooks/neodove',
      universalWebhookEndpoint: '/api/webhooks/leads'
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    if (!(await isAuthorized(request, settings))) {
      return NextResponse.json({ error: 'Unauthorized: Administrator authentication required' }, { status: 401 });
    }
    const body = await request.json();

    settings.neodoveConfig = {
      ...(settings.neodoveConfig?.toObject?.() || settings.neodoveConfig || {}),
      ...body
    };

    await settings.save();
    purgeDashboardCache();
    purgeMetaCache();

    return NextResponse.json({
      success: true,
      message: 'NeoDove integration configuration saved successfully',
      config: settings.neodoveConfig
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    if (!(await isAuthorized(request, settings))) {
      return NextResponse.json({ error: 'Unauthorized: Administrator authentication required' }, { status: 401 });
    }
    const body = await request.json();
    const { leadId } = body;

    let leadToSync = null;
    if (leadId) {
      leadToSync = await Lead.findById(leadId).populate('assigned_to', 'name');
    } else {
      // Pick latest real lead if available
      leadToSync = await Lead.findOne({ lead_source: { $ne: 'NeoDove' } }).sort({ createdAt: -1 }).populate('assigned_to', 'name');
    }

    if (!leadToSync) {
      return NextResponse.json({ error: 'No lead available to sync. Provide a valid leadId.' }, { status: 404 });
    }

    const syncResult = await syncLeadToNeoDove(leadToSync, settings);
    return NextResponse.json({
      success: syncResult.success || syncResult.skipped,
      lead_id: leadToSync.lead_id,
      syncResult
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
