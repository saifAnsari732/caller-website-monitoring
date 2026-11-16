/**
 * HTTP API Handler Direct Verification Suite
 * Invokes Next.js App Router handlers directly to test end-to-end integration:
 *  - /api/webhooks/neodove (GET & POST)
 *  - /api/webhooks/leads (GET & POST)
 *  - /api/integrations/neodove (GET & PUT)
 *  - /api/alerts/dispatch (POST)
 */

import mongoose from 'mongoose';
import { GET as getNeodove, POST as postNeodove } from '../app/api/webhooks/neodove/route.js';
import { GET as getLeadsWebhook, POST as postLeadsWebhook } from '../app/api/webhooks/leads/route.js';
import { GET as getNeodoveIntegration, PUT as putNeodoveIntegration } from '../app/api/integrations/neodove/route.js';
import { POST as postAlertDispatch } from '../app/api/alerts/dispatch/route.js';
import Lead from '../lib/models/Lead.js';
import LeadActivity from '../lib/models/LeadActivity.js';

let passed = 0;
let failed = 0;

function assert(cond, name) {
  if (cond) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

function mockRequest(url, method = 'GET', body = null, headers = {}) {
  const reqInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers
    })
  };
  if (body) {
    reqInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return new Request(url, reqInit);
}

async function runApiTests() {
  console.log('\n======================================================');
  console.log(' STARTING NEXT.JS API HANDLER DIRECT TEST SUITE');
  console.log('======================================================\n');

  // Test 1: GET /api/webhooks/neodove
  console.log('--- TEST 1: NeoDove Webhook Endpoint ---');
  const getNeoReq = mockRequest('http://localhost:3000/api/webhooks/neodove');
  const getNeoRes = await getNeodove(getNeoReq);
  const getNeoData = await getNeoRes.json();
  assert(getNeoRes.status === 200, 'GET /api/webhooks/neodove returns status 200');
  assert(getNeoData.provider === 'NeoDove CRM Inbound Gateway', 'GET /api/webhooks/neodove returns provider');
  assert(getNeoData.dualWebhookEnabled === true, 'dualWebhookEnabled is true');

  // Test 2: POST /api/webhooks/neodove (Inbound Lead Capture)
  const testPhone = `9826${Date.now().toString().slice(-6)}`;
  const postNeoReq = mockRequest('http://localhost:3000/api/webhooks/neodove', 'POST', {
    name: 'Anand Agrawal (Distributor)',
    mobile: testPhone,
    email: 'anand.agrawal@example.com',
    city: 'Gwalior',
    state: 'Madhya Pradesh',
    campaign: 'NeoDove Oil Inflow',
    stage: 'Interested',
    notes: 'Interested in super stockist territory for Gwalior Chambal.'
  });
  const postNeoRes = await postNeodove(postNeoReq);
  const postNeoData = await postNeoRes.json();
  assert(postNeoRes.status === 201, 'POST /api/webhooks/neodove returns status 201 Created');
  assert(postNeoData.success === true, 'Inbound lead ingestion returned success: true');
  assert(postNeoData.count === 1, 'Ingested count is 1');
  const capturedId = postNeoData.results?.[0]?.lead_id;
  assert(Boolean(capturedId), `Lead generated with sequence ID: ${capturedId}`);

  // Verify created lead in DB
  const dbLead = await Lead.findOne({ lead_id: capturedId });
  assert(dbLead && dbLead.lead_source === 'NeoDove', 'DB record verified with lead_source="NeoDove"');
  assert(dbLead.status === 'Interested', 'DB record verified with status="Interested"');

  // Verify timeline activities
  const dbActs = await LeadActivity.find({ lead: dbLead._id });
  assert(dbActs.some(a => a.type === 'LEAD_CREATED'), 'LEAD_CREATED logged in LeadActivity');
  assert(dbActs.some(a => a.type === 'LEAD_ASSIGNED'), 'LEAD_ASSIGNED logged in LeadActivity');

  // Test 3: GET & POST /api/webhooks/leads (Universal Landing Page Ingestion)
  console.log('\n--- TEST 2: Universal Website Webhook Endpoint ---');
  const getWebReq = mockRequest('http://localhost:3000/api/webhooks/leads');
  const getWebRes = await getLeadsWebhook(getWebReq);
  const getWebData = await getWebRes.json();
  assert(getWebRes.status === 200, 'GET /api/webhooks/leads returns status 200');
  assert(getWebData.provider.includes('Universal'), 'Provider identified as Universal Webhook');

  const testWebPhone = `9827${Date.now().toString().slice(-6)}`;
  const postWebReq = mockRequest('http://localhost:3000/api/webhooks/leads', 'POST', {
    full_name: 'Pooja Verma',
    phone_number: testWebPhone,
    email: 'pooja.verma@example.com',
    location: 'Bhopal',
    region: 'Madhya Pradesh',
    inquiry_type: 'Trader',
    platform: 'Website Landing Page',
    campaign: 'Google Ads Search'
  });
  const postWebRes = await postLeadsWebhook(postWebReq);
  const postWebData = await postWebRes.json();
  assert(postWebRes.status === 201, 'POST /api/webhooks/leads returns status 201 Created');
  assert(postWebData.success === true, 'Website lead ingestion returned success: true');
  const webLeadId = postWebData.results?.[0]?.lead_id;
  assert(Boolean(webLeadId), `Website lead created with sequence ID: ${webLeadId}`);

  // Test 4: GET & PUT /api/integrations/neodove
  console.log('\n--- TEST 3: NeoDove Integration Management ---');
  const getIntReq = mockRequest('http://localhost:3000/api/integrations/neodove');
  const getIntRes = await getNeodoveIntegration(getIntReq);
  const getIntData = await getIntRes.json();
  assert(getIntRes.status === 200, 'GET /api/integrations/neodove returns status 200');
  assert(getIntData.config !== undefined, 'NeoDove configuration retrieved');

  const putIntReq = mockRequest('http://localhost:3000/api/integrations/neodove', 'PUT', {
    webhookUrl: 'https://api.neodove.com/v1/mock-test',
    autoSync: true
  });
  const putIntRes = await putNeodoveIntegration(putIntReq);
  const putIntData = await putIntRes.json();
  assert(putIntRes.status === 200, 'PUT /api/integrations/neodove returns status 200');
  assert(putIntData.config?.autoSync === true, 'NeoDove config updated with autoSync: true');

  // Test 5: POST /api/alerts/dispatch
  console.log('\n--- TEST 4: Instant Multi-Channel Alerts Dispatcher ---');
  const alertReq = mockRequest('http://localhost:3000/api/alerts/dispatch', 'POST', {
    leadId: dbLead._id.toString(),
    templateCategory: 'Welcome',
    channels: ['WHATSAPP', 'SMS']
  });
  const alertRes = await postAlertDispatch(alertReq);
  const alertData = await alertRes.json();
  assert(alertRes.status === 200, 'POST /api/alerts/dispatch returns status 200');
  assert(alertData.success === true, 'Alert dispatch succeeded');
  assert(Boolean(alertData.result?.whatsapp?.url), 'WhatsApp click-to-chat URL returned');
  assert(Boolean(alertData.result?.sms?.dispatchId), 'SMS dispatch ID returned');

  // Verify alert activities logged in lead timeline
  const alertActs = await LeadActivity.find({ lead: dbLead._id, type: { $in: ['WHATSAPP_SENT', 'SMS_SENT'] } });
  assert(alertActs.length >= 2, `Alert events logged in LeadActivity: ${alertActs.length} events`);

  // Cleanup test leads
  await LeadActivity.deleteMany({ lead: { $in: [dbLead._id] } });
  await Lead.deleteMany({ _id: { $in: [dbLead._id] } });
  await Lead.deleteOne({ lead_id: webLeadId });
  console.log('\nCleaned up API test records.');

  console.log('\n======================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runApiTests().catch(err => {
  console.error('API Test uncaught error:', err);
  process.exit(1);
});
