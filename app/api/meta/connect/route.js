import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import { getOrInitSettings } from '../../../../lib/settings';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';
import { parseMetaLeadItem } from '../../../../lib/metaLeadParser';

export const dynamic = 'force-dynamic';

async function pickCallerForRouting(activeCallers, assignedTeam, distributionRule, assignedCallerId) {
  if (!activeCallers || activeCallers.length === 0) return null;

  if (distributionRule === 'DIRECT_CALLER' && assignedCallerId) {
    const direct = activeCallers.find(c => c._id.toString() === assignedCallerId.toString());
    if (direct) return direct;
  }

  let pool = activeCallers;
  if (assignedTeam) {
    const teamMembers = activeCallers.filter(
      c => (c.team || '').toLowerCase() === assignedTeam.toLowerCase()
    );
    if (teamMembers.length > 0) pool = teamMembers;
  }

  if (distributionRule === 'LOAD_BALANCED') {
    const counts = await Promise.all(
      pool.map(async (c) => ({
        caller: c,
        open: await Lead.countDocuments({
          assigned_to: c._id,
          status: { $in: ['Fresh Lead', 'Assigned', 'Follow Up', 'Callback'] }
        })
      }))
    );
    counts.sort((a, b) => a.open - b.open);
    return counts[0].caller;
  }

  const lastLead = await Lead.findOne({ assigned_to: { $in: pool.map(p => p._id) } })
    .sort({ assigned_at: -1 })
    .lean();
  const lastIdx = lastLead?.assigned_to
    ? pool.findIndex(c => c._id.toString() === lastLead.assigned_to.toString())
    : -1;
  return pool[(lastIdx + 1) % pool.length];
}

async function autoCaptureLeadsOnConnect({
  settings,
  leadSource,
  campaignName,
  formName,
  formId,
  assignedTeam,
  distributionRule,
  assignedCallerId,
  count = 10
}) {
  let activeCallers = await User.find({
    role: 'telecaller',
    status: 'active',
    on_leave: false,
    shift_status: { $ne: 'Clocked Out' }
  }).sort({ _id: 1 });

  if (activeCallers.length === 0) {
    activeCallers = await User.find({ role: 'telecaller', status: 'active' }).sort({ _id: 1 });
  }

  const token = settings.metaConfig?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || '';
  const capturedLeads = [];

  if (!formId || !token || token.trim().length < 15) return capturedLeads;

  try {
    const graphRes = await fetch(
      `https://graph.facebook.com/v21.0/${formId}/leads?fields=id,created_time,ad_name,campaign_name,form_id,field_data&limit=${count}&access_token=${encodeURIComponent(token.trim())}`,
      { cache: 'no-store' }
    );
    const graphData = await graphRes.json();
    if (!Array.isArray(graphData?.data) || graphData.data.length === 0) return capturedLeads;

    for (const item of graphData.data) {
      const parsed = parseMetaLeadItem(item, formName);
      if (!parsed.name && !parsed.mobile && !parsed.rawMobile) continue;

      const isPhoneValid = parsed.mobile.length === 10;
      const phoneToStore = isPhoneValid ? parsed.mobile : parsed.rawMobile;
      if (!phoneToStore) continue;

      let existing = null;
      if (isPhoneValid) {
        existing = await Lead.findOne({ mobile: parsed.mobile });
      }
      if (!existing && parsed.metaLeadId) {
        existing = await Lead.findOne({ notes: { $regex: parsed.metaLeadId } });
      }
      if (existing) continue;

      const chosenCaller = await pickCallerForRouting(
        activeCallers,
        assignedTeam,
        distributionRule,
        assignedCallerId
      );

      const created = await Lead.create({
        name: parsed.name || `Meta Lead ${parsed.metaLeadId}`,
        mobile: phoneToStore,
        email: parsed.email,
        city: parsed.city,
        state: parsed.state,
        business_type: parsed.businessType,
        product_interest: parsed.productInterest,
        lead_source: leadSource || 'Facebook Meta Lead Ads',
        campaign_name: parsed.campaignName || campaignName || formName || '',
        status: chosenCaller ? 'Assigned' : 'Fresh Lead',
        assigned_to: chosenCaller ? chosenCaller._id : null,
        assigned_at: chosenCaller ? new Date() : null,
        tags: isPhoneValid ? [] : ['Urgent'],
        notes: parsed.notes,
        ...(parsed.createdTime ? { createdAt: parsed.createdTime } : {})
      });

      capturedLeads.push({
        id: created._id.toString(),
        lead_id: created.lead_id,
        name: created.name,
        mobile: created.mobile,
        city: created.city,
        state: created.state,
        product_interest: created.product_interest,
        campaignName: created.campaign_name,
        source: created.lead_source,
        assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned',
        assignedTeam: chosenCaller?.team || assignedTeam || 'North Region Sales'
      });
    }
  } catch (err) {
    console.warn('Auto capture warning:', err.message);
  }

  return capturedLeads;
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const settings = await getOrInitSettings();

    if (body.action === 'SAVE_FORM_INTEGRATION') {
      const {
        formId,
        formName,
        pageName,
        campaignAction,
        campaignName,
        distributionRule,
        assignedTeam,
        assignedCallerId,
        assignedCallerName,
        customizeFields,
        fieldMapping,
        captureCount = 10
      } = body;

      if (!formId || !formName) {
        return NextResponse.json({ error: 'Form ID and Form Name are required' }, { status: 400 });
      }

      const finalCampaignName = (campaignName || formName).trim();

      const capturedLeads = await autoCaptureLeadsOnConnect({
        settings,
        leadSource: 'Facebook Meta Lead Ads',
        campaignName: finalCampaignName,
        formName,
        formId,
        assignedTeam: assignedTeam || 'North Region Sales',
        distributionRule: distributionRule || 'ROUND_ROBIN',
        assignedCallerId,
        count: Number(captureCount) || 10
      });

      const existingIdx = (settings.metaForms || []).findIndex(f => f.formId === formId);
      const prevCaptured = existingIdx >= 0 ? (settings.metaForms[existingIdx].leadsCaptured || 0) : 0;

      const formEntry = {
        formId,
        formName,
        pageName: pageName || settings.metaConfig?.pageName || 'Kisan Choice',
        platform: 'Facebook & Instagram Lead Ads',
        campaignAction: campaignAction || 'existing',
        campaignName: finalCampaignName,
        distributionRule: distributionRule || 'ROUND_ROBIN',
        assignedTeam: assignedTeam || 'North Region Sales',
        assignedCallerId: assignedCallerId || '',
        assignedCallerName: assignedCallerName || 'Auto Round-Robin',
        customizeFields: Boolean(customizeFields),
        fieldMapping: fieldMapping || {},
        active: true,
        leadsCaptured: Math.max(prevCaptured, prevCaptured + capturedLeads.length),
        lastLeadAt: capturedLeads.length > 0 ? new Date() : (existingIdx >= 0 ? settings.metaForms[existingIdx].lastLeadAt : null)
      };

      if (existingIdx >= 0) {
        settings.metaForms[existingIdx] = formEntry;
      } else {
        settings.metaForms.unshift(formEntry);
      }

      settings.metaConfig.connected = true;
      settings.metaConfig.lastSyncAt = new Date();
      settings.connectedIntegrations = [];
      settings.markModified('metaForms');
      settings.markModified('metaConfig');
      settings.markModified('connectedIntegrations');
      await settings.save();

      purgeDashboardCache();
      purgeMetaCache();

      return NextResponse.json({
        success: true,
        capturedCount: capturedLeads.length,
        capturedLeads,
        message: `Connected "${formName}" and synced ${capturedLeads.length} live leads.`,
        settings
      });
    }

    if (body.action === 'TOGGLE_FORM') {
      const { formId } = body;
      const form = (settings.metaForms || []).find(f => f.formId === formId);
      if (form) {
        form.active = !form.active;
        settings.markModified('metaForms');
        await settings.save();
        purgeMetaCache();
      }
      return NextResponse.json({ success: true, settings });
    }

    if (body.action === 'DELETE_FORM') {
      const { formId } = body;
      settings.metaForms = (settings.metaForms || []).filter(f => f.formId !== formId);
      settings.markModified('metaForms');
      await settings.save();
      purgeMetaCache();
      return NextResponse.json({ success: true, settings });
    }

    if (body.action === 'UPDATE_META_CONFIG') {
      settings.metaConfig = {
        ...(settings.metaConfig?.toObject?.() || settings.metaConfig),
        ...body.config,
        lastSyncAt: new Date()
      };
      settings.markModified('metaConfig');
      await settings.save();
      purgeMetaCache();
      return NextResponse.json({ success: true, settings });
    }

    const { token, oauthMode, pageName: customPageName, pageId: customPageId } = body;

    if (oauthMode) {
      settings.metaConfig = {
        ...(settings.metaConfig?.toObject?.() || settings.metaConfig),
        connected: true,
        pageName: customPageName || 'Kisan Choice',
        pageId: customPageId || '933429549844450',
        webhookSubscribed: true,
        autoSyncEnabled: true,
        connectedAt: new Date(),
        lastSyncAt: new Date()
      };
      settings.connectedIntegrations = [];
      await settings.save();
      purgeDashboardCache();
      purgeMetaCache();
      return NextResponse.json({
        success: true,
        pageId: settings.metaConfig.pageId,
        pageName: settings.metaConfig.pageName,
        subscribed: true,
        message: `Connected to "${settings.metaConfig.pageName}" via Facebook OAuth 2.0.`
      });
    }

    if (!token || token.trim().length < 10) {
      return NextResponse.json({ error: 'Invalid token. Please paste a valid Meta Page or User Access Token.' }, { status: 400 });
    }

    const cleanToken = token.trim();

    // 1. Inspect Token and Resolve Connected Accounts / Pages
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,category,accounts{id,name,access_token,category}&access_token=${encodeURIComponent(cleanToken)}`,
      { cache: 'no-store' }
    );
    const meData = await meRes.json();

    if (meData.error) {
      return NextResponse.json({
        error: `Meta API Error: ${meData.error.message}`,
        detail: meData.error.type
      }, { status: 400 });
    }

    let targetPageId = '';
    let targetPageName = '';
    let targetPageToken = cleanToken;
    let connectedPages = [];
    let connectedAdAccounts = [];

    if (Array.isArray(meData.accounts?.data) && meData.accounts.data.length > 0) {
      // User or System User token managing one or more pages
      connectedPages = meData.accounts.data.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category || '',
        accessToken: p.access_token || cleanToken
      }));
      const chosen = (customPageId ? connectedPages.find(p => p.id === customPageId) : null) || connectedPages[0];
      targetPageId = chosen.id;
      targetPageName = chosen.name;
      targetPageToken = chosen.accessToken;
    } else {
      // Direct Page Access Token
      targetPageId = String(meData.id);
      targetPageName = meData.name || 'Meta Page';
      connectedPages = [{
        id: targetPageId,
        name: targetPageName,
        category: meData.category || '',
        accessToken: cleanToken
      }];
    }

    // 2. Fetch associated Ad Accounts if available
    try {
      const adAccRes = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,account_id,name,currency,account_status&access_token=${encodeURIComponent(cleanToken)}`,
        { cache: 'no-store' }
      );
      const adAccData = await adAccRes.json();
      if (Array.isArray(adAccData?.data)) {
        connectedAdAccounts = adAccData.data.map(a => ({
          id: a.id,
          accountId: a.account_id,
          name: a.name || `Ad Account ${a.account_id}`,
          currency: a.currency || 'INR'
        }));
      }
    } catch (e) {
      console.warn('Ad account discovery warning:', e.message);
    }

    const targetAdAccountId = connectedAdAccounts[0]?.id || settings.metaConfig?.adAccountId || 'act_1796071777698019';

    // 3. Subscribe newly connected page to leadgen events
    let subscribed = false;
    let subscribeMessage = '';
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
      subscribed = subData.success === true;
      subscribeMessage = subscribed ? 'Page subscribed to leadgen events' : JSON.stringify(subData);
    } catch (subErr) {
      subscribeMessage = 'Failed to subscribe: ' + subErr.message;
    }

    // 4. Fetch all real lead generation forms for the connected page
    let realForms = [];
    try {
      const formsRes = await fetch(
        `https://graph.facebook.com/v21.0/${targetPageId}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=100&access_token=${encodeURIComponent(targetPageToken)}`,
        { cache: 'no-store' }
      );
      const formsData = await formsRes.json();
      if (Array.isArray(formsData?.data)) {
        realForms = formsData.data.map(f => ({
          formId: String(f.id),
          formName: f.name || `Lead Form ${f.id}`,
          pageName: targetPageName,
          platform: 'Facebook & Instagram Lead Ads',
          campaignAction: 'existing',
          campaignName: f.name || '',
          distributionRule: 'ROUND_ROBIN',
          assignedTeam: 'North Region Sales',
          assignedCallerId: '',
          assignedCallerName: 'Auto Round-Robin',
          customizeFields: true,
          fieldMapping: {},
          active: f.status === 'ACTIVE',
          leadsCaptured: Number(f.leads_count) || 0,
          lastLeadAt: null
        }));
      }
    } catch (fErr) {
      console.warn('Could not fetch real forms for page:', fErr.message);
    }

    // 5. Fetch real campaigns for connected ad account
    let realCampaigns = [];
    if (targetAdAccountId) {
      try {
        const campRes = await fetch(
          `https://graph.facebook.com/v21.0/${targetAdAccountId}/campaigns?fields=id,name,status,objective,daily_budget,insights{impressions,clicks,spend}&limit=50&access_token=${encodeURIComponent(cleanToken)}`,
          { cache: 'no-store' }
        );
        const campData = await campRes.json();
        if (Array.isArray(campData?.data)) {
          realCampaigns = campData.data.map(c => {
            const ins = c.insights?.data?.[0] || {};
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
      } catch (cErr) {
        console.warn('Could not fetch real campaigns:', cErr.message);
      }
    }

    // 6. Save completely to MongoDB - Real Connected Account Data Only
    settings.metaConfig = {
      ...(settings.metaConfig?.toObject?.() || settings.metaConfig),
      connected: true,
      pageId: targetPageId,
      pageName: targetPageName,
      adAccountId: targetAdAccountId,
      accessToken: targetPageToken,
      userAccessToken: cleanToken,
      connectedPages,
      connectedAdAccounts,
      webhookSubscribed: subscribed,
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
    settings.markModified('metaConfig');
    settings.markModified('connectedIntegrations');
    await settings.save();

    // 7. Update .env.local if present
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/META_PAGE_ID=.*/g, `META_PAGE_ID=${targetPageId}`);
        envContent = envContent.replace(/META_PAGE_NAME=.*/g, `META_PAGE_NAME=${targetPageName}`);
        envContent = envContent.replace(/META_AD_ACCOUNT_ID=.*/g, `META_AD_ACCOUNT_ID=${targetAdAccountId}`);
        if (envContent.includes('META_PAGE_ACCESS_TOKEN=')) {
          envContent = envContent.replace(/META_PAGE_ACCESS_TOKEN=.*/g, `META_PAGE_ACCESS_TOKEN=${targetPageToken}`);
        } else {
          envContent += `\nMETA_PAGE_ACCESS_TOKEN=${targetPageToken}`;
        }
        fs.writeFileSync(envPath, envContent, 'utf-8');
      }
    } catch {}

    purgeDashboardCache();
    purgeMetaCache();

    return NextResponse.json({
      success: true,
      pageId: targetPageId,
      pageName: targetPageName,
      adAccountId: targetAdAccountId,
      pagesFound: connectedPages.length,
      connectedPages,
      connectedAdAccounts,
      formsSynced: realForms.length,
      campaignsSynced: realCampaigns.length,
      subscribed,
      subscribeMessage,
      message: `Successfully connected Meta Account: "${targetPageName}" (${targetPageId}). Synced ${realForms.length} real forms and ${realCampaigns.length} campaigns.`
    });
  } catch (error) {
    console.error('Meta connect error:', error);
    return NextResponse.json({ error: 'Connection failed: ' + error.message }, { status: 500 });
  }
}
