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
import { parseMetaLeadItem } from '../../../../lib/metaLeadParser';

export const dynamic = 'force-dynamic';

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

  const lastLead = await Lead.findOne({ assigned_to: { $in: pool.map(p => p._id) } })
    .sort({ assigned_at: -1 })
    .lean();
  const lastIdx = lastLead?.assigned_to
    ? pool.findIndex(p => p._id.toString() === lastLead.assigned_to.toString())
    : -1;
  return pool[(lastIdx + 1) % pool.length];
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

      if (token && token.length > 20) {
        try {
          const campRes = await fetch(
            `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights{impressions,clicks,spend}&limit=50&access_token=${encodeURIComponent(token)}`,
            { cache: 'no-store' }
          );
          const campData = await campRes.json();
          if (Array.isArray(campData?.data)) {
            rawCampaigns = campData.data;
          }
        } catch (err) {
          console.warn('Failed to fetch campaigns from Meta Graph API:', err.message);
        }

        const pageId = settings.metaConfig?.pageId || '933429549844450';
        try {
          const formRes = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=50&access_token=${encodeURIComponent(pageToken || token)}`,
            { cache: 'no-store' }
          );
          const formData = await formRes.json();
          if (Array.isArray(formData?.data)) {
            rawForms = formData.data;
          }
        } catch (err) {
          console.warn('Failed to fetch forms:', err.message);
        }
      }

      const activeCallers = await User.find({
        role: 'telecaller',
        status: { $in: ['active', 'ACTIVE'] }
      }).select('name email mobile team').lean();

      const existingMap = new Map((settings.metaCampaigns || []).map(c => [c.campaignId, c]));
      const updatedCampaigns = [];
      const newCapturedLeads = [];

      // Sync new leads across active forms with leads_count > 0 using Page token
      const formsWithLeads = rawForms.filter(f => Number(f.leads_count) > 0);
      for (const form of formsWithLeads) {
        try {
          const leadRes = await fetch(
            `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,ad_name,campaign_name,form_id,field_data&limit=25&access_token=${encodeURIComponent(pageToken || token)}`,
            { cache: 'no-store' }
          );
          const leadData = await leadRes.json();
          if (Array.isArray(leadData?.data)) {
            for (const fl of leadData.data) {
              const parsed = parseMetaLeadItem(fl, form.name);
              if (!parsed.mobile || parsed.mobile.length !== 10) continue;

              const exists = await Lead.findOne({
                $or: [
                  { mobile: parsed.mobile },
                  ...(parsed.metaLeadId ? [{ notes: { $regex: parsed.metaLeadId } }] : [])
                ]
              });
              if (exists) continue;

              const chosenCaller = await pickCallerForTeam(activeCallers, 'North Region Sales', 'ROUND_ROBIN');
              const created = await Lead.create({
                name: parsed.name || `Meta Lead ${parsed.metaLeadId}`,
                mobile: parsed.mobile,
                email: parsed.email,
                city: parsed.city,
                state: parsed.state,
                business_type: parsed.businessType,
                product_interest: parsed.productInterest,
                lead_source: 'Facebook Meta Lead Ads',
                campaign_name: parsed.campaignName || form.name || '',
                status: chosenCaller ? 'Assigned' : 'Fresh Lead',
                assigned_to: chosenCaller ? chosenCaller._id : null,
                assigned_at: chosenCaller ? new Date() : null,
                notes: parsed.notes,
                ...(parsed.createdTime ? { createdAt: parsed.createdTime } : {})
              });

              newCapturedLeads.push({
                lead_id: created.lead_id,
                name: created.name,
                mobile: created.mobile,
                campaign: created.campaign_name,
                assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned'
              });
            }
          }
        } catch (fetchErr) {
          console.warn(`Error fetching leads for form ${form.id}:`, fetchErr.message);
        }
      }

      // Count real leads in DB per campaign
      const dbLeadCounts = await Lead.aggregate([
        { $group: { _id: '$campaign_name', count: { $sum: 1 } } }
      ]);
      const dbCountByCamp = new Map();
      for (const row of dbLeadCounts) {
        if (row._id) dbCountByCamp.set(String(row._id).toLowerCase(), row.count);
      }

      for (const rc of rawCampaigns) {
        const existing = existingMap.get(rc.id) || {};
        const insight = rc.insights?.data?.[0] || {};
        const spend = Number(insight.spend ?? existing.spend ?? 0);
        const impressions = Number(insight.impressions ?? existing.impressions ?? 0);
        const clicks = Number(insight.clicks ?? existing.clicks ?? 0);
        const budget = rc.daily_budget ? Number(rc.daily_budget) / 100 : (existing.dailyBudget || 0);

        const rcLower = (rc.name || '').toLowerCase();
        const linkedForm = rawForms.find(f => {
          const fLower = (f.name || '').toLowerCase();
          return fLower && rcLower && (fLower.includes(rcLower) || rcLower.includes(fLower));
        }) || null;

        const formId = linkedForm?.id || existing.linkedFormId || '';
        const formName = linkedForm?.name || existing.linkedFormName || '';
        const assignedTeam = existing.assignedTeam || 'North Region Sales';
        const distributionRule = existing.distributionRule || 'ROUND_ROBIN';
        const leadsCount = dbCountByCamp.get(rcLower) || (linkedForm ? Number(linkedForm.leads_count) || 0 : (existing.leadsCount || 0));

        updatedCampaigns.push({
          campaignId: rc.id,
          name: rc.name,
          status: rc.status || 'ACTIVE',
          objective: rc.objective || 'OUTCOME_LEADS',
          dailyBudget: budget,
          spend,
          impressions,
          clicks,
          leadsCount,
          assignedTeam,
          distributionRule,
          linkedFormId: formId,
          linkedFormName: formName,
          lastSyncAt: new Date()
        });
      }

      const updateFields = {
        'metaConfig.lastSyncAt': new Date()
      };
      if (updatedCampaigns.length > 0) {
        updateFields.metaCampaigns = updatedCampaigns;
      }
      if (rawForms.length > 0) {
        updateFields.metaForms = rawForms.map(f => ({
          formId: String(f.id),
          formName: f.name,
          pageName: settings.metaConfig?.pageName || 'Kisan Choice',
          platform: 'Facebook & Instagram Lead Ads',
          campaignAction: 'existing',
          campaignName: f.name || '',
          distributionRule: 'ROUND_ROBIN',
          assignedTeam: 'North Region Sales',
          assignedCallerId: '',
          assignedCallerName: 'Auto Round-Robin',
          customizeFields: true,
          active: f.status === 'ACTIVE',
          leadsCaptured: Number(f.leads_count) || 0,
          lastLeadAt: null
        }));
      }

      await SystemSetting.findOneAndUpdate(
        { key: 'global' },
        { $set: updateFields },
        { new: true, upsert: true }
      );

      purgeMetaCache();
      purgeDashboardCache();

      return NextResponse.json({
        success: true,
        message: `Synced ${updatedCampaigns.length} Meta Campaigns & ${newCapturedLeads.length} new leads from Meta Graph API.`,
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

        if (status && token) {
          try {
            await fetch(`https://graph.facebook.com/v21.0/${campaignId}?access_token=${encodeURIComponent(token)}`, {
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
        let baseBudget = Number(settings.metaCampaigns[idx].dailyBudget) || 0;

        // If campaign uses AdSet-level budget (dailyBudget === 0) and no explicit newBudget was entered, read live AdSet daily_budget
        if (!newBudget && baseBudget === 0 && token && token.length > 20) {
          try {
            const adsetsCheck = await fetch(
              `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,daily_budget&access_token=${encodeURIComponent(token)}`,
              { cache: 'no-store' }
            );
            const adsetsJson = await adsetsCheck.json();
            const firstWithBudget = (adsetsJson?.data || []).find(a => Number(a.daily_budget) > 0);
            if (firstWithBudget) {
              baseBudget = Number(firstWithBudget.daily_budget) / 100;
            }
          } catch {}
        }

        const targetBudget = newBudget ? Number(newBudget) : Math.round(baseBudget * Number(boostMultiplier));
        if (!targetBudget || targetBudget <= 0) {
          return NextResponse.json(
            { error: 'This campaign uses AdSet-level budgeting without a base daily budget. Enter a custom daily budget (INR) to scale.' },
            { status: 400 }
          );
        }

        settings.metaCampaigns[idx].dailyBudget = targetBudget;
        if (activateIfPaused) {
          settings.metaCampaigns[idx].status = 'ACTIVE';
        }

        let metaGraphUpdated = false;
        if (token && token.length > 20) {
          try {
            const metaRes = await fetch(`https://graph.facebook.com/v21.0/${campaignId}?access_token=${encodeURIComponent(token)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: activateIfPaused ? 'ACTIVE' : settings.metaCampaigns[idx].status,
                daily_budget: String(targetBudget * 100)
              })
            });
            const metaJson = await metaRes.json();
            metaGraphUpdated = metaJson.success === true;

            if (!metaGraphUpdated && metaJson.error) {
              const adsetsRes = await fetch(
                `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,name,daily_budget&access_token=${encodeURIComponent(token)}`,
                { cache: 'no-store' }
              );
              const adsetsData = await adsetsRes.json();
              if (Array.isArray(adsetsData?.data) && adsetsData.data.length > 0) {
                for (const adset of adsetsData.data) {
                  await fetch(`https://graph.facebook.com/v21.0/${adset.id}?access_token=${encodeURIComponent(token)}`, {
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
          message: `Campaign "${settings.metaCampaigns[idx].name}" scaled to ₹${targetBudget}/day (${settings.metaCampaigns[idx].status}).`
        });
      }
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (body.action === 'SAVE_CAMPAIGN_GOAL') {
      const { campaignId, campaignName, targetLeadsDaily, targetCostPerLead, targetMonthlyBudget, slaTargetMinutes, conversionRateTarget, notes } = body;
      if (!campaignId) {
        return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
      }
      const goals = settings.campaignGoals || [];
      const gIdx = goals.findIndex(g => g.campaignId === campaignId);
      const goalObj = {
        campaignId,
        campaignName: campaignName || '',
        targetLeadsDaily: Number(targetLeadsDaily) || 0,
        targetCostPerLead: Number(targetCostPerLead) || 0,
        targetMonthlyBudget: Number(targetMonthlyBudget) || 0,
        slaTargetMinutes: Number(slaTargetMinutes) || 15,
        conversionRateTarget: Number(conversionRateTarget) || 0,
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
        message: `Campaign goal for "${goalObj.campaignName}" saved.`
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Meta campaigns POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
