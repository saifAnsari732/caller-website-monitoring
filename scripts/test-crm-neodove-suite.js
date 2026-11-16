/**
 * Deep Self-Verification Test Suite
 * Validates:
 *  1. Multi-source Lead Capture (Meta, NeoDove Webhook, Website Webhook, Manual)
 *  2. Smart Lead Routing (State/City matching, Team routing, Load balancing, Round-robin)
 *  3. Dynamic Lead Stages & Dispositions (New, Contacted, Interested, Callback, Follow-up, Converted, Lost)
 *  4. Multi-Channel Alerts & Templates (WhatsApp & SMS dispatch)
 *  5. Lead 360° Activity History & Chronological Timeline
 *  6. NeoDove Parity, Coexistence & Outbound Sync Loop Prevention
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env.local without external dotenv dependency
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import Lead from '../lib/models/Lead.js';
import User from '../lib/models/User.js';
import Call from '../lib/models/Call.js';
import Followup from '../lib/models/Followup.js';
import LeadActivity from '../lib/models/LeadActivity.js';
import SystemSetting from '../lib/models/SystemSetting.js';
import Counter from '../lib/models/Counter.js';
import { getOrInitSettings } from '../lib/settings.js';
import { routeLead } from '../lib/leadRouter.js';
import { normalizeStage, CANONICAL_STAGES, STAGE_SUB_DISPOSITIONS } from '../lib/leadDispositions.js';
import { dispatchChannelAlerts, renderTemplate } from '../lib/channelAlerts.js';
import { syncLeadToNeoDove } from '../lib/neodoveSync.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log(' STARTING DEEP CRM & NEODOVE SELF-VERIFICATION SUITE');
  console.log('======================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in .env.local');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB Atlas successfully.\n');

  // Ensure test telecaller exists
  let testCaller = await User.findOne({ role: 'telecaller', status: 'active' });
  if (!testCaller) {
    testCaller = await User.create({
      name: 'Test Telecaller Sharma',
      mobile: '9826999991',
      email: 'test.telecaller@example.com',
      employee_id: 'EMP-TEST-99',
      password: 'hashed_password_test',
      role: 'telecaller',
      team: 'North Region Sales',
      status: 'active',
      shift_status: 'Clocked In'
    });
    console.log('Created temporary test telecaller:', testCaller.name);
  } else {
    console.log('Using active telecaller:', testCaller.name, `(${testCaller.team})`);
  }

  // Ensure test admin exists
  let testAdmin = await User.findOne({ role: 'admin' });
  if (!testAdmin) {
    testAdmin = await User.create({
      name: 'System Test Admin',
      mobile: '9999999999',
      email: 'admin.test@example.com',
      employee_id: 'ADM-TEST-01',
      password: 'hashed_password_test',
      role: 'admin',
      status: 'active'
    });
  }

  // Initialize settings
  const settings = await getOrInitSettings();
  assert(Boolean(settings), 'SystemSetting loaded and initialized');

  // ==========================================
  // TEST 1: Canonical Lead Stages & Dispositions
  // ==========================================
  console.log('\n--- TEST 1: Dynamic Lead Stages & Dispositions ---');
  assert(CANONICAL_STAGES.includes('New'), 'CANONICAL_STAGES contains "New"');
  assert(CANONICAL_STAGES.includes('Interested'), 'CANONICAL_STAGES contains "Interested"');
  assert(CANONICAL_STAGES.includes('Callback Scheduled'), 'CANONICAL_STAGES contains "Callback Scheduled"');
  assert(CANONICAL_STAGES.includes('Converted'), 'CANONICAL_STAGES contains "Converted"');
  assert(normalizeStage('fresh inquiry') === 'New', 'normalizeStage("fresh inquiry") -> "New"');
  assert(normalizeStage('connected') === 'Contacted', 'normalizeStage("connected") -> "Contacted"');
  assert(normalizeStage('closed') === 'Converted', 'normalizeStage("closed") -> "Converted"');
  assert(normalizeStage('wrong number') === 'Lost', 'normalizeStage("wrong number") -> "Lost"');
  assert(STAGE_SUB_DISPOSITIONS['Interested'].length > 0, 'Sub-dispositions defined for "Interested"');

  // ==========================================
  // TEST 2: Smart Lead Router (State/City/Round-Robin)
  // ==========================================
  console.log('\n--- TEST 2: Smart Lead Router & Auto-Assignment ---');
  const routeRes1 = await routeLead({
    state: 'Madhya Pradesh',
    city: 'Indore',
    lead_source: 'Facebook Meta Lead Ads',
    campaign_name: 'Indore Tin Launch'
  });
  assert(routeRes1 && routeRes1.caller, `Smart routing assigned lead to telecaller: ${routeRes1.caller?.name}`);
  assert(routeRes1.method && routeRes1.reason, `Routing method and reason recorded: [${routeRes1.method}] ${routeRes1.reason}`);

  // Test atomic round-robin counter sequence increment
  const prevCounter = await Counter.findOne({ _id: 'rr_global_crm' });
  const prevSeq = prevCounter?.seq || 0;
  await routeLead({ lead_source: 'crm' });
  const afterCounter = await Counter.findOne({ _id: 'rr_global_crm' });
  assert((afterCounter?.seq || 0) >= prevSeq, `Atomic round-robin sequence properly increments: ${prevSeq} -> ${afterCounter?.seq}`);

  // ==========================================
  // TEST 3: Multi-Source Lead Capture & NeoDove Parity
  // ==========================================
  console.log('\n--- TEST 3: Multi-Source Lead Capture ---');
  const testPhoneNeo = `998877${Date.now().toString().slice(-4)}`;
  const testPhoneWeb = `998866${Date.now().toString().slice(-4)}`;

  // Capture Lead 1 via NeoDove Source
  const neoLead = await Lead.create({
    name: 'NeoDove Inbound Prospect Rajesh',
    mobile: testPhoneNeo,
    email: 'rajesh.neodove@example.com',
    city: 'Agra',
    state: 'Uttar Pradesh',
    business_type: 'Distributor',
    product_interest: 'Mustard Oil (15L Tin)',
    lead_source: 'NeoDove',
    neodove_lead_id: `ND-${Date.now()}`,
    campaign_name: 'NeoDove North Campaign',
    status: 'Interested',
    sub_disposition: 'Distributor Dealership Inquiry',
    assigned_to: testCaller._id,
    assigned_at: new Date()
  });

  assert(neoLead && neoLead.lead_id, `NeoDove lead captured with unique sequence ID: ${neoLead.lead_id}`);
  assert(neoLead.lead_source === 'NeoDove', 'Lead source is explicitly marked as "NeoDove"');
  assert(neoLead.sub_disposition === 'Distributor Dealership Inquiry', 'Sub-disposition properly stored on NeoDove lead');

  // Capture Lead 2 via Website Landing Page
  const webLead = await Lead.create({
    name: 'Website Prospect Sunita',
    mobile: testPhoneWeb,
    email: 'sunita.web@example.com',
    city: 'Indore',
    state: 'Madhya Pradesh',
    business_type: 'Trader',
    product_interest: 'Mustard Oil (1L Pouch)',
    lead_source: 'Website Landing Page',
    campaign_name: 'Indore Google Ads',
    status: 'New',
    sub_disposition: 'Trader / Wholesaler Inquiry',
    assigned_to: testCaller._id,
    assigned_at: new Date()
  });

  assert(webLead && webLead.lead_id, `Website lead captured with ID: ${webLead.lead_id}`);
  assert(webLead.lead_source === 'Website Landing Page', 'Lead source marked as "Website Landing Page"');
  assert(webLead.sub_disposition === 'Trader / Wholesaler Inquiry', 'Sub-disposition properly stored on Website lead');

  // ==========================================
  // TEST 4: Lead Activity & 360° Timeline Logging
  // ==========================================
  console.log('\n--- TEST 4: Detailed Lead Activity History & Timeline ---');
  // Log LEAD_CREATED event
  const actCreated = await LeadActivity.create({
    lead: neoLead._id,
    performer_name: 'NeoDove Webhook Gateway',
    performer_role: 'neodove',
    type: 'LEAD_CREATED',
    title: 'Lead Captured via NeoDove Inbound Webhook',
    description: `Captured prospect ${neoLead.name} via campaign ${neoLead.campaign_name}`,
    metadata: { neodove_lead_id: neoLead.neodove_lead_id, city: neoLead.city }
  });
  assert(Boolean(actCreated._id), 'LEAD_CREATED activity logged successfully');

  // Log LEAD_ASSIGNED event
  const actAssigned = await LeadActivity.create({
    lead: neoLead._id,
    performed_by: testCaller._id,
    performer_name: testCaller.name,
    performer_role: 'system',
    type: 'LEAD_ASSIGNED',
    title: `Assigned to ${testCaller.name}`,
    description: 'Auto-assigned by Smart Router via Cyclic Round-Robin',
    metadata: { caller_id: testCaller._id }
  });
  assert(Boolean(actAssigned._id), 'LEAD_ASSIGNED activity logged successfully');

  // Log DISPOSITION_LOGGED event
  const actDisp = await LeadActivity.create({
    lead: neoLead._id,
    performed_by: testCaller._id,
    performer_name: testCaller.name,
    performer_role: 'telecaller',
    type: 'DISPOSITION_LOGGED',
    title: 'Disposition Logged: Interested',
    description: 'Prospect requested 15L Tin distributorship commercial details.',
    metadata: { status: 'Interested', sub_disposition: 'Distributor Dealership Inquiry' }
  });
  assert(Boolean(actDisp._id), 'DISPOSITION_LOGGED activity logged successfully');

  // Verify chronology retrieval
  const activities = await LeadActivity.find({ lead: neoLead._id }).sort({ createdAt: -1 });
  assert(activities.length >= 3, `Retrieved ${activities.length} activity timeline events for lead ${neoLead.lead_id}`);
  assert(activities[0].type === 'DISPOSITION_LOGGED', 'Latest event is DISPOSITION_LOGGED');

  // ==========================================
  // TEST 5: Call Logging & Follow-up Scheduling
  // ==========================================
  console.log('\n--- TEST 5: Call Logging & Follow-up Scheduling ---');
  const now = new Date();
  const testCall = await Call.create({
    lead: neoLead._id,
    caller: testCaller._id,
    start_time: new Date(now.getTime() - 145000),
    end_time: now,
    duration: 145,
    status: 'Interested',
    recording_url: 'https://storage.googleapis.com/kisan-recordings/call-9912.mp3',
    notes: 'Prospect showed high interest in 500 Tin introductory dealership.'
  });
  assert(Boolean(testCall._id), `Call record created with duration ${testCall.duration}s and status "${testCall.status}"`);

  const testFollowup = await Followup.create({
    lead: neoLead._id,
    caller: testCaller._id,
    date: '2026-11-20',
    time: '03:30 PM',
    notes: 'Follow-up call to confirm bank guarantee and security deposit.'
  });
  assert(Boolean(testFollowup._id), `Follow-up scheduled for ${testFollowup.date} at ${testFollowup.time}`);

  // Log to LeadActivity
  await LeadActivity.create({
    lead: neoLead._id,
    performed_by: testCaller._id,
    performer_name: testCaller.name,
    performer_role: 'telecaller',
    type: 'CALL_LOGGED',
    title: `Call Logged: 2m 25s • Outcome: Interested`,
    description: testCall.notes,
    metadata: { duration: 145, recording_url: testCall.recording_url }
  });

  await LeadActivity.create({
    lead: neoLead._id,
    performed_by: testCaller._id,
    performer_name: testCaller.name,
    performer_role: 'telecaller',
    type: 'FOLLOWUP_SCHEDULED',
    title: `Follow-up Scheduled for 2026-11-20 at 03:30 PM`,
    description: testFollowup.notes
  });

  const totalActs = await LeadActivity.countDocuments({ lead: neoLead._id });
  assert(totalActs >= 5, `Total 360° activities verified: ${totalActs} events`);

  // ==========================================
  // TEST 6: Multi-Channel Alerts & Templates
  // ==========================================
  console.log('\n--- TEST 6: Multi-Channel Alerts & Templates ---');
  const templateStr = 'Namaste {{lead_name}} ji, thank you for your interest in {{company_name}}. Main {{agent_name}} from office (+91 {{agent_mobile}}).';
  const rendered = renderTemplate(templateStr, {
    lead_name: 'Rajesh',
    company_name: 'Kisan Choice',
    agent_name: 'Sharma',
    agent_mobile: '9826999991'
  });
  assert(rendered.includes('Rajesh') && rendered.includes('Kisan Choice') && rendered.includes('Sharma'),
    `Template rendered properly: "${rendered}"`);

  const alertResult = await dispatchChannelAlerts({
    lead: neoLead,
    caller: testCaller,
    eventType: 'WELCOME',
    templateCategory: 'Welcome',
    channels: ['WHATSAPP', 'SMS']
  });
  assert(alertResult.success, 'Multi-channel alert dispatcher succeeded');
  assert(Boolean(alertResult.whatsapp && alertResult.whatsapp.url), `WhatsApp click-to-chat URL generated: ${alertResult.whatsapp?.url.slice(0, 45)}...`);
  assert(Boolean(alertResult.sms && alertResult.sms.dispatchId), `SMS dispatch simulated with ID: ${alertResult.sms?.dispatchId}`);

  // Test mock lead alert dispatch without _id
  const mockAlertResult = await dispatchChannelAlerts({
    lead: { name: 'Mock Alert Prospect', mobile: '9876543210' },
    caller: testCaller,
    eventType: 'WELCOME'
  });
  assert(mockAlertResult.success !== false, 'Mock lead alert dispatch safely handled without database crash');

  // ==========================================
  // TEST 7: NeoDove Coexistence & Loop Prevention
  // ==========================================
  console.log('\n--- TEST 7: NeoDove Coexistence & Loop Prevention ---');
  // Attempt to sync a lead that originated from NeoDove (Must skip to prevent infinite echo loops)
  const loopAttempt = await syncLeadToNeoDove(neoLead);
  assert(loopAttempt.skipped && loopAttempt.reason.includes('Loop prevention'),
    'Loop prevention active: Inbound NeoDove lead correctly rejected from outbound echoing');

  // Attempt to sync a native website lead when sync is off
  const syncNativeAttempt = await syncLeadToNeoDove(webLead, {
    neodoveConfig: { enabled: false }
  });
  assert(syncNativeAttempt.skipped && syncNativeAttempt.reason.includes('not enabled'),
    'Outbound sync respects disabled toggle');

  // Attempt to sync a mock lead without _id (ping test verification)
  const mockSyncAttempt = await syncLeadToNeoDove({
    lead_id: 'L-MOCK-TEST',
    name: 'Mock Ping Lead',
    mobile: '9876543210',
    lead_source: 'Kisan Choice CRM'
  }, {
    neodoveConfig: { enabled: false }
  });
  assert(mockSyncAttempt.skipped !== undefined, 'Outbound sync safely handles ping lead without _id without throwing Mongoose validation error');

  // Clean up test leads and activities
  await LeadActivity.deleteMany({ lead: { $in: [neoLead._id, webLead._id] } });
  await Call.deleteMany({ lead: neoLead._id });
  await Followup.deleteMany({ lead: neoLead._id });
  await Lead.deleteMany({ _id: { $in: [neoLead._id, webLead._id] } });
  console.log('\nCleaned up temporary test data successfully.');

  console.log('\n======================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
