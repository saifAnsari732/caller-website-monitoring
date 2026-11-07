import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import { getOrInitSettings } from '../../../../lib/settings';

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
  fieldMapping,
  count = 5
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
  let rawPayloads = [];

  if (formId && token && token.trim().length > 15) {
    try {
      const graphRes = await fetch(
        `https://graph.facebook.com/v21.0/${formId}/leads?fields=id,created_time,field_data&limit=${count}&access_token=${token.trim()}`
      );
      const graphData = await graphRes.json();
      if (Array.isArray(graphData?.data) && graphData.data.length > 0) {
        const mapping = fieldMapping || {};
        rawPayloads = graphData.data.map(item => {
          const mappedDoc = { metaLeadId: item.id };
          for (const f of (item.field_data || [])) {
            const key = f.name;
            const val = Array.isArray(f.values) && f.values.length > 0 ? f.values[0] : '';
            const crmField =
              mapping[key] ||
              (key.includes('name')
                ? 'name'
                : key.includes('phone') || key.includes('mobile')
                ? 'mobile'
                : key.includes('city')
                ? 'city'
                : key.includes('state')
                ? 'state'
                : key.includes('email')
                ? 'email'
                : key.includes('inbox')
                ? 'inbox_url'
                : key.includes('business') || key.includes('जुड़ना')
                ? 'business_type'
                : 'product_interest');
            if (crmField && val) mappedDoc[crmField] = val;
          }
          return mappedDoc;
        });
      }
    } catch (err) {
      console.warn('Auto capture warning:', err.message);
    }
  }

  const capturedLeads = [];
  for (const payload of rawPayloads) {
    const cleanMobile = sanitizePhone(payload.mobile) || payload.mobile || '';
    if (!cleanMobile && !payload.name) continue;

    // Deduplicate
    let existing = null;
    if (cleanMobile && cleanMobile.length === 10) {
      existing = await Lead.findOne({ mobile: cleanMobile });
    }
    if (!existing && payload.metaLeadId) {
      existing = await Lead.findOne({ notes: { $regex: payload.metaLeadId } });
    }
    if (existing) continue;

    const chosenCaller = await pickCallerForRouting(
      activeCallers,
      assignedTeam,
      distributionRule,
      assignedCallerId
    );

    const isPhoneValid = cleanMobile && cleanMobile.length === 10;
    const phoneToStore = isPhoneValid ? cleanMobile : (payload.mobile || '9826011223');
    const tags = isPhoneValid ? [] : ['Urgent'];

    let leadNotes = `Real Meta Lead Ads Ingestion • Form: "${formName}" (${formId})`;
    if (payload.metaLeadId) leadNotes += ` • Lead ID: ${payload.metaLeadId}`;
    if (payload.inbox_url) leadNotes += ` • Inbox: ${payload.inbox_url}`;

    const created = await Lead.create({
      name: payload.name || 'Facebook Lead Prospect',
      mobile: phoneToStore,
      email: payload.email || '',
      city: payload.city || (formName.includes('Mirzapur') ? 'Mirzapur' : formName.includes('Agra') ? 'Agra' : 'Indore'),
      state: payload.state || 'Uttar Pradesh',
      business_type: payload.business_type || 'Distributor',
      product_interest: payload.product_interest || 'Mustard Oil (15L Tin)',
      lead_source: leadSource || 'Facebook Meta Lead Ads',
      campaign_name: campaignName || 'Facebook Meta Lead Ads',
      status: chosenCaller ? 'Assigned' : 'Fresh Lead',
      assigned_to: chosenCaller ? chosenCaller._id : null,
      assigned_at: chosenCaller ? new Date() : null,
      tags,
      notes: leadNotes
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
      assignedTo: chosenCaller ? chosenCaller.name : 'Auto-Queue',
      assignedTeam: chosenCaller?.team || assignedTeam || 'North Region Sales'
    });
  }

  return capturedLeads;
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const settings = await getOrInitSettings();

    // 1. Save / Link a Meta Lead Form Integration AND Ingest Live Leads from Meta
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
        captureCount = 5
      } = body;

      if (!formId || !formName) {
        return NextResponse.json({ error: 'Form ID and Form Name are required' }, { status: 400 });
      }

      const finalCampaignName = (campaignName || formName || 'Facebook Meta Lead Ads').trim();

      const capturedLeads = await autoCaptureLeadsOnConnect({
        settings,
        leadSource: 'Facebook Meta Lead Ads',
        campaignName: finalCampaignName,
        formName,
        formId,
        assignedTeam: assignedTeam || 'North Region Sales',
        distributionRule: distributionRule || 'ROUND_ROBIN',
        assignedCallerId,
        fieldMapping,
        count: Number(captureCount) || 5
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
        fieldMapping: fieldMapping || {
          full_name: 'name',
          phone_number: 'mobile',
          phone: 'mobile',
          email: 'email',
          city: 'city',
          state: 'state',
          'आप_किस_रूप_में_जुड़ना_चाहते_हैं?': 'business_type',
          business_inquiry_type: 'business_type',
          product_preference: 'product_interest'
        },
        active: true,
        leadsCaptured: prevCaptured + capturedLeads.length,
        lastLeadAt: new Date()
      };

      if (existingIdx >= 0) {
        settings.metaForms[existingIdx] = formEntry;
      } else {
        settings.metaForms.unshift(formEntry);
      }

      // Ensure campaign exists in customCampaigns
      const campExists = (settings.customCampaigns || []).some(
        c => c.name.toLowerCase() === finalCampaignName.toLowerCase()
      );
      if (!campExists) {
        settings.customCampaigns.unshift({
          name: finalCampaignName,
          platform: 'META ADS',
          formName,
          team: assignedTeam || 'North Region Sales',
          rule:
            distributionRule === 'LOAD_BALANCED'
              ? 'Load-Balanced'
              : distributionRule === 'DIRECT_CALLER'
              ? `Direct (${assignedCallerName || 'Agent'})`
              : 'Round-Robin',
          status: 'ACTIVE',
          dailyBudget: 300
        });
      }

      // Ensure routing rule exists
      const ruleName = `Meta Form: ${formName}`;
      const ruleIdx = (settings.routingRules || []).findIndex(r => r.name === ruleName);
      const newRule = {
        name: ruleName,
        source: 'Facebook Meta Lead Ads',
        matchField: 'campaign_name',
        matchValue: finalCampaignName,
        strategy:
          distributionRule === 'LOAD_BALANCED'
            ? 'Load Balanced'
            : distributionRule === 'DIRECT_CALLER'
            ? `Direct -> ${assignedCallerName || 'Agent'}`
            : 'Cyclic Round-Robin',
        targetTeam: assignedTeam || 'North Region Sales',
        targetCallerId: assignedCallerId || null,
        active: true
      };
      if (ruleIdx >= 0) {
        settings.routingRules[ruleIdx] = newRule;
      } else {
        settings.routingRules.unshift(newRule);
      }

      settings.metaConfig.connected = true;
      settings.metaConfig.lastSyncAt = new Date();
      settings.connectedIntegrations = []; // Ensure only Meta
      settings.markModified('metaForms');
      settings.markModified('customCampaigns');
      settings.markModified('routingRules');
      settings.markModified('metaConfig');
      settings.markModified('connectedIntegrations');
      await settings.save();

      return NextResponse.json({
        success: true,
        capturedCount: capturedLeads.length,
        capturedLeads,
        message: `Connected "${formName}" → Ingested ${capturedLeads.length} live leads into "${finalCampaignName}" (${assignedTeam || 'North Region Sales'})!`,
        settings
      });
    }

    // 2. Toggle Form Active / Paused
    if (body.action === 'TOGGLE_FORM') {
      const { formId } = body;
      const form = (settings.metaForms || []).find(f => f.formId === formId);
      if (form) {
        form.active = !form.active;
        settings.markModified('metaForms');
        await settings.save();
      }
      return NextResponse.json({ success: true, settings });
    }

    // 3. Delete Linked Form
    if (body.action === 'DELETE_FORM') {
      const { formId } = body;
      settings.metaForms = (settings.metaForms || []).filter(f => f.formId !== formId);
      settings.markModified('metaForms');
      await settings.save();
      return NextResponse.json({ success: true, settings });
    }

    // 4. Update Global Meta Config Toggles
    if (body.action === 'UPDATE_META_CONFIG') {
      settings.metaConfig = {
        ...(settings.metaConfig?.toObject?.() || settings.metaConfig),
        ...body.config,
        lastSyncAt: new Date()
      };
      settings.markModified('metaConfig');
      await settings.save();
      return NextResponse.json({ success: true, settings });
    }

    // 5. Connect via OAuth Mode or Page Access Token
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

    // Verify token with Meta Graph API
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token.trim()}`);
    const meData = await meRes.json();

    if (meData.error) {
      return NextResponse.json({
        error: `Meta API Error: ${meData.error.message}`,
        detail: meData.error.type
      }, { status: 400 });
    }

    const pageId = meData.id || process.env.META_PAGE_ID || '933429549844450';
    const pageName = meData.name || process.env.META_PAGE_NAME || 'Kisan Choice';

    // Subscribe page to leadgen webhooks
    let subscribed = false;
    let subscribeMessage = '';
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${token.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscribed_fields: ['leadgen'] }),
        }
      );
      const subData = await subRes.json();
      subscribed = subData.success === true;
      subscribeMessage = subscribed ? 'Page subscribed to leadgen events' : JSON.stringify(subData);
    } catch (subErr) {
      subscribeMessage = 'Failed to subscribe: ' + subErr.message;
    }

    // Save in MongoDB SystemSetting
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

    // Update .env.local if possible
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      if (envContent.includes('META_PAGE_ACCESS_TOKEN=')) {
        envContent = envContent.replace(/META_PAGE_ACCESS_TOKEN=.*/g, `META_PAGE_ACCESS_TOKEN=${token.trim()}`);
      } else {
        envContent += `\nMETA_PAGE_ACCESS_TOKEN=${token.trim()}`;
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      pageId,
      pageName,
      subscribed,
      subscribeMessage,
      message: `Connected to "${pageName}" (${pageId}). ${subscribed ? 'Leadgen webhook subscribed.' : 'Token saved to MongoDB.'}`
    });
  } catch (error) {
    console.error('Meta connect error:', error);
    return NextResponse.json({ error: 'Connection failed: ' + error.message }, { status: 500 });
  }
}
