import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import SystemSetting from '../../../lib/models/SystemSetting';
import Lead from '../../../lib/models/Lead';
import User from '../../../lib/models/User';
import { getOrInitSettings, DEFAULT_META_FORMS } from '../../../lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    const [telecallers, leads] = await Promise.all([
      User.find({ role: 'telecaller' }).select('name mobile email employee_id team status on_leave shift_status daily_call_target daily_conversion_target').lean(),
      Lead.find({}).select('lead_source campaign_name status assigned_to business_type city state createdAt').lean()
    ]);

    // Real campaign aggregation from Leads + customCampaigns + metaForms
    const campaignMap = new Map();

    // Seed from customCampaigns and metaForms first
    for (const cc of (settings.customCampaigns || [])) {
      campaignMap.set(cc.name, {
        name: cc.name,
        platform: cc.platform || 'META ADS',
        formName: cc.formName || 'Meta Lead Form',
        team: cc.team || 'North Region Sales',
        rule: cc.rule || 'Round-Robin',
        status: cc.status || 'ACTIVE',
        dailyBudget: cc.dailyBudget || 2500,
        total: 0,
        converted: 0,
        interested: 0,
        fresh: 0
      });
    }

    for (const mf of (settings.metaForms || [])) {
      const cName = mf.campaignName || mf.formName;
      if (!campaignMap.has(cName)) {
        campaignMap.set(cName, {
          name: cName,
          platform: 'META ADS',
          formName: mf.formName,
          team: mf.assignedTeam || 'North Region Sales',
          rule: mf.distributionRule === 'LOAD_BALANCED' ? 'Load-Balanced' : 'Round-Robin',
          status: mf.active ? 'ACTIVE' : 'PAUSED',
          dailyBudget: 3000,
          total: 0,
          converted: 0,
          interested: 0,
          fresh: 0
        });
      }
    }

    for (const l of leads) {
      const key = l.campaign_name && l.campaign_name !== 'Meta Lead Campaign'
        ? l.campaign_name
        : (l.lead_source || 'Facebook Meta Lead Ads');

      if (!campaignMap.has(key)) {
        const isMeta = key.toLowerCase().includes('meta') || key.toLowerCase().includes('facebook') || (l.lead_source || '').toLowerCase().includes('meta');
        campaignMap.set(key, {
          name: key,
          platform: isMeta ? 'META ADS' : 'DIRECT / CRM',
          formName: isMeta ? 'KisanChoice Lead Form 2026' : 'CRM Direct Ingestion',
          team: isMeta ? 'North Region Sales' : 'Field Ops & Followup',
          rule: settings.distributionStrategy === 'LOAD_BALANCED' ? 'Load-Balanced' : 'Round-Robin',
          status: 'ACTIVE',
          dailyBudget: isMeta ? 3000 : 0,
          total: 0,
          converted: 0,
          interested: 0,
          fresh: 0
        });
      }
      const c = campaignMap.get(key);
      c.total += 1;
      if (l.status === 'Closed') c.converted += 1;
      if (['Fresh Lead', 'Assigned'].includes(l.status)) c.fresh += 1;
      if (['Interested', 'Distributor Interested', 'Trader Interested', 'DSS Interested', 'RSS Interested', 'SS Interested', 'Closed'].includes(l.status)) {
        c.interested += 1;
      }
    }

    const campaigns = Array.from(campaignMap.values()).map((c, idx) => ({
      id: `camp-${idx + 1}`,
      ...c,
      rate: c.total > 0 ? `${((c.interested / c.total) * 100).toFixed(1)}%` : '0.0%',
      winRate: c.total > 0 ? `${((c.converted / c.total) * 100).toFixed(1)}%` : '0.0%'
    }));

    return NextResponse.json({
      settings,
      telecallers,
      campaigns,
      totalLeadsCount: leads.length
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const body = await request.json();
    const settings = await getOrInitSettings();

    if (body.distributionStrategy) settings.distributionStrategy = body.distributionStrategy;
    if (body.slaThresholdMinutes !== undefined) settings.slaThresholdMinutes = Number(body.slaThresholdMinutes);
    if (Array.isArray(body.routingRules)) settings.routingRules = body.routingRules;
    if (Array.isArray(body.templates)) settings.templates = body.templates;
    if (Array.isArray(body.teams)) settings.teams = body.teams;
    if (Array.isArray(body.customCampaigns)) settings.customCampaigns = body.customCampaigns;
    if (Array.isArray(body.metaForms)) settings.metaForms = body.metaForms;
    if (body.metaConfig) {
      settings.metaConfig = { ...settings.metaConfig.toObject?.() || settings.metaConfig, ...body.metaConfig };
    }

    await settings.save();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
