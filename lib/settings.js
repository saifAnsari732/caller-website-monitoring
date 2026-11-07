import SystemSetting from './models/SystemSetting.js';
import Lead from './models/Lead.js';
import User from './models/User.js';
import Call from './models/Call.js';
import Followup from './models/Followup.js';

export const DEFAULT_META_FORMS = [
  {
    formId: '1768141694308234',
    formName: 'Mirzapur 1 =9/2026, 16:00',
    pageName: 'Kisan Choice',
    platform: 'Facebook & Instagram Lead Ads',
    campaignAction: 'existing',
    campaignName: 'Sales - Mirzapur 1 =9/2026, 16:00',
    distributionRule: 'ROUND_ROBIN',
    assignedTeam: 'North Region Sales',
    assignedCallerId: '',
    assignedCallerName: 'Auto Round-Robin',
    customizeFields: true,
    fieldMapping: {
      full_name: 'name',
      phone_number: 'mobile',
      email: 'email',
      city: 'city',
      inbox_url: 'notes'
    },
    active: true,
    leadsCaptured: 14,
    lastLeadAt: new Date()
  },
  {
    formId: '1384454570064403',
    formName: 'telecaler hiring',
    pageName: 'Kisan Choice',
    platform: 'Facebook & Instagram Lead Ads',
    campaignAction: 'new',
    campaignName: 'Kisan Choice - Telecaller Recruitment',
    distributionRule: 'ROUND_ROBIN',
    assignedTeam: 'North Region Sales',
    assignedCallerId: '',
    assignedCallerName: 'Auto Round-Robin',
    customizeFields: true,
    fieldMapping: {
      full_name: 'name',
      phone: 'mobile',
      email: 'email',
      city: 'city'
    },
    active: true,
    leadsCaptured: 253,
    lastLeadAt: new Date()
  },
  {
    formId: '1037907875754044',
    formName: 'muzafarpur, Darbhanga, Maharajganj, Devariya',
    pageName: 'Kisan Choice',
    platform: 'Facebook & Instagram Lead Ads',
    campaignAction: 'existing',
    campaignName: 'muzafarpur, Darbhanga, Maharajganj, Devariya',
    distributionRule: 'ROUND_ROBIN',
    assignedTeam: 'North Region Sales',
    assignedCallerId: '',
    assignedCallerName: 'Auto Round-Robin',
    customizeFields: true,
    fieldMapping: {
      full_name: 'name',
      phone: 'mobile',
      email: 'email',
      city: 'city',
      'आप_किस_रूप_में_जुड़ना_चाहते_हैं?': 'business_type'
    },
    active: true,
    leadsCaptured: 3718,
    lastLeadAt: new Date()
  },
  {
    formId: '1691453441923930',
    formName: 'Agra',
    pageName: 'Kisan Choice',
    platform: 'Facebook & Instagram Lead Ads',
    campaignAction: 'existing',
    campaignName: 'Agra Field Sales Hiring – Leads',
    distributionRule: 'ROUND_ROBIN',
    assignedTeam: 'North Region Sales',
    assignedCallerId: '',
    assignedCallerName: 'Auto Round-Robin',
    active: true,
    leadsCaptured: 15,
    lastLeadAt: new Date()
  },
  {
    formId: '1068146349468230',
    formName: 'Mirzapur-copy',
    pageName: 'Kisan Choice',
    platform: 'Facebook & Instagram Lead Ads',
    campaignAction: 'existing',
    campaignName: 'Mirzapur-copy',
    distributionRule: 'ROUND_ROBIN',
    assignedTeam: 'North Region Sales',
    assignedCallerId: '',
    assignedCallerName: 'Auto Round-Robin',
    active: true,
    leadsCaptured: 0,
    lastLeadAt: new Date()
  },
  {
    formId: '2386564688502797',
    formName: 'Distributor Forms-303',
    pageName: 'Kisan Choice',
    platform: 'Facebook & Instagram Lead Ads',
    campaignAction: 'existing',
    campaignName: 'Distributor Forms-303',
    distributionRule: 'ROUND_ROBIN',
    assignedTeam: 'Bulk Lubricants Ops',
    assignedCallerId: '',
    assignedCallerName: 'Auto Round-Robin',
    active: true,
    leadsCaptured: 12,
    lastLeadAt: new Date()
  }
];

export const DEFAULT_CONNECTED_INTEGRATIONS = [];

export async function getOrInitSettings() {
  const defaultAppId = process.env.META_APP_ID || '1007200718473332';
  const defaultPageId = process.env.META_PAGE_ID || '933429549844450';
  const defaultPageName = process.env.META_PAGE_NAME || 'Kisan Choice';
  const defaultAdAccountId = process.env.META_AD_ACCOUNT_ID || 'act_1796071777698019';
  const defaultToken = process.env.META_PAGE_ACCESS_TOKEN || '';
  const defaultVerify = process.env.META_VERIFY_TOKEN || 'OILFLOW_CRM_SECRET_2026';

  let settings = await SystemSetting.findOne({ key: 'global' });
  if (!settings) {
    settings = await SystemSetting.create({
      key: 'global',
      distributionStrategy: 'ROUND_ROBIN',
      slaThresholdMinutes: 15,
      metaConfig: {
        connected: true,
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
      metaForms: DEFAULT_META_FORMS,
      connectedIntegrations: [],
      campaignGoals: [
        {
          campaignId: '120247618442240711',
          campaignName: 'Lucknow Video Editor Hiring - WhatsApp Leads',
          targetLeadsDaily: 15,
          targetCostPerLead: 20,
          targetMonthlyBudget: 9000,
          slaTargetMinutes: 15,
          conversionRateTarget: 15,
          notes: 'High conversion rate candidate pipeline'
        },
        {
          campaignId: '120247470180940711',
          campaignName: 'Deoria',
          targetLeadsDaily: 25,
          targetCostPerLead: 25,
          targetMonthlyBudget: 18000,
          slaTargetMinutes: 15,
          conversionRateTarget: 12,
          notes: 'Eastern UP distributor expansion'
        }
      ],
      customCampaigns: [
        {
          name: 'Lucknow Video Editor Hiring - WhatsApp Leads',
          platform: 'META ADS',
          formName: 'telecaler hiring',
          team: 'North Region Sales',
          rule: 'Round-Robin',
          status: 'ACTIVE',
          dailyBudget: 300
        },
        {
          name: 'Deoria',
          platform: 'META ADS',
          formName: 'muzafarpur, Darbhanga, Maharajganj, Devariya',
          team: 'North Region Sales',
          rule: 'Load-Balanced',
          status: 'ACTIVE',
          dailyBudget: 250
        }
      ],
      routingRules: [
        {
          name: 'Facebook Meta Ads — Auto Round-Robin',
          source: 'Facebook Meta Lead Ads',
          matchField: 'state',
          matchValue: 'Uttar Pradesh',
          strategy: 'Cyclic Round-Robin',
          targetTeam: 'North Region Sales',
          active: true
        },
        {
          name: 'Distributor & Bulk Inquiries — Load Balanced',
          source: 'ALL',
          matchField: 'business_type',
          matchValue: 'Distributor',
          strategy: 'Load Balanced',
          targetTeam: 'Bulk Lubricants Ops',
          active: true
        }
      ],
      templates: [
        {
          type: 'WHATSAPP',
          name: 'Initial Lead Welcome & Product Specs',
          category: 'Welcome',
          content: 'Namaste {{lead_name}} ji! Thank you for inquiring with Kisan Choice. Main {{agent_name}} bol raha hoon. Aapko rate list aur details bhej raha hoon.',
          variables: ['lead_name', 'product_interest', 'agent_name'],
          usageCount: 248
        },
        {
          type: 'WHATSAPP',
          name: 'Not Connected / Missed Call Follow-up',
          category: 'Follow-up',
          content: 'Namaste {{lead_name}} ji, humne aapko Kisan Choice inquiry ke liye call kiya tha par baat nahi ho paayi. Kripya free hokar is number par reply ya call back karein. - {{agent_name}}',
          variables: ['lead_name', 'agent_name'],
          usageCount: 182
        }
      ],
      teams: [
        {
          name: 'North Region Sales',
          code: 'NRS-01',
          leadName: 'Amit Sharma',
          leadMobile: '9876543211',
          campaigns: ['Lucknow Video Editor Hiring', 'Deoria']
        },
        {
          name: 'Bulk Lubricants Ops',
          code: 'BLO-02',
          leadName: 'Priya Patel',
          leadMobile: '9876543212',
          campaigns: ['Distributor Bulk Inquiries']
        },
        {
          name: 'Field Ops & Followup',
          code: 'FOF-03',
          leadName: 'Rohan Das',
          leadMobile: '9876543213',
          campaigns: ['Field Sales Hiring']
        }
      ]
    });
  } else {
    let dirty = false;
    if (!settings.metaConfig || settings.metaConfig.pageId !== defaultPageId) {
      settings.metaConfig = {
        connected: true,
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
    if (!settings.metaForms || settings.metaForms.length === 0 || settings.metaForms.some(f => f.formId?.startsWith('meta_form_'))) {
      settings.metaForms = DEFAULT_META_FORMS;
      dirty = true;
    }
    // Remove all non-meta integrations
    if (settings.connectedIntegrations && settings.connectedIntegrations.length > 0) {
      settings.connectedIntegrations = [];
      dirty = true;
    }
    if (dirty) await settings.save();
  }

  await ensureInitialCRMData();
  return settings;
}

let isSeedingCRM = false;

export async function ensureInitialCRMData() {
  if (isSeedingCRM) return;
  try {
    isSeedingCRM = true;

    // Ensure real telecallers across all teams exist
    const desiredCallers = [
      {
        name: 'Amit Sharma',
        mobile: '9876543211',
        email: 'amit.sharma@kisanconnect.com',
        employee_id: 'EMP101',
        team: 'North Region Sales',
        shift_status: 'Clocked In',
        daily_call_target: 50,
        daily_conversion_target: 6
      },
      {
        name: 'Priya Patel',
        mobile: '9876543212',
        email: 'priya.patel@kisanconnect.com',
        employee_id: 'EMP102',
        team: 'Bulk Lubricants Ops',
        shift_status: 'Clocked In',
        daily_call_target: 50,
        daily_conversion_target: 5
      },
      {
        name: 'Rohan Das',
        mobile: '9876543213',
        email: 'rohan.das@kisanconnect.com',
        employee_id: 'EMP103',
        team: 'Field Ops & Followup',
        shift_status: 'Clocked In',
        daily_call_target: 45,
        daily_conversion_target: 5
      },
      {
        name: 'Vikram Rathore',
        mobile: '9876543214',
        email: 'vikram.rathore@kisanconnect.com',
        employee_id: 'EMP104',
        team: 'North Region Sales',
        shift_status: 'On Break',
        daily_call_target: 50,
        daily_conversion_target: 5
      }
    ];

    for (const dc of desiredCallers) {
      let existing = await User.findOne({ mobile: dc.mobile });
      if (!existing) {
        await User.create({
          ...dc,
          password: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8D0R5w7E/p2wV8hH5pL3s7E2K1b2G.',
          role: 'telecaller',
          status: 'active',
          on_leave: false,
          last_clock_in: new Date(Date.now() - 2 * 3600 * 1000),
          last_active_at: new Date()
        });
      } else {
        existing.team = existing.team || dc.team;
        existing.shift_status = existing.shift_status || dc.shift_status;
        existing.employee_id = existing.employee_id || dc.employee_id;
        await existing.save();
      }
    }
  } catch (err) {
    console.error('ensureInitialCRMData error:', err);
  } finally {
    isSeedingCRM = false;
  }
}
