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
      return NextResponse.json({ error: 'Invalid token. Please paste a valid Page Access Token.' }, { status: 400 });
    }

    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(token.trim())}`, { cache: 'no-store' });
    const meData = await meRes.json();

    if (meData.error) {
      return NextResponse.json({
        error: `Meta API Error: ${meData.error.message}`,
        detail: meData.error.type
      }, { status: 400 });
    }

    const pageId = meData.id || process.env.META_PAGE_ID || '933429549844450';
    const pageName = meData.name || process.env.META_PAGE_NAME || 'Kisan Choice';

    let subscribed = false;
    let subscribeMessage = '';
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(token.trim())}`,
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

    settings.metaConfig = {
      ...(settings.metaConfig?.toObject?.() || settings.metaConfig),
      connected: true,
      pageId,
      pageName,
      accessToken: token.trim(),
      webhookSubscribed: subscribed,
      connectedAt: new Date(),
      lastSyncAt: new Date()
    };
    settings.connectedIntegrations = [];
    await settings.save();

    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        if (envContent.includes('META_PAGE_ACCESS_TOKEN=')) {
          envContent = envContent.replace(/META_PAGE_ACCESS_TOKEN=.*/g, `META_PAGE_ACCESS_TOKEN=${token.trim()}`);
        } else {
          envContent += `\nMETA_PAGE_ACCESS_TOKEN=${token.trim()}`;
        }
        fs.writeFileSync(envPath, envContent, 'utf-8');
      }
    } catch {}

    purgeDashboardCache();
    purgeMetaCache();

    return NextResponse.json({
      success: true,
      pageId,
      pageName,
      subscribed,
      subscribeMessage,
      message: `Connected to "${pageName}" (${pageId}).`
    });
  } catch (error) {
    console.error('Meta connect error:', error);
    return NextResponse.json({ error: 'Connection failed: ' + error.message }, { status: 500 });
  }
}
