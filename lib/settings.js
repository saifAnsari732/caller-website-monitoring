import SystemSetting from './models/SystemSetting.js';

export const DEFAULT_META_FORMS = [];
export const DEFAULT_CONNECTED_INTEGRATIONS = [];

export async function fetchLiveMetaFormsFromGraph(pageId, pageName, accessToken) {
  if (!pageId || !accessToken) return [];
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=50&access_token=${encodeURIComponent(accessToken)}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map((f) => ({
      formId: String(f.id),
      formName: f.name || `Lead Form ${f.id}`,
      pageName: pageName || 'Kisan Choice',
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
  } catch (err) {
    console.error('fetchLiveMetaFormsFromGraph error:', err.message);
    return [];
  }
}

export async function getOrInitSettings() {
  const defaultAppId = process.env.META_APP_ID || '1007200718473332';
  const defaultPageId = process.env.META_PAGE_ID || '933429549844450';
  const defaultPageName = process.env.META_PAGE_NAME || 'Kisan Choice';
  const defaultAdAccountId = process.env.META_AD_ACCOUNT_ID || 'act_1796071777698019';
  const defaultToken = process.env.META_PAGE_ACCESS_TOKEN || '';
  const defaultVerify = process.env.META_VERIFY_TOKEN || 'KISAN_META_WEBHOOK_VERIFY';

  let settings = await SystemSetting.findOne({ key: 'global' });
  if (!settings) {
    const liveForms = await fetchLiveMetaFormsFromGraph(defaultPageId, defaultPageName, defaultToken);
    settings = await SystemSetting.create({
      key: 'global',
      distributionStrategy: 'ROUND_ROBIN',
      slaThresholdMinutes: 15,
      metaConfig: {
        connected: Boolean(defaultToken),
        appId: defaultAppId,
        pageId: defaultPageId,
        pageName: defaultPageName,
        adAccountId: defaultAdAccountId,
        accessToken: defaultToken,
        verifyToken: defaultVerify,
        webhookSubscribed: true,
        autoSyncEnabled: true,
        zeroLossFallback: true,
        connectedAt: new Date(),
        lastSyncAt: new Date()
      },
      metaForms: liveForms,
      connectedIntegrations: [],
      campaignGoals: [],
      customCampaigns: [],
      routingRules: [],
      templates: [],
      teams: []
    });
  } else {
    let dirty = false;
    if (!settings.metaConfig || settings.metaConfig.pageId !== defaultPageId) {
      settings.metaConfig = {
        connected: Boolean(defaultToken || settings.metaConfig?.accessToken),
        appId: defaultAppId,
        pageId: defaultPageId,
        pageName: defaultPageName,
        adAccountId: defaultAdAccountId,
        accessToken: defaultToken || settings.metaConfig?.accessToken || '',
        verifyToken: defaultVerify,
        webhookSubscribed: true,
        autoSyncEnabled: true,
        zeroLossFallback: true,
        connectedAt: settings.metaConfig?.connectedAt || new Date(),
        lastSyncAt: new Date()
      };
      dirty = true;
    }

    const activeToken = settings.metaConfig?.accessToken || defaultToken;
    if ((!settings.metaForms || settings.metaForms.length === 0) && activeToken) {
      const liveForms = await fetchLiveMetaFormsFromGraph(defaultPageId, defaultPageName, activeToken);
      if (liveForms.length > 0) {
        settings.metaForms = liveForms;
        dirty = true;
      }
    }

    if (settings.connectedIntegrations && settings.connectedIntegrations.length > 0) {
      settings.connectedIntegrations = [];
      dirty = true;
    }

    if (dirty) await settings.save();
  }

  return settings;
}

export async function ensureInitialCRMData() {
  return;
}
