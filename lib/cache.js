import { unstable_cache, revalidateTag, revalidatePath } from 'next/cache';
import connectDB from './db.js';
import Lead from './models/Lead.js';
import User from './models/User.js';
import Call from './models/Call.js';
import Followup from './models/Followup.js';
import { getOrInitSettings } from './settings.js';

class InMemoryTtlCache {
  constructor(defaultTtlSeconds = 20) {
    this.store = new Map();
    this.tagMap = new Map();
    this.defaultTtl = defaultTtlSeconds * 1000;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds, tags = []) {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl;
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt, tags });

    for (const tag of tags) {
      if (!this.tagMap.has(tag)) {
        this.tagMap.set(tag, new Set());
      }
      this.tagMap.get(tag).add(key);
    }
  }

  delete(key) {
    const entry = this.store.get(key);
    if (entry && entry.tags) {
      for (const tag of entry.tags) {
        const set = this.tagMap.get(tag);
        if (set) {
          set.delete(key);
          if (set.size === 0) this.tagMap.delete(tag);
        }
      }
    }
    this.store.delete(key);
  }

  invalidateTag(tag) {
    const keys = this.tagMap.get(tag);
    if (keys) {
      for (const k of keys) {
        this.store.delete(k);
      }
      this.tagMap.delete(tag);
    }
  }

  clear() {
    this.store.clear();
    this.tagMap.clear();
  }

  stats() {
    return {
      entries: this.store.size,
      tags: Array.from(this.tagMap.keys())
    };
  }
}

const globalCache = globalThis.__CRM_MEMORY_CACHE__ || new InMemoryTtlCache(20);
if (process.env.NODE_ENV !== 'production') {
  globalThis.__CRM_MEMORY_CACHE__ = globalCache;
}

export const getCachedDashboardData = unstable_cache(
  async () => {
    await connectDB();

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().split('T')[0];
    const slaCutoff = new Date(now.getTime() - 15 * 60 * 1000);
    const agingCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [
      telecallers,
      totalLeads,
      freshLeads,
      interestedLeads,
      closedDeals,
      todaysCallsDocs,
      allCallsCount,
      connectedCallsCount,
      pendingFollowups,
      overdueFollowups,
      slaBreachLeads,
      agingLeadsCount,
      recentLeads
    ] = await Promise.all([
      User.find({ role: 'telecaller' }).select('-password').sort({ createdAt: 1 }).lean(),
      Lead.countDocuments({}),
      Lead.countDocuments({ status: { $in: ['Fresh Lead', 'Assigned'] } }),
      Lead.countDocuments({ status: { $in: ['Interested', 'Distributor Interested', 'Trader Interested', 'DSS Interested', 'RSS Interested', 'SS Interested'] } }),
      Lead.countDocuments({ status: 'Closed' }),
      Call.find({ start_time: { $gte: startOfToday } }).lean(),
      Call.countDocuments({}),
      Call.countDocuments({ status: { $nin: ['Not Connected', 'Wrong Number', 'Rejected'] } }),
      Followup.countDocuments({ completed: false, date: { $lte: todayStr } }),
      Followup.countDocuments({ completed: false, date: { $lt: todayStr } }),
      Lead.find({
        status: { $in: ['Fresh Lead', 'Assigned'] },
        call_attempts: { $eq: 0 },
        createdAt: { $lte: slaCutoff }
      }).populate('assigned_to', 'name').sort({ createdAt: -1 }).limit(10).lean(),
      Lead.countDocuments({
        status: { $in: ['Fresh Lead', 'Assigned', 'Follow Up', 'Callback'] },
        createdAt: { $lte: agingCutoff }
      }),
      Lead.find({}).populate('assigned_to', 'name mobile').sort({ createdAt: -1 }).limit(50).lean()
    ]);

    const useToday = todaysCallsDocs.length > 0;
    const totalCallsMetric = useToday ? todaysCallsDocs.length : allCallsCount;
    const connectedCallsMetric = useToday
      ? todaysCallsDocs.filter(c => !['Not Connected', 'Wrong Number', 'Rejected'].includes(c.status)).length
      : connectedCallsCount;

    const team = await Promise.all(
      telecallers.map(async (tc) => {
        const [callerCallsToday, callerAllCalls, assignedCount, closedCount, interestedCount] = await Promise.all([
          Call.countDocuments({ caller: tc._id, start_time: { $gte: startOfToday } }),
          Call.countDocuments({ caller: tc._id }),
          Lead.countDocuments({ assigned_to: tc._id }),
          Lead.countDocuments({ assigned_to: tc._id, status: 'Closed' }),
          Lead.countDocuments({ assigned_to: tc._id, status: { $in: ['Interested', 'Distributor Interested', 'Trader Interested'] } })
        ]);

        const callsCount = callerCallsToday > 0 ? callerCallsToday : callerAllCalls;
        const shift = tc.on_leave
          ? 'On Leave'
          : (tc.shift_status || (tc.status === 'active' ? 'Clocked In' : 'Clocked Out'));
        const liveStatus = tc.on_leave || shift === 'Clocked Out'
          ? 'Offline'
          : shift === 'On Break'
            ? 'On Break'
            : 'Online';

        let lastSeen = '—';
        if (tc.last_active_at) {
          const diffMins = Math.max(0, Math.floor((now - new Date(tc.last_active_at)) / 60000));
          lastSeen = diffMins < 2 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;
        }

        return {
          id: tc._id.toString(),
          name: tc.name,
          mobile: tc.mobile,
          team: tc.team || 'North Region Sales',
          status: liveStatus,
          shift: shift === 'Clocked In' ? 'Active' : shift,
          calls: callsCount,
          target: tc.daily_call_target || 50,
          assignedLeads: assignedCount,
          interestedLeads: interestedCount,
          closedDeals: closedCount,
          lastSeen
        };
      })
    );

    const clockedInCount = team.filter(t => t.status === 'Online').length;

    const [statusAgg, sourceAgg, allLeadsForCampaigns] = await Promise.all([
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $group: { _id: '$lead_source', count: { $sum: 1 } } }]),
      Lead.find({}).select('campaign_name lead_source status').lean()
    ]);

    const campaignStatusBreakdown = {};
    for (const l of allLeadsForCampaigns) {
      const cKey = l.campaign_name ? l.campaign_name : (l.lead_source || 'Facebook Meta Lead Ads');
      if (!campaignStatusBreakdown[cKey]) {
        campaignStatusBreakdown[cKey] = { total: 0, statuses: {} };
      }
      campaignStatusBreakdown[cKey].total += 1;
      const st = l.status || 'Fresh Lead';
      campaignStatusBreakdown[cKey].statuses[st] = (campaignStatusBreakdown[cKey].statuses[st] || 0) + 1;
    }

    return {
      kpis: {
        totalTelecallers: telecallers.length,
        clockedIn: clockedInCount,
        totalLeads,
        freshLeads,
        todaysCalls: totalCallsMetric,
        connectedCalls: connectedCallsMetric,
        pendingFollowups,
        overdueFollowups,
        interestedLeads,
        closedDeals,
        agingLeadsCount,
        slaBreachCount: slaBreachLeads.length,
        conversionRate: totalLeads > 0 ? Number(((closedDeals / totalLeads) * 100).toFixed(1)) : 0
      },
      team,
      slaBreachLeads: slaBreachLeads.map(l => ({
        id: l._id.toString(),
        lead_id: l.lead_id,
        name: l.name,
        mobile: l.mobile,
        city: l.city || '',
        state: l.state || '',
        product_interest: l.product_interest || '',
        assignedTo: l.assigned_to?.name || 'Unassigned',
        createdAt: l.createdAt
      })),
      recentLeads: recentLeads.map(l => ({
        id: l._id.toString(),
        lead_id: l.lead_id,
        name: l.name,
        mobile: l.mobile,
        email: l.email || '',
        city: l.city || '',
        state: l.state || '',
        business_type: l.business_type || '',
        status: l.status || 'Fresh Lead',
        priority: l.priority || 'Normal',
        product_interest: l.product_interest || '',
        lead_source: l.lead_source || 'Facebook Meta Lead Ads',
        campaign_name: l.campaign_name || '',
        assignedTo: l.assigned_to?.name || 'Unassigned',
        assignedToId: l.assigned_to?._id?.toString() || null,
        call_attempts: l.call_attempts || 0,
        createdAt: l.createdAt
      })),
      availableCampaigns: Array.from(new Set(allLeadsForCampaigns.map(l => l.campaign_name).filter(Boolean))),
      availableSources: Array.from(new Set(allLeadsForCampaigns.map(l => l.lead_source).filter(Boolean))),
      campaignStatusBreakdown,
      statusDistribution: statusAgg.map(s => ({ name: s._id || 'Unknown', value: s.count })),
      sourceDistribution: sourceAgg.map(s => ({ name: s._id || 'Direct', value: s.count })),
      cachedAt: new Date().toISOString()
    };
  },
  ['crm-dashboard-metrics-v4'],
  {
    revalidate: 20,
    tags: ['dashboard', 'leads', 'calls', 'telecallers']
  }
);

export const getCachedMetaStatus = unstable_cache(
  async () => {
    await connectDB();
    const settings = await getOrInitSettings();

    const envToken = process.env.META_PAGE_ACCESS_TOKEN || '';
    const dbToken = settings.metaConfig?.accessToken || '';
    const token = dbToken || envToken;
    const hasToken = !!(token && token.trim().length > 10);

    const connected = Boolean(settings.metaConfig?.connected && hasToken);
    const pageName = settings.metaConfig?.pageName || 'Kisan Choice';
    const pageId = settings.metaConfig?.pageId || '933429549844450';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const metaQuery = {
      $or: [
        { lead_source: { $regex: 'meta|facebook|instagram', $options: 'i' } },
        { campaign_name: { $ne: '' } }
      ]
    };

    const [
      totalMetaLeads,
      todayLeads,
      assignedLeads,
      unassignedLeads,
      convertedLeads,
      urgentZeroLossLeads,
      lastLead,
      recentLeads,
      telecallers,
      allMetaLeadDocs
    ] = await Promise.all([
      Lead.countDocuments(metaQuery),
      Lead.countDocuments({ ...metaQuery, createdAt: { $gte: todayStart } }),
      Lead.countDocuments({ ...metaQuery, assigned_to: { $ne: null } }),
      Lead.countDocuments({ ...metaQuery, assigned_to: null }),
      Lead.countDocuments({ ...metaQuery, status: 'Closed' }),
      Lead.countDocuments({ ...metaQuery, tags: 'Urgent' }),
      Lead.findOne(metaQuery).populate('assigned_to', 'name').sort({ createdAt: -1 }).lean(),
      Lead.find({}).populate('assigned_to', 'name team').sort({ createdAt: -1 }).limit(18).lean(),
      User.find({ role: 'telecaller' }).select('name _id mobile team status on_leave shift_status').lean(),
      Lead.find({
        $or: [
          { lead_source: { $regex: 'meta|facebook|instagram', $options: 'i' } },
          { notes: { $regex: 'Meta', $options: 'i' } }
        ]
      }).select('notes campaign_name').lean()
    ]);

    const webhookUrl = 'https://caller-website-monitoring.vercel.app/api/webhooks/meta';
    const verifyToken = settings.metaConfig?.verifyToken || process.env.META_VERIFY_TOKEN || 'KISAN_META_WEBHOOK_VERIFY';

    const recentLogs = (recentLeads || []).map((l, idx) => ({
      id: l._id?.toString() || `log_${idx}`,
      lead_id: l.lead_id || '',
      name: l.name,
      mobile: l.mobile,
      city: l.city || '',
      state: l.state || '',
      business_type: l.business_type || '',
      product_interest: l.product_interest || '',
      source: l.lead_source || 'Facebook Meta Lead Ads',
      campaignName: l.campaign_name || '',
      assignedTo: l.assigned_to?.name || 'Unassigned',
      assignedTeam: l.assigned_to?.team || '',
      zeroLoss: Array.isArray(l.tags) && l.tags.includes('Urgent'),
      httpStatus: 200,
      latencyMs: null,
      createdAt: l.createdAt || null
    }));

    return {
      connected,
      hasToken,
      pageName,
      pageId,
      appId: settings.metaConfig?.appId || '1007200718473332',
      adAccountId: process.env.META_AD_ACCOUNT_ID || 'act_1796071777698019',
      webhookUrl,
      verifyToken,
      webhookSubscribed: settings.metaConfig?.webhookSubscribed ?? true,
      autoSyncEnabled: settings.metaConfig?.autoSyncEnabled ?? true,
      zeroLossFallback: settings.metaConfig?.zeroLossFallback ?? true,
      distributionStrategy: settings.distributionStrategy || 'ROUND_ROBIN',
      stats: {
        totalMetaLeads,
        todayLeads,
        assignedLeads,
        unassignedLeads,
        convertedLeads,
        urgentZeroLossLeads,
        lastLeadAt: lastLead?.createdAt || null
      },
      metaForms: (settings.metaForms || [])
        .map(f => {
          const idStr = String(f.formId || '');
          const nameLower = (f.formName || '').trim().toLowerCase();
          let dbCount = 0;
          for (const doc of (allMetaLeadDocs || [])) {
            const notes = doc.notes || '';
            const camp = (doc.campaign_name || '').trim().toLowerCase();
            if (
              (idStr && notes.includes(idStr)) ||
              (nameLower && (notes.toLowerCase().includes(`"${nameLower}"`) || camp === nameLower))
            ) {
              dbCount++;
            }
          }
          return {
            formId: f.formId,
            formName: f.formName,
            pageName: f.pageName || pageName,
            platform: f.platform || 'Facebook & Instagram Ads',
            campaignName: f.campaignName || '',
            distributionRule: f.distributionRule,
            assignedTeam: f.assignedTeam,
            assignedCallerId: f.assignedCallerId,
            assignedCallerName: f.assignedCallerName,
            customizeFields: f.customizeFields,
            fieldMapping: f.fieldMapping,
            active: f.active,
            leadsCaptured: Math.max(Number(f.leadsCaptured) || 0, dbCount),
            lastLeadAt: f.lastLeadAt || null
          };
        })
        .sort((a, b) => {
          if ((b.leadsCaptured || 0) !== (a.leadsCaptured || 0)) {
            return (b.leadsCaptured || 0) - (a.leadsCaptured || 0);
          }
          if (a.active !== false && b.active === false) return -1;
          if (a.active === false && b.active !== false) return 1;
          return 0;
        }),
      connectedIntegrations: [],
      customCampaigns: (settings.customCampaigns || []).map(c => ({
        name: c.name,
        platform: c.platform,
        formName: c.formName || '',
        team: c.team,
        rule: c.rule,
        status: c.status || 'ACTIVE',
        dailyBudget: c.dailyBudget || 0,
        createdAt: c.createdAt
      })),
      recentLogs,
      telecallers: telecallers.map(t => ({
        _id: t._id.toString(),
        name: t.name,
        team: t.team,
        mobile: t.mobile,
        status: t.status,
        on_leave: t.on_leave,
        shift_status: t.shift_status
      })),
      metaCapiConfig: settings.metaCapiConfig || {
        pixelId: process.env.META_PIXEL_ID || '',
        enabled: Boolean(process.env.META_PIXEL_ID),
        testEventCode: process.env.META_TEST_EVENT_CODE || '',
        autoSendOnInterested: true,
        autoSendOnClosed: true,
        eventsSentCount: 0
      },
      metaCapiLogs: (settings.metaCapiLogs || []).slice(-20).reverse(),
      metaWebhookLogs: (settings.metaWebhookLogs || []).slice(-20).reverse(),
      cachedAt: new Date().toISOString()
    };
  },
  ['crm-meta-status-v3'],
  {
    revalidate: 20,
    tags: ['meta-status', 'settings', 'leads']
  }
);

export const getCachedMetaCampaigns = unstable_cache(
  async () => {
    await connectDB();
    const settings = await getOrInitSettings();

    const adAccountId = process.env.META_AD_ACCOUNT_ID || 'act_1796071777698019';
    const pageId = settings.metaConfig?.pageId || '933429549844450';
    const pageName = settings.metaConfig?.pageName || 'Kisan Choice';

    const leadCounts = await Lead.aggregate([
      { $match: { lead_source: { $in: ['Facebook Meta Lead Ads', 'META ADS', 'Instagram Ads'] } } },
      { $group: { _id: '$campaign_name', count: { $sum: 1 } } }
    ]);
    const leadCountMap = new Map();
    for (const lc of leadCounts) {
      if (lc._id) leadCountMap.set(lc._id.toLowerCase(), lc.count);
    }

    const goalMap = new Map();
    for (const g of (settings.campaignGoals || [])) {
      if (g.campaignId) goalMap.set(g.campaignId, g);
    }

    const campaigns = (settings.metaCampaigns || []).map(c => {
      const dbCount = leadCountMap.get((c.name || '').toLowerCase()) || 0;
      const goal = goalMap.get(c.campaignId) || null;
      return {
        campaignId: c.campaignId,
        name: c.name,
        status: c.status || 'ACTIVE',
        objective: c.objective || 'OUTCOME_LEADS',
        dailyBudget: c.dailyBudget || 0,
        spend: c.spend || 0,
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        leadsCount: Math.max(c.leadsCount || 0, dbCount),
        assignedTeam: c.assignedTeam || 'North Region Sales',
        distributionRule: c.distributionRule || 'ROUND_ROBIN',
        linkedFormId: c.linkedFormId || '',
        linkedFormName: c.linkedFormName || '',
        goal: goal ? {
          targetLeadsDaily: goal.targetLeadsDaily,
          targetCostPerLead: goal.targetCostPerLead,
          targetMonthlyBudget: goal.targetMonthlyBudget,
          slaTargetMinutes: goal.slaTargetMinutes,
          conversionRateTarget: goal.conversionRateTarget,
          notes: goal.notes
        } : null,
        targetLeadsDaily: goal?.targetLeadsDaily ?? null,
        targetCostPerLead: goal?.targetCostPerLead ?? null,
        targetMonthlyBudget: goal?.targetMonthlyBudget ?? null,
        lastSyncAt: c.lastSyncAt || null
      };
    });

    const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((acc, c) => acc + (c.leadsCount || 0), 0);
    const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;

    return {
      success: true,
      adAccountId,
      adAccountName: 'Kisan Kumar',
      pageId,
      pageName,
      currency: 'INR',
      totalSpend: Number(totalSpend.toFixed(2)),
      activeCount,
      totalCampaigns: campaigns.length,
      totalLeads,
      lastSyncAt: settings.metaConfig?.lastSyncAt || null,
      campaigns,
      campaignGoals: settings.campaignGoals || [],
      cachedAt: new Date().toISOString()
    };
  },
  ['crm-meta-campaigns-v2'],
  {
    revalidate: 30,
    tags: ['meta-campaigns', 'campaigns', 'leads']
  }
);

export function purgeCacheTags(...tags) {
  for (const tag of tags) {
    globalCache.invalidateTag(tag);
    try {
      revalidateTag(tag);
    } catch {}
  }
}

export function purgeDashboardCache() {
  purgeCacheTags('dashboard', 'leads', 'calls', 'telecallers');
  try {
    revalidatePath('/dashboard');
    revalidatePath('/');
  } catch {}
}

export function purgeMetaCache() {
  purgeCacheTags('meta-status', 'meta-campaigns', 'campaigns', 'settings');
  try {
    revalidatePath('/settings');
    revalidatePath('/campaigns');
    revalidatePath('/meta-leads');
  } catch {}
}

export function getCacheHeaders(sMaxAge = 15, swr = 60) {
  return {
    'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}, max-age=0`,
    'X-CRM-Cache': 'NextJS-DataCache-Tiered'
  };
}
