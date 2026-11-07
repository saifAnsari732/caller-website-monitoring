import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please specify MONGODB_URI environment variable before running this script.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const realForms = [
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
      fieldMapping: { full_name: 'name', phone_number: 'mobile', email: 'email', city: 'city', inbox_url: 'notes' },
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
      fieldMapping: { full_name: 'name', phone: 'mobile', email: 'email', city: 'city' },
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
      fieldMapping: { full_name: 'name', phone: 'mobile', email: 'email', city: 'city', 'आप_किस_रूप_में_जुड़ना_चाहते_हैं?': 'business_type' },
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

  await db.collection('systemsettings').updateOne(
    { key: 'global' },
    {
      $set: {
        'metaConfig.pageId': '933429549844450',
        'metaConfig.pageName': 'Kisan Choice',
        'metaConfig.appId': '1007200718473332',
        'metaConfig.adAccountId': 'act_1796071777698019',
        'metaConfig.connected': true,
        metaForms: realForms,
        connectedIntegrations: []
      }
    }
  );

  const delNonMeta = await db.collection('leads').deleteMany({
    lead_source: { $in: ['IndiaMART', 'Website Lead Form', 'JustDial', 'TradeIndia', 'WhatsApp API', 'Google Sheets'] }
  });
  console.log('Deleted non-meta mock leads:', delNonMeta.deletedCount);

  const delFake = await db.collection('leads').deleteMany({
    mobile: { $in: ['invalid-phone', '0000000000'] }
  });
  console.log('Deleted invalid test leads:', delFake.deletedCount);

  console.log('Database cleanup completed successfully!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
