import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import SystemSetting from '../../../../lib/models/SystemSetting';
import { getOrInitSettings } from '../../../../lib/settings';
import {
  getCachedMetaCampaigns,
  purgeMetaCache,
  purgeDashboardCache,
  getCacheHeaders
} from '../../../../lib/cache';

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

async function pickCallerForTeam(activeCallers, targetTeam, distributionRule) {
  if (!activeCallers || activeCallers.length === 0) return null;

  let pool = activeCallers;
  if (targetTeam) {
    const teamMembers = activeCallers.filter(
      c => (c.team || '').toLowerCase() === targetTeam.toLowerCase()
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

  // Round-robin
  const lastLead = await Lead.findOne({ assigned_to: { $in: pool.map(p => p._id) } })
    .sort({ assigned_at: -1 })
    .lean();
  const lastIdx = lastLead?.assigned_to
    ? pool.findIndex(p => p._id.toString() === lastLead.assigned_to.toString())
    : -1;
  const nextIdx = (lastIdx + 1) % pool.length;
  return pool[nextIdx];
}

export async function GET() {
  try {
    const data = await getCachedMetaCampaigns();
    return NextResponse.json(data, {
      headers: getCacheHeaders(20, 60)
    });
  } catch (error) {
    console.error('Meta campaigns GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const settings = await getOrInitSettings();

    const adAccountId = process.env.META_AD_ACCOUNT_ID || 'act_1796071777698019';
    const userToken = process.env.META_USER_ACCESS_TOKEN || '';
    const pageToken = process.env.META_PAGE_ACCESS_TOKEN || settings.metaConfig?.accessToken || '';
    const token = userToken || pageToken;

    if (body.action === 'SYNC_ALL_CAMPAIGNS') {
      let rawCampaigns = [];
      let rawForms = [];

      // 1. Fetch campaigns from Meta Graph API
      if (token && token.length > 20) {
        try {
          const campRes = await fetch(
            `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights{impressions,clicks,spend}&limit=50&access_token=${token}`
          );
          const campData = await campRes.json();
          if (Array.isArray(campData?.data)) {
            rawCampaigns = campData.data;
          }
        } catch (err) {
          console.warn('Failed to fetch from Meta Graph API, using existing:', err.message);
        }

        // 2. Fetch Leadgen forms from Page
        const pageId = settings.metaConfig?.pageId || '933429549844450';
        try {
          const formRes = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=50&access_token=${pageToken || token}`
          );
          const formData = await formRes.json();
          if (Array.isArray(formData?.data)) {
            rawForms = formData.data;
          }
        } catch (err) {
          console.warn('Failed to fetch forms:', err.message);
        }
      }

      // If Graph API temporarily unreachable, keep existing real campaigns stored in MongoDB
      if (rawCampaigns.length === 0 && (settings.metaCampaigns || []).length > 0) {
        rawCampaigns = settings.metaCampaigns.map(c => ({
          id: c.campaignId,
          name: c.name,
          status: c.status,
          objective: c.objective,
          daily_budget: String((c.dailyBudget || 300) * 100),
          insights: { data: [{ impressions: c.impressions || 0, clicks: c.clicks || 0, spend: c.spend || 0 }] }
        }));
      }

      const activeCallers = await User.find({
        role: 'telecaller',
        status: { $in: ['active', 'ACTIVE'] }
      }).select('name email mobile team').lean();

      // Process and sync each campaign
      const existingMap = new Map((settings.metaCampaigns || []).map(c => [c.campaignId, c]));
      const updatedCampaigns = [];
      const newCapturedLeads = [];

      for (const rc of rawCampaigns) {
        const existing = existingMap.get(rc.id) || {};
        const insight = rc.insights?.data?.[0] || {};
        const spend = Number(insight.spend || existing.spend || 0);
        const impressions = Number(insight.impressions || existing.impressions || 0);
        const clicks = Number(insight.clicks || existing.clicks || 0);
        const budget = Number(rc.daily_budget ? rc.daily_budget / 100 : (existing.dailyBudget || 250));

        // Find linked form if any
        const linkedForm = rawForms.find(f =>
          (f.name || '').toLowerCase().includes((rc.name || '').toLowerCase().split('-')[0].trim()) ||
          (rc.name || '').toLowerCase().includes((f.name || '').toLowerCase().split('-')[0].trim())
        ) || rawForms[0];

        const formId = linkedForm?.id || existing.linkedFormId || '';
        const formName = linkedForm?.name || existing.linkedFormName || 'Meta Lead Gen Form';
        const assignedTeam = existing.assignedTeam || (rc.name.includes('Bulk') || rc.name.includes('Distributor') ? 'Bulk Lubricants Ops' : 'North Region Sales');
        const distributionRule = existing.distributionRule || 'ROUND_ROBIN';

        // 3. Try fetching real leads for this form if token present
        let formLeadsCount = existing.leadsCount || 0;
        if (formId && token && token.length > 20) {
          try {
            const leadRes = await fetch(
              `https://graph.facebook.com/v21.0/${formId}/leads?fields=id,created_time,field_data&limit=15&access_token=${token}`
            );
            const leadData = await leadRes.json();
            if (Array.isArray(leadData?.data) && leadData.data.length > 0) {
              formLeadsCount = Math.max(formLeadsCount, leadData.data.length);
              for (const fl of leadData.data) {
                // Parse fields
                let leadName = 'Meta Lead Prospect';
                let phone = '';
                let email = '';
                let city = 'Indore';
                let state = 'Madhya Pradesh';
                let product = 'Mustard Oil (15L Tin)';
                let notes = `Synced via Meta Ad Campaign: ${rc.name} (Lead ID: ${fl.id})`;

                for (const fd of (fl.field_data || [])) {
                  const val = Array.isArray(fd.values) ? fd.values[0] : fd.values;
                  if (!val) continue;
                  const key = (fd.name || '').toLowerCase();
                  if (key.includes('name') && !key.includes('company')) leadName = val;
                  else if (key.includes('phone') || key.includes('mobile')) phone = val;
                  else if (key.includes('email')) email = val;
                  else if (key.includes('city')) city = val;
                  else if (key.includes('state')) state = val;
                  else if (key.includes('product') || key.includes('oil')) product = val;
                }

                const cleanedPhone = sanitizePhone(phone);
                if (cleanedPhone) {
                  const exists = await Lead.findOne({
                    $or: [
                      { mobile: cleanedPhone },
                      { notes: { $regex: fl.id } }
                    ]
                  });
                  if (!exists) {
                    const chosenCaller = await pickCallerForTeam(activeCallers, assignedTeam, distributionRule);
                    const lastLeadDoc = await Lead.findOne({ lead_id: { $regex: /^L-\d+$/ } }).sort({ createdAt: -1 }).lean();
                    let nextNum = 8205;
                    if (lastLeadDoc?.lead_id) {
                      const m = lastLeadDoc.lead_id.match(/^L-(\d+)$/);
                      if (m) nextNum = parseInt(m[1], 10) + 1;
                    }
                    const newLeadId = `L-${nextNum}`;

                    const created = await Lead.create({
                      lead_id: newLeadId,
                      name: leadName,
                      mobile: cleanedPhone,
                      email: email || `${cleanedPhone}@kisanconnect.meta`,
                      city,
                      state,
                      business_type: 'Distributor',
                      product_interest: product,
                      lead_source: 'Facebook Meta Lead Ads',
                      campaign_name: rc.name,
                      status: chosenCaller ? 'Assigned' : 'Fresh Lead',
                      assigned_to: chosenCaller ? chosenCaller._id : null,
                      assigned_at: chosenCaller ? new Date() : null,
                      notes
                    });

                    newCapturedLeads.push({
                      lead_id: created.lead_id,
                      name: created.name,
                      mobile: created.mobile,
                      campaign: rc.name,
                      assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned'
                    });
                  }
                }
              }
            }
          } catch (fetchErr) {
            console.warn(`Error fetching leads for form ${formId}:`, fetchErr.message);
          }
        }

        updatedCampaigns.push({
          campaignId: rc.id,
          name: rc.name,
          status: rc.status || 'ACTIVE',
          objective: rc.objective || 'OUTCOME_LEADS',
          dailyBudget: budget,
          spend,
          impressions,
          clicks,
          leadsCount: formLeadsCount,
          assignedTeam,
          distributionRule,
          linkedFormId: formId,
          linkedFormName: formName,
          lastSyncAt: new Date()
        });

        // Also ensure present in customCampaigns
        const cIdx = (settings.customCampaigns || []).findIndex(cc => cc.name === rc.name);
        if (cIdx >= 0) {
          settings.customCampaigns[cIdx].status = rc.status || 'ACTIVE';
          settings.customCampaigns[cIdx].dailyBudget = budget;
          settings.customCampaigns[cIdx].team = assignedTeam;
        } else {
          settings.customCampaigns.push({
            name: rc.name,
            platform: 'META ADS',
            formName,
            team: assignedTeam,
            rule: distributionRule,
            status: rc.status || 'ACTIVE',
            dailyBudget: budget,
            createdAt: new Date()
          });
        }
      }

      await SystemSetting.findOneAndUpdate(
        { key: 'global' },
        {
          $set: {
            metaCampaigns: updatedCampaigns,
            customCampaigns: settings.customCampaigns,
            'metaConfig.lastSyncAt': new Date()
          }
        },
        { new: true, upsert: true }
      );

      // Invalidate Next.js cache so fresh data is immediately available
      purgeMetaCache();
      purgeDashboardCache();

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${updatedCampaigns.length} Meta Campaigns & captured ${newCapturedLeads.length} new leads!`,
        syncedCampaignsCount: updatedCampaigns.length,
        syncedLeadsCount: newCapturedLeads.length,
        campaigns: updatedCampaigns,
        capturedLeads: newCapturedLeads
      });
    }

    if (body.action === 'UPDATE_CAMPAIGN') {
      const { campaignId, assignedTeam, distributionRule, status, dailyBudget } = body;
      const idx = (settings.metaCampaigns || []).findIndex(c => c.campaignId === campaignId);
      if (idx >= 0) {
        if (assignedTeam) settings.metaCampaigns[idx].assignedTeam = assignedTeam;
        if (distributionRule) settings.metaCampaigns[idx].distributionRule = distributionRule;
        if (status) settings.metaCampaigns[idx].status = status;
        if (dailyBudget !== undefined) settings.metaCampaigns[idx].dailyBudget = Number(dailyBudget);

        // Also push status toggle directly to Meta Graph API
        if (status && token) {
          try {
            await fetch(`https://graph.facebook.com/v21.0/${campaignId}?access_token=${token}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
            });
          } catch (e) {
            console.warn('Meta status sync error:', e.message);
          }
        }

        settings.markModified('metaCampaigns');
        await settings.save();
        purgeMetaCache();
        return NextResponse.json({ success: true, campaign: settings.metaCampaigns[idx] });
      }
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (body.action === 'BOOST_CAMPAIGN') {
      const { campaignId, boostMultiplier = 1.5, newBudget, activateIfPaused = true } = body;
      const idx = (settings.metaCampaigns || []).findIndex(c => c.campaignId === campaignId);
      if (idx >= 0) {
        const currentBudget = settings.metaCampaigns[idx].dailyBudget || 300;
        const targetBudget = newBudget ? Number(newBudget) : Math.round(currentBudget * Number(boostMultiplier));
        settings.metaCampaigns[idx].dailyBudget = targetBudget;
        if (activateIfPaused) {
          settings.metaCampaigns[idx].status = 'ACTIVE';
        }

        // Attempt live budget and status update on Meta Graph API
        let metaGraphUpdated = false;
        if (token && token.length > 20) {
          try {
            const metaRes = await fetch(`https://graph.facebook.com/v21.0/${campaignId}?access_token=${token}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: activateIfPaused ? 'ACTIVE' : settings.metaCampaigns[idx].status,
                daily_budget: String(targetBudget * 100)
              })
            });
            const metaJson = await metaRes.json();
            metaGraphUpdated = metaJson.success === true;

            // If campaign update failed because budget is defined on ad set level, update active ad sets!
            if (!metaGraphUpdated && metaJson.error) {
              const adsetsRes = await fetch(`https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,name,daily_budget&access_token=${token}`);
              const adsetsData = await adsetsRes.json();
              if (Array.isArray(adsetsData?.data) && adsetsData.data.length > 0) {
                for (const adset of adsetsData.data) {
                  await fetch(`https://graph.facebook.com/v21.0/${adset.id}?access_token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      status: activateIfPaused ? 'ACTIVE' : undefined,
                      daily_budget: String(targetBudget * 100)
                    })
                  });
                }
                metaGraphUpdated = true;
              }
            }
          } catch (e) {
            console.warn('Meta Graph budget boost warning:', e.message);
          }
        }

        settings.markModified('metaCampaigns');
        await settings.save();
        purgeMetaCache();
        return NextResponse.json({
          success: true,
          metaGraphUpdated,
          campaign: settings.metaCampaigns[idx],
          message: `Campaign "${settings.metaCampaigns[idx].name}" boosted to ₹${targetBudget}/day (${settings.metaCampaigns[idx].status})!`
        });
      }
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (body.action === 'SAVE_CAMPAIGN_GOAL') {
      const { campaignId, campaignName, targetLeadsDaily, targetCostPerLead, targetMonthlyBudget, slaTargetMinutes, conversionRateTarget, notes } = body;
      const goals = settings.campaignGoals || [];
      const gIdx = goals.findIndex(g => g.campaignId === campaignId);
      const goalObj = {
        campaignId,
        campaignName: campaignName || 'Meta Campaign',
        targetLeadsDaily: Number(targetLeadsDaily) || 25,
        targetCostPerLead: Number(targetCostPerLead) || 30,
        targetMonthlyBudget: Number(targetMonthlyBudget) || 15000,
        slaTargetMinutes: Number(slaTargetMinutes) || 15,
        conversionRateTarget: Number(conversionRateTarget) || 12,
        notes: notes || '',
        updatedAt: new Date()
      };

      if (gIdx >= 0) {
        goals[gIdx] = goalObj;
      } else {
        goals.push(goalObj);
      }
      settings.campaignGoals = goals;
      settings.markModified('campaignGoals');
      await settings.save();
      purgeMetaCache();

      return NextResponse.json({
        success: true,
        goal: goalObj,
        message: `Campaign goal for "${goalObj.campaignName}" saved successfully!`
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Meta campaigns POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
