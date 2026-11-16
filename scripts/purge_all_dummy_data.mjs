import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI in environment.');
  process.exit(1);
}

async function purgeAllDummyData() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('--- Step 1: Pre-Purge Diagnostics ---');
  const preLeads = await db.collection('leads').countDocuments();
  const preActivities = await db.collection('leadactivities').countDocuments();
  const preNotifications = await db.collection('notifications').countDocuments();
  const preCalls = await db.collection('calls').countDocuments();
  const preFollowups = await db.collection('followups').countDocuments();

  console.log(`Leads in DB: ${preLeads}`);
  console.log(`Activities in DB: ${preActivities}`);
  console.log(`Notifications in DB: ${preNotifications}`);
  console.log(`Calls in DB: ${preCalls}`);
  console.log(`Follow-ups in DB: ${preFollowups}`);

  console.log('--- Step 2: Purging Dummy / Test Data ---');
  const delLeads = await db.collection('leads').deleteMany({});
  const delActivities = await db.collection('leadactivities').deleteMany({});
  const delNotifications = await db.collection('notifications').deleteMany({});
  const delCalls = await db.collection('calls').deleteMany({});
  const delFollowups = await db.collection('followups').deleteMany({});

  console.log(`Deleted leads: ${delLeads.deletedCount}`);
  console.log(`Deleted leadactivities: ${delActivities.deletedCount}`);
  console.log(`Deleted notifications: ${delNotifications.deletedCount}`);
  console.log(`Deleted calls: ${delCalls.deletedCount}`);
  console.log(`Deleted followups: ${delFollowups.deletedCount}`);

  console.log('--- Step 3: Resetting Lead Counters & Round-Robin States ---');
  // Reset leadId counter to 10000 (first real lead will be L-10001)
  await db.collection('counters').updateOne(
    { _id: 'leadId' },
    { $set: { seq: 10000 } },
    { upsert: true }
  );
  // Reset all round-robin distribution counters
  const delCounters = await db.collection('counters').deleteMany({ _id: { $regex: /^rr_/ } });
  console.log(`Reset leadId counter to 10000. Cleared ${delCounters.deletedCount} round-robin tracker counters.`);

  console.log('--- Step 4: Resetting Form & Integration Metrics in Settings & SystemSettings ---');
  // Update systemsettings
  const sysSettings = await db.collection('systemsettings').findOne({ key: 'global' });
  if (sysSettings) {
    const updatedMetaForms = (sysSettings.metaForms || []).map(f => ({
      ...f,
      leadsCaptured: 0,
      lastLeadAt: null
    }));
    await db.collection('systemsettings').updateOne(
      { key: 'global' },
      {
        $set: {
          metaForms: updatedMetaForms,
          neodoveConfig: {
            enabled: false,
            webhookUrl: '',
            apiKey: '',
            secretToken: '',
            autoSync: false,
            syncLeadStages: false,
            lastInboundAt: null,
            lastOutboundAt: null,
            leadsCaptured: 0,
            leadsSyncedOut: 0
          },
          'websiteWebhookConfig.secretToken': '',
          'websiteWebhookConfig.leadsCaptured': 0,
          'websiteWebhookConfig.lastLeadAt': null,
          connectedIntegrations: []
        }
      }
    );
    console.log('Reset systemsettings metrics.');
  }

  // Update settings
  const settings = await db.collection('settings').findOne({});
  if (settings) {
    const updatedMetaForms = (settings.metaForms || []).map(f => ({
      ...f,
      leadsCaptured: 0,
      lastLeadAt: null
    }));
    await db.collection('settings').updateOne(
      { _id: settings._id },
      {
        $set: {
          metaForms: updatedMetaForms,
          neodoveConfig: {
            enabled: false,
            webhookUrl: '',
            apiKey: '',
            secretToken: '',
            autoSync: false,
            syncLeadStages: false,
            lastInboundAt: null,
            lastOutboundAt: null,
            leadsCaptured: 0,
            leadsSyncedOut: 0
          },
          'websiteWebhookConfig.secretToken': '',
          'websiteWebhookConfig.leadsCaptured': 0,
          'websiteWebhookConfig.lastLeadAt': null,
          connectedIntegrations: []
        }
      }
    );
    console.log('Reset settings metrics.');
  }

  console.log('--- Step 5: Post-Purge Verification ---');
  const postLeads = await db.collection('leads').countDocuments();
  const postActivities = await db.collection('leadactivities').countDocuments();
  const postNotifications = await db.collection('notifications').countDocuments();
  const postCalls = await db.collection('calls').countDocuments();
  const postUsers = await db.collection('users').countDocuments();

  console.log(`Remaining Leads: ${postLeads} (Expected: 0)`);
  console.log(`Remaining Activities: ${postActivities} (Expected: 0)`);
  console.log(`Remaining Notifications: ${postNotifications} (Expected: 0)`);
  console.log(`Remaining Calls: ${postCalls} (Expected: 0)`);
  console.log(`Active Real Users Intact: ${postUsers} (Expected: 4)`);

  await mongoose.disconnect();
  console.log('✅ Clean slate purge completed successfully.');
}

purgeAllDummyData().catch(err => {
  console.error('Purge error:', err);
  process.exit(1);
});
