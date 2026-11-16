/**
 * Live HTTP Integration Test Suite
 * Executes real HTTP fetch requests against Next.js production server on http://localhost:3008
 */

const BASE_URL = 'http://localhost:3008';
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

async function runLiveTests() {
  console.log('\n======================================================');
  console.log(' STARTING LIVE HTTP API VERIFICATION ON PORT 3008');
  console.log('======================================================\n');

  // TEST 1: GET /api/webhooks/neodove
  console.log('--- TEST 1: NeoDove Inbound Webhook Health ---');
  const res1 = await fetch(`${BASE_URL}/api/webhooks/neodove`);
  const data1 = await res1.json();
  assert(res1.status === 200, 'GET /api/webhooks/neodove returns status 200');
  assert(data1.status === 'active', 'data1.status is "active"');
  assert(data1.provider === 'NeoDove CRM Inbound Gateway', 'Provider name verified');
  assert(data1.dualWebhookEnabled === true, 'dualWebhookEnabled is true');

  // TEST 2: POST /api/webhooks/neodove
  console.log('\n--- TEST 2: Ingest Real Lead via NeoDove Webhook ---');
  const neoPhone = `9826${Date.now().toString().slice(-6)}`;
  const res2 = await fetch(`${BASE_URL}/api/webhooks/neodove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Radhe Shyam (Distributor)',
      mobile: neoPhone,
      email: 'radheshyam@example.com',
      city: 'Gwalior',
      state: 'Madhya Pradesh',
      campaign_name: 'NeoDove Oil Launch Inflow',
      stage: 'Interested',
      deal_amount: 50000,
      neodove_lead_id: `ND-${Date.now()}`,
      notes: 'Wants exclusive distribution rights for Gwalior Chambal division.'
    })
  });
  const data2 = await res2.json();
  assert(res2.status === 201, 'POST /api/webhooks/neodove returned HTTP 201 Created');
  assert(data2.success === true, 'data2.success is true');
  assert(data2.count === 1, 'data2.count is 1');
  const neoLeadId = data2.results?.[0]?.lead_id;
  assert(Boolean(neoLeadId), `Lead ingested with sequence ID: ${neoLeadId}`);
  assert(Boolean(data2.results?.[0]?.assigned_to), `Lead auto-assigned to telecaller: ${data2.results?.[0]?.assigned_to}`);

  // TEST 3: Duplicate detection on NeoDove Webhook
  console.log('\n--- TEST 3: NeoDove Deduplication Check ---');
  const res3 = await fetch(`${BASE_URL}/api/webhooks/neodove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Radhe Shyam (Duplicate)',
      mobile: neoPhone,
      stage: 'Follow-up',
      notes: 'Second submission from NeoDove'
    })
  });
  const data3 = await res3.json();
  assert(data3.results?.[0]?.status === 'DUPLICATE_UPDATED', 'Duplicate correctly flagged and updated without creating duplicate doc');

  // TEST 4: GET /api/webhooks/leads (Universal Website Webhook)
  console.log('\n--- TEST 4: Universal Website Webhook Health ---');
  const res4 = await fetch(`${BASE_URL}/api/webhooks/leads`);
  const data4 = await res4.json();
  assert(res4.status === 200, 'GET /api/webhooks/leads returns status 200');
  assert(data4.provider.includes('Universal'), 'Provider verified as Universal Website Webhook');

  // TEST 5: POST /api/webhooks/leads (Ingest Website Lead)
  console.log('\n--- TEST 5: Ingest Real Lead via Website Webhook ---');
  const webPhone = `9827${Date.now().toString().slice(-6)}`;
  const res5 = await fetch(`${BASE_URL}/api/webhooks/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Pooja Verma (Organic Prospect)',
      phone_number: webPhone,
      email: 'pooja.verma@example.com',
      location: 'Indore',
      region: 'Madhya Pradesh',
      inquiry_type: 'Trader',
      platform: 'Website Landing Page',
      campaign: 'Google Ads Search'
    })
  });
  const data5 = await res5.json();
  assert(res5.status === 201, 'POST /api/webhooks/leads returned HTTP 201 Created');
  assert(data5.success === true, 'data5.success is true');
  const webLeadId = data5.results?.[0]?.lead_id;
  assert(Boolean(webLeadId), `Website lead generated with sequence ID: ${webLeadId}`);
  assert(Boolean(data5.results?.[0]?.assigned_to), `Website lead assigned to: ${data5.results?.[0]?.assigned_to}`);

  // TEST 6: GET & PUT /api/integrations/neodove (With Auth Protection)
  console.log('\n--- TEST 6: NeoDove Integration API Auth & Configuration ---');
  // 6a: Unauthorized attempt should be rejected
  const resUnauth = await fetch(`${BASE_URL}/api/integrations/neodove`);
  assert(resUnauth.status === 401, 'Unauthenticated GET /api/integrations/neodove correctly rejected with 401');

  // 6b: Authorized GET with API key
  const res6 = await fetch(`${BASE_URL}/api/integrations/neodove`, {
    headers: { 'x-api-key': 'NEODOVE_CRM_SECRET_2026' }
  });
  const data6 = await res6.json();
  assert(res6.status === 200, 'GET /api/integrations/neodove with API key returns HTTP 200');
  assert(data6.config !== undefined, 'NeoDove configuration retrieved');
  assert(data6.inboundWebhookEndpoint === '/api/webhooks/neodove', 'inboundWebhookEndpoint is /api/webhooks/neodove');

  const res7 = await fetch(`${BASE_URL}/api/integrations/neodove`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'NEODOVE_CRM_SECRET_2026'
    },
    body: JSON.stringify({
      webhookUrl: 'https://api.neodove.com/v1/leads/mirror-test',
      autoSync: true,
      enabled: true
    })
  });
  const data7 = await res7.json();
  assert(res7.status === 200, 'PUT /api/integrations/neodove returns HTTP 200');
  assert(data7.success === true, 'data7.success is true');
  assert(data7.config?.enabled === true, 'NeoDove config enabled is true');

  // TEST 7: POST /api/integrations/neodove (Test Outbound Sync Ping)
  console.log('\n--- TEST 7: NeoDove Outbound Sync Ping ---');
  const res8 = await fetch(`${BASE_URL}/api/integrations/neodove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'NEODOVE_CRM_SECRET_2026'
    },
    body: JSON.stringify({ testLead: true })
  });
  const data8 = await res8.json();
  assert(res8.status === 200, 'POST /api/integrations/neodove returns HTTP 200');
  assert(data8.lead_id !== undefined, `Ping lead generated with ID: ${data8.lead_id}`);

  console.log('\n======================================================');
  console.log(` LIVE HTTP RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runLiveTests().catch(err => {
  console.error('Live HTTP Test Exception:', err);
  process.exit(1);
});
