import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://kisandeveloper2_db_user:djAI9PymI5218cDJ@ac-5a6srvg-shard-00-00.kqatqru.mongodb.net:27017,ac-5a6srvg-shard-00-01.kqatqru.mongodb.net:27017,ac-5a6srvg-shard-00-02.kqatqru.mongodb.net:27017/?ssl=true&replicaSet=atlas-b6w25z-shard-0&authSource=admin&appName=call-app';
const token = process.env.META_PAGE_ACCESS_TOKEN || 'EAAOUCzEKyHQBSZCcGMZA5ZCZBmMjYC16qJMxGsy2LVGtipZBu7ZBGt7xf2SQGYN3kNmCAz160rZC1wUzShD3Nq3XRu57r3vMeDQpPztnANBWfdFtrKHrmsuBD5CO0Yzz9comg4uZApGJhVGH3gkAYsFnktuZBmlCaLBTy9H7Y5nIPsL9ZBuZBwAlAZAu09G2Q7k7jB6h6FqwkLPxdoL3TpBQZBtziQoWZC39qo4vYGFcqi83Pjy0MZD';

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
  return cleaned.slice(-10);
}

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('Connected to MongoDB. Purging all dummy/mock leads...');

  // 1. Delete all mock/synthetic leads
  const purgeResult = await db.collection('leads').deleteMany({
    $or: [
      { name: { $regex: 'Kisan Shakti|Chambal Valley|Malwa Agro|Cache Invalidation|Sample|Demo|Test Prospect', $options: 'i' } },
      { mobile: { $in: ['9655769907', '9248996230', '9376810729', '9764406383', '9219053587', '9698731184', '9988776655'] } },
      { lead_source: { $nin: ['Facebook Meta Lead Ads', 'Meta Lead Ads'] } }
    ]
  });
  console.log(`Purged ${purgeResult.deletedCount} dummy/mock leads from database.`);

  // 2. Fetch telecallers for round-robin assignment
  const telecallers = await db.collection('users').find({ role: 'telecaller' }).sort({ _id: 1 }).toArray();
  console.log(`Found ${telecallers.length} active telecallers.`);

  // 3. Fetch real leads from Meta Graph API for top Kisan Choice forms
  const targetForms = [
    { formId: '1768141694308234', formName: 'Mirzapur 1 =9/2026, 16:00', campaign: 'Sales - Mirzapur 1 =9/2026, 16:00' },
    { formId: '1384454570064403', formName: 'telecaler hiring', campaign: 'Kisan Choice - Telecaller Recruitment' },
    { formId: '1037907875754044', formName: 'muzafarpur, Darbhanga, Maharajganj, Devariya', campaign: 'muzafarpur, Darbhanga, Maharajganj, Devariya' },
    { formId: '1691453441923930', formName: 'Agra', campaign: 'Agra Field Sales Hiring - Leads' }
  ];

  let syncedTotal = 0;
  let callerIdx = 0;

  for (const form of targetForms) {
    try {
      console.log(`Fetching leads for form: ${form.formName} (${form.formId})...`);
      const res = await fetch(`https://graph.facebook.com/v21.0/${form.formId}/leads?fields=id,created_time,field_data&limit=25&access_token=${token}`);
      const data = await res.json();

      if (data.error) {
        console.warn(`Graph API error for form ${form.formId}:`, data.error.message);
        continue;
      }

      const leadsData = data.data || [];
      console.log(`Found ${leadsData.length} leads in form ${form.formName}.`);

      for (const item of leadsData) {
        const fieldMap = {};
        for (const fd of (item.field_data || [])) {
          const val = (Array.isArray(fd.values) && fd.values.length > 0) ? fd.values[0] : '';
          const nameLower = (fd.name || '').toLowerCase();
          if (nameLower.includes('name')) fieldMap.name = val;
          else if (nameLower.includes('phone') || nameLower.includes('mobile')) fieldMap.mobile = val;
          else if (nameLower.includes('city')) fieldMap.city = val;
          else if (nameLower.includes('state')) fieldMap.state = val;
          else if (nameLower.includes('email')) fieldMap.email = val;
          else if (nameLower.includes('inbox')) fieldMap.inbox_url = val;
          else if (nameLower.includes('business') || nameLower.includes('जुड़ना')) fieldMap.business_type = val;
          else fieldMap.notes = val;
        }

        const phone = sanitizePhone(fieldMap.mobile);
        if (!phone || phone.length < 10) continue;

        // Check if lead already exists in DB
        const exists = await db.collection('leads').findOne({
          $or: [
            { mobile: phone },
            { notes: { $regex: item.id } }
          ]
        });

        if (exists) {
          console.log(`Lead already exists: ${fieldMap.name || 'Unnamed'} (${phone})`);
          continue;
        }

        const assignedCaller = telecallers.length > 0 ? telecallers[callerIdx % telecallers.length] : null;
        callerIdx++;

        // Get max lead_id
        const lastLead = await db.collection('leads').findOne({}, { sort: { _id: -1 } });
        let nextNum = 8241;
        if (lastLead?.lead_id && /^L-\d+$/.test(lastLead.lead_id)) {
          nextNum = parseInt(lastLead.lead_id.replace('L-', ''), 10) + 1;
        }

        const newLead = {
          lead_id: `L-${nextNum}`,
          name: fieldMap.name || 'Meta Ad Lead',
          mobile: phone,
          email: fieldMap.email || '',
          city: fieldMap.city || 'Indore',
          state: fieldMap.state || 'Madhya Pradesh',
          business_type: fieldMap.business_type || 'Distributor',
          product_interest: 'Mustard Oil (15L Tin)',
          lead_source: 'Facebook Meta Lead Ads',
          campaign_name: form.campaign,
          status: 'Assigned',
          priority: 'Normal',
          tags: [],
          assigned_to: assignedCaller ? assignedCaller._id : null,
          assigned_at: new Date(),
          first_contacted_at: null,
          last_contacted_at: null,
          call_attempts: 0,
          notes: `Real Meta Lead Ads Ingestion • Form: "${form.formName}" (${form.formId}) • Lead ID: ${item.id}${fieldMap.inbox_url ? ` • Inbox: ${fieldMap.inbox_url}` : ''}`,
          createdAt: new Date(item.created_time || Date.now()),
          updatedAt: new Date()
        };

        await db.collection('leads').insertOne(newLead);
        syncedTotal++;
        console.log(`✓ Inserted real lead: ${newLead.name} (${newLead.mobile}) assigned to ${assignedCaller?.name || 'Unassigned'}`);
      }
    } catch (err) {
      console.error(`Error processing form ${form.formId}:`, err.message);
    }
  }

  const finalLeads = await db.collection('leads').find({}).sort({ _id: -1 }).limit(10).toArray();
  const finalCount = await db.collection('leads').countDocuments();
  console.log(`\nSync finished! Total leads in database: ${finalCount}`);
  console.log('Top 10 leads:', finalLeads.map(l => ({ id: l.lead_id, name: l.name, phone: l.mobile, campaign: l.campaign_name })));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
