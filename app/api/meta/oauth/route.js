import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import SystemSetting from '../../../../lib/models/SystemSetting';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';
import { parseMetaLeadItem } from '../../../../lib/metaLeadParser';

export const dynamic = 'force-dynamic';

const DEFAULT_APP_ID = process.env.META_APP_ID || '1007200718473332';
const DEFAULT_APP_SECRET = process.env.META_APP_SECRET || '3417199d662e081419c470b832d1a49a';
const DEFAULT_PAGE_ID = process.env.META_PAGE_ID || '933429549844450';
const DEFAULT_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || 'act_1796071777698019';
const DEFAULT_PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const DEFAULT_USER_TOKEN = process.env.META_USER_ACCESS_TOKEN || '';

export async function GET(request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const action = searchParams.get('action') || 'info';
    let redirectUri = `${origin}/api/meta/oauth/callback`;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      redirectUri = 'https://caller-website-monitoring.vercel.app/api/meta/oauth/callback';
    }

    await connectDB();
    const settings = await SystemSetting.findOne({ key: 'global' }).lean();

    const configId = searchParams.get('config_id') || process.env.META_CONFIG_ID || settings?.metaConfig?.configId || '2583186895497299';
    const responseType = 'code';
    let authUrl;
    if (configId) {
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${DEFAULT_APP_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&config_id=${encodeURIComponent(configId)}&response_type=${responseType}&state=kisan_meta_oauth_${Date.now()}`;
    } else {
      const scopes = 'public_profile,pages_show_list,pages_read_engagement,pages_manage_ads,leads_retrieval';
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${DEFAULT_APP_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${encodeURIComponent(scopes)}&response_type=${responseType}&state=kisan_meta_oauth_${Date.now()}`;
    }

    if (action === 'popup' || action === 'authorize') {
      return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({
      authUrl,
      appId: DEFAULT_APP_ID,
      configId: configId || null,
      pageId: settings?.metaConfig?.pageId || DEFAULT_PAGE_ID,
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
    const rawInputToken = (body.accessToken || DEFAULT_USER_TOKEN || DEFAULT_PAGE_TOKEN || '').trim();

    if (!rawInputToken || rawInputToken.length < 15) {
      return NextResponse.json({ error: 'Valid Meta Access Token is required.' }, { status: 400 });
    }

    let userOrInputToken = rawInputToken;
    const appSecret = process.env.META_APP_SECRET || '';
    if (appSecret) {
      try {
        const llRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
            DEFAULT_APP_ID
          )}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(rawInputToken)}`,
          { cache: 'no-store' }
        );
        const llData = await llRes.json();
        if (llData?.access_token) {
          userOrInputToken = llData.access_token;
        }
      } catch {}
    }

    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,accounts{id,name,access_token,category,tasks}&access_token=${encodeURIComponent(userOrInputToken)}`,
      { cache: 'no-store' }
    );
    const meData = await meRes.json();
    if (meData.error) {
      return NextResponse.json({ error: meData.error.message }, { status: 400 });
    }

    let targetPageId = DEFAULT_PAGE_ID;
    let targetPageName = 'Kisan Choice';
    let targetPageToken = userOrInputToken;

    if (meData?.accounts?.data?.length > 0) {
      const match = meData.accounts.data.find(p => p.id === DEFAULT_PAGE_ID) || meData.accounts.data[0];
      targetPageId = match.id;
      targetPageName = match.name;
      targetPageToken = match.access_token || userOrInputToken;
    } else if (meData?.id && meData?.name) {
      targetPageId = meData.id;
      targetPageName = meData.name;
    }

    let webhookSubscribed = false;
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${targetPageId}/subscribed_apps?access_token=${encodeURIComponent(targetPageToken)}`,
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

    let realForms = [];
    try {
      const formsRes = await fetch(
        `https://graph.facebook.com/v21.0/${targetPageId}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=50&access_token=${encodeURIComponent(targetPageToken)}`,
        { cache: 'no-store' }
      );
      const formsData = await formsRes.json();
      if (Array.isArray(formsData?.data)) {
        realForms = formsData.data.map(f => ({
          formId: String(f.id),
          formName: f.name,
          status: f.status,
          pageName: targetPageName,
          platform: 'Facebook & Instagram Lead Ads',
          campaignName: f.name || '',
          distributionRule: 'ROUND_ROBIN',
          assignedTeam: 'North Region Sales',
          assignedCallerName: 'Auto Round-Robin',
          active: f.status === 'ACTIVE',
          leadsCaptured: Number(f.leads_count) || 0,
          lastSyncAt: new Date()
        }));
      }
    } catch (e) {
      console.warn('Lead forms fetch warning:', e.message);
    }

    let realCampaigns = [];
    try {
      const campRes = await fetch(
        `https://graph.facebook.com/v21.0/${DEFAULT_AD_ACCOUNT_ID}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,insights{impressions,clicks,spend}&limit=50&access_token=${encodeURIComponent(userOrInputToken)}`,
        { cache: 'no-store' }
      );
      const campData = await campRes.json();
      if (Array.isArray(campData?.data)) {
        realCampaigns = campData.data.map(c => {
          const ins = Array.isArray(c.insights?.data) && c.insights.data[0] ? c.insights.data[0] : {};
          return {
            campaignId: String(c.id),
            name: c.name,
            status: c.status || 'PAUSED',
            objective: c.objective || 'OUTCOME_LEADS',
            dailyBudget: c.daily_budget ? Math.round(Number(c.daily_budget) / 100) : 0,
            spend: ins.spend ? Number(ins.spend) : 0,
            impressions: ins.impressions ? Number(ins.impressions) : 0,
            clicks: ins.clicks ? Number(ins.clicks) : 0,
            leadsCount: 0,
            assignedTeam: 'North Region Sales',
            distributionRule: 'ROUND_ROBIN',
            linkedFormId: realForms[0]?.formId || '',
            linkedFormName: realForms[0]?.formName || '',
            lastSyncAt: new Date()
          };
        });
      }
    } catch (e) {
      console.warn('Campaigns fetch warning:', e.message);
    }

    let ingestedCount = 0;
    const activeCallers = await User.find({
      role: 'telecaller',
      status: { $in: ['active', 'ACTIVE'] }
    }).sort({ _id: 1 });

    const formsToFetch = realForms.filter(f => (f.leadsCaptured || 0) > 0);
    let cIdx = 0;
    for (const f of formsToFetch) {
      try {
        const leadsRes = await fetch(
          `https://graph.facebook.com/v21.0/${f.formId}/leads?fields=id,created_time,ad_name,campaign_name,form_id,field_data&limit=25&access_token=${encodeURIComponent(targetPageToken)}`,
          { cache: 'no-store' }
        );
        const leadsData = await leadsRes.json();
        if (Array.isArray(leadsData?.data)) {
          for (const item of leadsData.data) {
            const parsed = parseMetaLeadItem(item, f.formName);
            if (!parsed.mobile || parsed.mobile.length !== 10) continue;

            const existing = await Lead.findOne({
              $or: [
                { mobile: parsed.mobile },
                ...(parsed.metaLeadId ? [{ notes: { $regex: parsed.metaLeadId } }] : [])
              ]
            });
            if (!existing) {
              const assignedCaller = activeCallers.length > 0 ? activeCallers[cIdx % activeCallers.length] : null;
              await Lead.create({
                name: parsed.name || `Meta Lead ${parsed.metaLeadId}`,
                mobile: parsed.mobile,
                email: parsed.email,
                city: parsed.city,
                state: parsed.state,
                business_type: parsed.businessType,
                product_interest: parsed.productInterest,
                lead_source: 'Facebook Meta Lead Ads',
                campaign_name: parsed.campaignName || f.campaignName || f.formName || '',
                status: assignedCaller ? 'Assigned' : 'Fresh Lead',
                assigned_to: assignedCaller ? assignedCaller._id : null,
                assigned_at: assignedCaller ? new Date() : null,
                notes: parsed.notes,
                ...(parsed.createdTime ? { createdAt: parsed.createdTime } : {})
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

    let settings = await SystemSetting.findOne({ key: 'global' });
    if (!settings) settings = new SystemSetting({ key: 'global' });

    settings.metaConfig = {
      connected: true,
      appId: DEFAULT_APP_ID,
      pageId: targetPageId,
      pageName: targetPageName,
      adAccountId: DEFAULT_AD_ACCOUNT_ID,
      accessToken: targetPageToken,
      userAccessToken: userOrInputToken,
      verifyToken: process.env.META_VERIFY_TOKEN || settings.metaConfig?.verifyToken || 'KISAN_META_WEBHOOK_VERIFY',
      webhookSubscribed: webhookSubscribed || true,
      autoSyncEnabled: true,
      zeroLossFallback: true,
      connectedAt: new Date(),
      lastSyncAt: new Date()
    };

    if (realForms.length > 0) {
      settings.metaForms = realForms;
      settings.markModified('metaForms');
    }
    if (realCampaigns.length > 0) {
      settings.metaCampaigns = realCampaigns;
      settings.markModified('metaCampaigns');
    }

    settings.connectedIntegrations = [];
    settings.markModified('connectedIntegrations');
    await settings.save();

    purgeDashboardCache();
    purgeMetaCache();

    return NextResponse.json({
      success: true,
      pageId: targetPageId,
      pageName: targetPageName,
      userName: meData?.name || targetPageName,
      webhookSubscribed,
      formsSynced: realForms.length,
      campaignsSynced: realCampaigns.length,
      realLeadsIngested: ingestedCount,
      message: `Connected Facebook Page "${targetPageName}" via Meta Graph API v21.0. Synced ${realForms.length} forms, ${realCampaigns.length} campaigns, and ${ingestedCount} new leads.`
    });
  } catch (error) {
    console.error('OAuth POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
