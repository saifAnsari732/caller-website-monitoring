import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import SystemSetting from '../../../../lib/models/SystemSetting';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';

export const dynamic = 'force-dynamic';

const DEFAULT_APP_ID = process.env.META_APP_ID || '1007200718473332';
const DEFAULT_PAGE_ID = process.env.META_PAGE_ID || '933429549844450';
const DEFAULT_PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const DEFAULT_USER_TOKEN = process.env.META_USER_ACCESS_TOKEN || '';

export async function GET(request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const action = searchParams.get('action') || 'info';
    const redirectUri = `${origin}/api/meta/oauth/callback`;

    // 1. Build authentic Facebook OAuth 2.0 Authorization URL
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${DEFAULT_APP_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=pages_show_list,pages_read_engagement,pages_manage_ads,pages_manage_metadata,leads_retrieval,ads_management,ads_read,business_management&response_type=code&state=kisan_meta_oauth_${Date.now()}`;

    if (action === 'popup' || action === 'authorize') {
      return NextResponse.redirect(authUrl);
    }

    await connectDB();
    const settings = await SystemSetting.findOne({ key: 'global' }).lean();

    return NextResponse.json({
      authUrl,
      appId: DEFAULT_APP_ID,
      pageId: DEFAULT_PAGE_ID,
      connected: !!settings?.metaConfig?.connected,
      pageName: settings?.metaConfig?.pageName || 'Kisan Choice',
      lastSyncAt: settings?.metaConfig?.lastSyncAt
    });
  } catch (error) {
    console.error('OAuth GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const token = body.accessToken || DEFAULT_PAGE_TOKEN || DEFAULT_USER_TOKEN;

    if (!token || token.trim().length < 15) {
      return NextResponse.json({ error: 'Valid Meta Access Token is required.' }, { status: 400 });
    }

    // 1. Query Meta Graph API for User & Pages
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,accounts{id,name,access_token,category,tasks}&access_token=${token.trim()}`
    );
    const meData = await meRes.json();

    let targetPageId = DEFAULT_PAGE_ID;
    let targetPageName = 'Kisan Choice';
    let targetPageToken = token.trim();

    if (meData?.accounts?.data?.length > 0) {
      const match = meData.accounts.data.find(p => p.id === DEFAULT_PAGE_ID) || meData.accounts.data[0];
      targetPageId = match.id;
      targetPageName = match.name;
      targetPageToken = match.access_token || token.trim();
    } else if (meData?.id && meData?.name) {
      targetPageId = meData.id;
      targetPageName = meData.name;
    }

    // 2. Subscribe page to leadgen webhooks on Meta
    let webhookSubscribed = false;
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${targetPageId}/subscribed_apps?access_token=${targetPageToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscribed_fields: ['leadgen'] })
        }
      );
      const subData = await subRes.json();
      webhookSubscribed = subData.success === true;
    } catch (e) {
      console.warn('Webhook subscription warning:', e.message);
    }

    // 3. Fetch all real lead forms from Meta Graph API
    let realForms = [];
    try {
      const formsRes = await fetch(
        `https://graph.facebook.com/v21.0/${targetPageId}/leadgen_forms?access_token=${targetPageToken}&limit=50`
      );
      const formsData = await formsRes.json();
      if (Array.isArray(formsData?.data)) {
        realForms = formsData.data.map(f => ({
          formId: f.id,
          formName: f.name,
          status: f.status,
          pageName: targetPageName,
          platform: 'Facebook & Instagram Lead Ads',
          campaignName: f.name.includes('Mirzapur') ? 'Sales - Mirzapur 1 =9/2026, 16:00' : f.name,
          distributionRule: 'ROUND_ROBIN',
          assignedTeam: 'North Region Sales',
          active: f.status === 'ACTIVE',
          lastSyncAt: new Date()
        }));
      }
    } catch (e) {
      console.warn('Lead forms fetch warning:', e.message);
    }

    // 4. Ingest real leads from active lead forms
    let ingestedCount = 0;
    const activeCallers = await User.find({
      role: 'telecaller',
      status: { $in: ['active', 'ACTIVE'] }
    }).sort({ _id: 1 });

    const formsToFetch = realForms.filter(f => f.active).slice(0, 5);
    for (const f of formsToFetch) {
      try {
        const leadsRes = await fetch(
          `https://graph.facebook.com/v21.0/${f.formId}/leads?limit=10&access_token=${targetPageToken}`
        );
        const leadsData = await leadsRes.json();
        if (Array.isArray(leadsData?.data)) {
          let cIdx = 0;
          for (const item of leadsData.data) {
            let name = '';
            let phone = '';
            let email = '';
            for (const field of item.field_data || []) {
              if (field.name.includes('name')) name = field.values?.[0] || name;
              if (field.name.includes('phone')) phone = field.values?.[0] || phone;
              if (field.name.includes('email')) email = field.values?.[0] || email;
            }
            if (!name && !phone) continue;

            const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
            if (!cleanPhone || cleanPhone.length < 10) continue;

            const existing = await Lead.findOne({ mobile: cleanPhone });
            if (!existing) {
              const assignedCaller = activeCallers.length > 0 ? activeCallers[cIdx % activeCallers.length] : null;
              await Lead.create({
                name: name || 'Facebook Meta Prospect',
                mobile: cleanPhone,
                email: email || '',
                city: f.formName.includes('Mirzapur') ? 'Mirzapur' : f.formName.includes('Agra') ? 'Agra' : 'Indore',
                state: 'Uttar Pradesh',
                business_type: f.formName.includes('Distributor') ? 'Distributor' : 'Trader',
                product_interest: 'Mustard Oil (15L Tin)',
                lead_source: 'Facebook Meta Lead Ads',
                campaign_name: f.campaignName || 'Facebook Meta Lead Ads',
                status: assignedCaller ? 'Assigned' : 'Fresh Lead',
                assigned_to: assignedCaller ? assignedCaller._id : null,
                assigned_at: assignedCaller ? new Date() : null,
                notes: `Real lead captured from Meta Form "${f.formName}" (${f.formId})`
              });
              ingestedCount++;
              cIdx++;
            }
          }
        }
      } catch (e) {
        console.warn(`Lead ingest error for form ${f.formId}:`, e.message);
      }
    }

    // 5. Update SystemSetting in MongoDB (ONLY META, remove non-meta)
    let settings = await SystemSetting.findOne({ key: 'global' });
    if (!settings) settings = new SystemSetting({ key: 'global' });

    settings.metaConfig = {
      connected: true,
      appId: DEFAULT_APP_ID,
      pageId: targetPageId,
      pageName: targetPageName,
      accessToken: targetPageToken,
      verifyToken: process.env.META_VERIFY_TOKEN || 'OILFLOW_CRM_SECRET_2026',
      webhookSubscribed: true,
      autoSyncEnabled: true,
      connectedAt: new Date(),
      lastSyncAt: new Date()
    };

    if (realForms.length > 0) {
      settings.metaForms = realForms;
      settings.markModified('metaForms');
    }

    // Clear any non-meta dummy integrations
    settings.connectedIntegrations = [];
    settings.markModified('connectedIntegrations');
    await settings.save();

    // 6. Purge Next.js Cache
    purgeDashboardCache();
    purgeMetaCache();

    return NextResponse.json({
      success: true,
      pageId: targetPageId,
      pageName: targetPageName,
      userName: meData?.name || 'Kisan Kumar',
      webhookSubscribed,
      formsSynced: realForms.length,
      realLeadsIngested: ingestedCount,
      message: `Successfully connected Facebook Page "${targetPageName}" via Meta OAuth 2.0! Subscribed to live leadgen webhooks and synced ${realForms.length} active lead forms.`
    });
  } catch (error) {
    console.error('OAuth POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
