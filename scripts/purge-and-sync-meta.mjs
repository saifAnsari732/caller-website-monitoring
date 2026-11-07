import mongoose from 'mongoose';
import { parseMetaLeadItem } from '../lib/metaLeadParser.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Error: MONGODB_URI environment variable is required.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const settingsDoc = await db.collection('systemsettings').findOne({ key: 'global' });
  const pageId = process.env.META_PAGE_ID || settingsDoc?.metaConfig?.pageId || '933429549844450';
  const adAccountId = process.env.META_AD_ACCOUNT_ID || settingsDoc?.metaConfig?.adAccountId || 'act_1796071777698019';
  const pageToken = settingsDoc?.metaConfig?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || '';
  const userToken = settingsDoc?.metaConfig?.userAccessToken || process.env.META_USER_ACCESS_TOKEN || pageToken;

  // 1. Remove any non-Meta leads
  const purgeNonMeta = await db.collection('leads').deleteMany({
    lead_source: { $nin: ['Facebook Meta Lead Ads', 'Meta Lead Ads'] }
  });
  console.log(`Purged non-Meta leads: ${purgeNonMeta.deletedCount}`);

  // 2. Fetch active telecallers for Round-Robin assignment
  const telecallers = await db.collection('users').find({ role: 'telecaller', status: 'active' }).sort({ _id: 1 }).toArray();
  console.log(`Active telecallers in pool: ${telecallers.length}`);

  if (!pageToken) {
    console.log('No Meta Page Access Token configured; skipping live Graph API pull.');
    await mongoose.disconnect();
    return;
  }

  // 3. Fetch all live leadgen_forms from Meta Graph API v21.0
  const formsRes = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=50&access_token=${encodeURIComponent(pageToken)}`
  );
  const formsJson = await formsRes.json();

  if (formsJson.error) {
    console.warn(`Meta Graph API token notice: ${formsJson.error.message}`);
    console.log('Re-authenticate via Settings -> Launch Meta OAuth 2.0 to refresh live Graph API token.');
    await mongoose.disconnect();
    return;
  }

  const allForms = formsJson.data || [];
  console.log(`Fetched ${allForms.length} live leadgen_forms from Page ${pageId}.`);

  let syncedTotal = 0;
  let callerIdx = 0;

  for (const form of allForms) {
    if (Number(form.leads_count || 0) <= 0) continue;

    const leadsRes = await fetch(
      `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,ad_name,campaign_name,form_id,field_data&limit=50&access_token=${encodeURIComponent(pageToken)}`
    );
    const leadsJson = await leadsRes.json();
    if (leadsJson.error || !Array.isArray(leadsJson.data)) continue;

    for (const item of leadsJson.data) {
      const parsed = parseMetaLeadItem(item, form.name);
      if (!parsed.mobile || parsed.mobile.length !== 10) continue;

      const exists = await db.collection('leads').findOne({
        $or: [
          { mobile: parsed.mobile },
          ...(parsed.metaLeadId ? [{ notes: { $regex: parsed.metaLeadId } }] : [])
        ]
      });
      if (exists) continue;

      const assignedCaller = telecallers.length > 0 ? telecallers[callerIdx % telecallers.length] : null;
      callerIdx++;

      const lastLead = await db.collection('leads').findOne({}, { sort: { _id: -1 } });
      let nextNum = 8400;
      if (lastLead?.lead_id && /^L-\d+$/.test(lastLead.lead_id)) {
        nextNum = parseInt(lastLead.lead_id.replace('L-', ''), 10) + 1;
      }

      await db.collection('leads').insertOne({
        lead_id: `L-${nextNum}`,
        name: parsed.name || `Meta Lead ${parsed.metaLeadId}`,
        mobile: parsed.mobile,
        email: parsed.email,
        city: parsed.city,
        state: parsed.state,
        business_type: parsed.businessType,
        product_interest: parsed.productInterest,
        lead_source: 'Facebook Meta Lead Ads',
        campaign_name: parsed.campaignName || form.name || '',
        status: assignedCaller ? 'Assigned' : 'Fresh Lead',
        priority: 'Normal',
        tags: [],
        assigned_to: assignedCaller ? assignedCaller._id : null,
        assigned_at: assignedCaller ? new Date() : null,
        first_contacted_at: null,
        last_contacted_at: null,
        call_attempts: 0,
        notes: parsed.notes,
        createdAt: parsed.createdTime,
        updatedAt: new Date()
      });
      syncedTotal++;
    }
  }

  // 4. Sync live Meta Ad Campaigns
  const campRes = await fetch(
    `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,insights{impressions,clicks,spend}&limit=50&access_token=${encodeURIComponent(userToken)}`
  );
  const campJson = await campRes.json();
  const allDbLeads = await db.collection('leads').find({}).toArray();

  const updatedForms = allForms.map(f => ({
    formId: String(f.id),
    formName: f.name,
    status: f.status,
    pageName: 'Kisan Choice',
    platform: 'Facebook & Instagram Lead Ads',
    campaignName: f.name || '',
    distributionRule: 'ROUND_ROBIN',
    assignedTeam: 'North Region Sales',
    assignedCallerId: '',
    assignedCallerName: 'Auto Round-Robin',
    active: f.status === 'ACTIVE',
    leadsCaptured: Number(f.leads_count) || 0,
    lastSyncAt: new Date()
  }));

  const updateSet = {
    metaForms: updatedForms,
    'metaConfig.lastSyncAt': new Date(),
    connectedIntegrations: []
  };

  if (Array.isArray(campJson.data)) {
    updateSet.metaCampaigns = campJson.data.map(c => {
      const ins = Array.isArray(c.insights?.data) && c.insights.data[0] ? c.insights.data[0] : {};
      const cLower = String(c.name || '').toLowerCase();
      const matchedCount = allDbLeads.filter(l => {
        const lc = String(l.campaign_name || '').toLowerCase();
        return lc && (lc === cLower || lc.includes(cLower) || cLower.includes(lc));
      }).length;
      return {
        campaignId: String(c.id),
        name: c.name,
        status: c.status || 'PAUSED',
        objective: c.objective || 'OUTCOME_LEADS',
        dailyBudget: c.daily_budget ? Math.round(Number(c.daily_budget) / 100) : 0,
        spend: ins.spend ? Number(ins.spend) : 0,
        impressions: ins.impressions ? Number(ins.impressions) : 0,
        clicks: ins.clicks ? Number(ins.clicks) : 0,
        leadsCount: matchedCount,
        assignedTeam: 'North Region Sales',
        distributionRule: 'ROUND_ROBIN',
        linkedFormId: updatedForms[0]?.formId || '',
        linkedFormName: updatedForms[0]?.formName || '',
        lastSyncAt: new Date()
      };
    });
  }

  await db.collection('systemsettings').updateOne({ key: 'global' }, { $set: updateSet });
  console.log(`Sync complete. Newly inserted leads: ${syncedTotal}. Total leads in DB: ${allDbLeads.length + syncedTotal}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
