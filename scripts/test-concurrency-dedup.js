/**
 * Deep Concurrency, Deduplication & Zero-Loss Ingestion Test Suite
 * Simulates high-throughput concurrent bursts, duplicate payloads,
 * race conditions, sliding-window re-submissions, and DLQ recovery.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env.local
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

import connectDB from '../lib/db.js';
import Lead from '../lib/models/Lead.js';
import User from '../lib/models/User.js';
import LeadActivity from '../lib/models/LeadActivity.js';
import {
  normalizeIndianPhone,
  sanitizeText,
  toTitleCase,
  normalizeEmail,
  withLeadLock,
  ingestLead,
  journalLeadToDisk,
  drainRecoveryQueue,
  getRecoveryQueueStats,
  getActiveLocksCount
} from '../lib/leadIngestionEngine.js';

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
  console.log(' STARTING HIGH-CONCURRENCY & DEDUPLICATION TEST SUITE');
  console.log('======================================================\n');

  await connectDB();
  console.log('Connected to MongoDB Atlas successfully.\n');

  // ------------------------------------------------------------------
  // TEST 1: Phone Normalization & Indian E.164 Cleansing
  // ------------------------------------------------------------------
  console.log('--- TEST 1: Phone Normalization & Indian Mobile Validation ---');
  const p1 = normalizeIndianPhone('+91 98261 23456');
  assert(p1.isValid && p1.clean10 === '9826123456' && p1.e164 === '+919826123456', 'Formats +91 with spaces to E.164');

  const p2 = normalizeIndianPhone('09826123456');
  assert(p2.isValid && p2.clean10 === '9826123456', 'Strips leading trunk 0');

  const p3 = normalizeIndianPhone('919826123456');
  assert(p3.isValid && p3.clean10 === '9826123456', 'Strips 91 prefix without plus');

  const p4 = normalizeIndianPhone('९८२६१२३४५६'); // Hindi numerals
  assert(p4.isValid && p4.clean10 === '9826123456', 'Translates Devanagari Hindi digits to 10-digit standard');

  const p5 = normalizeIndianPhone('tel:+91-98261-23456');
  assert(p5.isValid && p5.clean10 === '9826123456', 'Strips tel: and dash formatting');

  const p6 = normalizeIndianPhone('9999999999');
  assert(!p6.isValid, 'Flags dummy repeating numbers as invalid');

  const p7 = normalizeIndianPhone('4567891234');
  assert(!p7.isValid, 'Flags invalid starting digit (4) as non-Indian mobile');

  // ------------------------------------------------------------------
  // TEST 2: Data Cleansing, XSS Sanitization & Title-Casing
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Data Cleansing, XSS Sanitization & Title-Casing ---');
  const xssName = '<script>alert("attack")</script>suresh kumar verma';
  const cleanName = toTitleCase(xssName);
  assert(cleanName === 'Suresh Kumar Verma', 'Strips script tags and formats to title case');

  const hindiName = 'सुरेश कुमार वर्मा';
  assert(toTitleCase(hindiName) === 'सुरेश कुमार वर्मा', 'Preserves Devanagari Unicode scripts untouched');

  const cleanEmail = normalizeEmail('   HELLO.PROSPECT@KisanChoice.COM  ');
  assert(cleanEmail === 'hello.prospect@kisanchoice.com', 'Normalizes and lowercases email');

  // ------------------------------------------------------------------
  // TEST 3: 50 Parallel Webhook Requests (Idempotency Mutex & Concurrency)
  // ------------------------------------------------------------------
  console.log('--- TEST 3: High-Concurrency Burst (50 Parallel Requests for Same Lead) ---');
  // Clean up any potential leftover burst leads from prior runs
  await Lead.deleteMany({
    $or: [
      { email: /^burst_/ },
      { campaign_name: 'Super High Concurrency Diwali Flash Sale' },
      { name: /^Burst Prospect/ }
    ]
  });

  const burstPhone = `9826${Date.now().toString().slice(-6)}`;
  console.log(`Firing 50 simultaneous concurrent submissions with mobile: ${burstPhone}...`);

  const burstPromises = [];
  for (let i = 0; i < 50; i++) {
    burstPromises.push(
      ingestLead({
        name: `Burst Prospect ${i + 1}`,
        mobile: `+91 ${burstPhone}`,
        email: `burst_${burstPhone}_${i}@example.com`,
        city: 'Indore',
        state: 'Madhya Pradesh',
        campaign_name: 'Super High Concurrency Diwali Flash Sale',
        lead_source: 'Meta Lead Ads Webhook',
        meta_lead_id: `meta_burst_${burstPhone}`,
        product_interest: 'Mustard Oil 15L'
      }, {
        source: 'Meta Lead Ads Webhook',
        duplicateWindowHours: 24,
        skipDlqDrain: true
      })
    );
  }

  const burstResults = await Promise.all(burstPromises);
  const actions = {};
  burstResults.forEach(r => { actions[r.action] = (actions[r.action] || 0) + 1; });
  console.log('Burst result actions distribution:', actions);
  console.log('Submission counts returned:', burstResults.map(r => r.submission_count).filter(Boolean));
  const createdCount = burstResults.filter(r => r.action === 'CREATED').length;
  const duplicateUpdatedCount = burstResults.filter(r => r.action === 'DUPLICATE_UPDATED' || r.action === 'CACHE_HIT_DUPLICATE').length;

  assert(createdCount === 1, `Exactly 1 lead was created in DB during 50 concurrent requests (Actual: ${createdCount})`);
  assert(duplicateUpdatedCount === 49, `All other 49 concurrent requests were safely handled as duplicates/resubmissions (Actual: ${duplicateUpdatedCount})`);

  // Verify in MongoDB database directly
  const dbLeads = await Lead.find({ mobile: burstPhone });
  assert(dbLeads.length === 1, `Zero duplicate records in MongoDB: exactly 1 document exists for phone ${burstPhone}`);

  const savedLead = dbLeads[0];
  assert(savedLead.is_repeat_lead === true, 'Lead is flagged with is_repeat_lead: true');
  assert(savedLead.submission_count === 50, `Submission count accurately reached 50 without lost increments (Actual: ${savedLead.submission_count})`);
  assert(savedLead.quality_score > 50, `Quality score bumped from repeat submissions (Actual: ${savedLead.quality_score})`);

  // Verify LeadActivity timeline
  const activities = await LeadActivity.find({ lead: savedLead._id }).sort({ createdAt: 1 });
  const createdAct = activities.filter(a => a.type === 'LEAD_CREATED');
  const resubAct = activities.filter(a => a.type === 'LEAD_RESUBMITTED');
  assert(createdAct.length === 1, 'Exactly 1 LEAD_CREATED timeline event recorded');
  assert(resubAct.length >= 1, `LEAD_RESUBMITTED timeline events recorded (Actual: ${resubAct.length})`);
  assert(getActiveLocksCount() === 0, 'In-memory active mutex lock queues clean up completely (Zero Memory Leak)');

  // ------------------------------------------------------------------
  // TEST 3B: Rapid Identical Webhook Retry Fast-Path Cache (CACHE_HIT_DUPLICATE)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3B: Rapid Identical Webhook Retries (Idempotency Cache) ---');
  const retryPhone = `9825${Date.now().toString().slice(-6)}`;
  const retryPayload = {
    name: 'Rapid Retry Prospect',
    mobile: retryPhone,
    email: `retry_${retryPhone}@example.com`,
    campaign_name: 'Identical Network Redelivery Test',
    lead_source: 'Meta Lead Ads Webhook'
  };

  const parallelIdenticalPromises = [];
  for (let i = 0; i < 5; i++) {
    parallelIdenticalPromises.push(
      ingestLead(retryPayload, { source: 'Meta Lead Ads Webhook', skipDlqDrain: true })
    );
  }
  const parallelIdenticalResults = await Promise.all(parallelIdenticalPromises);
  const cacheHitCount = parallelIdenticalResults.filter(r => r.action === 'CACHE_HIT_DUPLICATE').length;
  const initialCreatedCount = parallelIdenticalResults.filter(r => r.action === 'CREATED').length;
  assert(initialCreatedCount === 1, `First incoming payload was CREATED (Actual: ${initialCreatedCount})`);
  assert(cacheHitCount >= 1, `Subsequent identical retries within 5s served by fast-path idempotency cache (Actual: ${cacheHitCount})`);

  const retryDbLeads = await Lead.find({ mobile: retryPhone });
  assert(retryDbLeads.length === 1, `Zero duplicate records in MongoDB for rapid retries: exactly 1 document exists`);

  // ------------------------------------------------------------------
  // TEST 4: Sliding-Window Deduplication vs Cooling-off Re-activation
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Sliding Window & Cooling-off Re-activation ---');
  // Create a lead that was closed 30 days ago
  const oldPhone = `9827${Date.now().toString().slice(-6)}`;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const closedLead = await Lead.create({
    name: 'Purana Grahak',
    mobile: oldPhone,
    status: 'Closed',
    lead_status: 'Closed',
    createdAt: thirtyDaysAgo,
    last_resubmitted_at: thirtyDaysAgo,
    submission_count: 1
  });

  // Re-submit form after 30 days (outside cooling-off window)
  const reactivateResult = await ingestLead({
    name: 'Purana Grahak (Revisited)',
    mobile: oldPhone,
    campaign_name: 'Summer New Season Offer',
    lead_source: 'Website Landing Page'
  }, {
    source: 'Website Landing Page',
    duplicateWindowHours: 24,
    skipDlqDrain: true
  });

  assert(reactivateResult.action === 'REACTIVATED', 'Old closed lead outside cooling-off window is REACTIVATED');
  const reloadedLead = await Lead.findById(closedLead._id);
  assert(reloadedLead.status === 'Fresh Inquiry', 'Status re-activated to Fresh Inquiry');
  assert(reloadedLead.submission_count === 2, 'Submission count incremented to 2');

  // TEST 4B: Re-activation for a DIFFERENT campaign even when recent
  const recentPhone = `9824${Date.now().toString().slice(-6)}`;
  const recentClosedLead = await Lead.create({
    name: 'Different Campaign Prospect',
    mobile: recentPhone,
    status: 'Closed',
    lead_status: 'Closed',
    campaign_name: 'Original Mustard Tin 15L Campaign',
    createdAt: new Date(),
    last_resubmitted_at: new Date(),
    submission_count: 1
  });

  const diffCampaignResult = await ingestLead({
    name: 'Different Campaign Prospect',
    mobile: recentPhone,
    campaign_name: 'New 1L Pouch Dealership Campaign',
    lead_source: 'Website Landing Page'
  }, {
    source: 'Website Landing Page',
    duplicateWindowHours: 24,
    skipDlqDrain: true
  });

  assert(diffCampaignResult.action === 'REACTIVATED', 'Closed lead re-submitting for a different campaign is REACTIVATED');
  const reloadedRecent = await Lead.findById(recentClosedLead._id);
  assert(reloadedRecent.status === 'Fresh Inquiry', 'Closed lead status reset to Fresh Inquiry on new campaign inflow');

  // ------------------------------------------------------------------
  // TEST 5: Concurrency Burst Across 20 Distinct Leads (Load Balancing)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 5: Burst Ingestion of 20 Distinct Leads (Zero Collision) ---');
  const distinctPromises = [];
  for (let i = 0; i < 20; i++) {
    const dPhone = `9828${(Date.now() + i).toString().slice(-6)}`;
    distinctPromises.push(
      ingestLead({
        name: `Distinct Prospect ${i + 1}`,
        mobile: dPhone,
        city: i % 2 === 0 ? 'Indore' : 'Bhopal',
        state: 'Madhya Pradesh',
        campaign_name: 'Statewide Oil Expansion',
        lead_source: 'NeoDove Inbound'
      }, {
        source: 'NeoDove',
        skipDlqDrain: true
      })
    );
  }

  const distinctResults = await Promise.all(distinctPromises);
  const distinctCreated = distinctResults.filter(r => r.action === 'CREATED').length;
  assert(distinctCreated === 20, `All 20 distinct burst leads were successfully ingested (Actual: ${distinctCreated})`);

  const leadIds = distinctResults.map(r => r.lead_id);
  const uniqueLeadIds = new Set(leadIds);
  assert(uniqueLeadIds.size === 20, 'All 20 leads received globally unique sequence IDs (Zero Collision)');

  // ------------------------------------------------------------------
  // TEST 6: Durable Dead-Letter Queue (DLQ) & Fallback Disk Journaling
  // ------------------------------------------------------------------
  console.log('\n--- TEST 6: Durable Disk Journaling (DLQ) & Auto-Drain ---');
  const recoveryFile = path.join(process.cwd(), 'data', 'lead-recovery-queue.jsonl');
  if (fs.existsSync(recoveryFile)) {
    fs.unlinkSync(recoveryFile);
  }

  // Simulate network blip / DB down by writing directly to disk DLQ
  const dlqPhone = `9829${Date.now().toString().slice(-6)}`;
  const dlqPayload = {
    name: 'Emergency Offline Prospect',
    mobile: dlqPhone,
    city: 'Gwalior',
    state: 'Madhya Pradesh',
    campaign_name: 'Zero Loss Offline Buffer',
    lead_source: 'Facebook Meta Webhook'
  };

  const journalRes = journalLeadToDisk('Facebook Meta Webhook', dlqPayload, 'Simulated MongoDB Network Timeout');
  assert(journalRes.success && journalRes.queued, 'Raw lead payload safely journaled to disk');

  const stats = getRecoveryQueueStats();
  assert(stats.exists && stats.pendingCount >= 1, `DLQ buffer verified with ${stats.pendingCount} pending leads`);

  // Now trigger drainRecoveryQueue to recover and ingest into DB
  const drainRes = await drainRecoveryQueue(10);
  assert(drainRes.drained >= 1, `DLQ Drain successfully recovered ${drainRes.drained} leads into database`);

  // Verify that the lead now exists in MongoDB!
  const recoveredInDb = await Lead.findOne({ mobile: dlqPhone });
  assert(Boolean(recoveredInDb), 'Previously journaled lead successfully recovered in MongoDB Atlas');
  assert(recoveredInDb.name === 'Emergency Offline Prospect', 'Recovered lead has exact matching data');

  // TEST 6B: DLQ Replay with Raw JSON String & Meta Webhook Payload Format
  console.log('\n--- TEST 6B: DLQ Replay with Raw JSON String & Meta Payload Structure ---');
  const metaDlqPhone = `9823${Date.now().toString().slice(-6)}`;
  const metaRawJsonString = JSON.stringify({
    entry: [{
      id: 'page_12345',
      changes: [{
        value: {
          leadgen_id: `meta_dlq_${metaDlqPhone}`,
          form_id: 'form_9999',
          field_data: [
            { name: 'full_name', values: ['Manish Malviya'] },
            { name: 'phone_number', values: [`+91 ${metaDlqPhone}`] },
            { name: 'email', values: ['manish.malviya@example.com'] },
            { name: 'city', values: ['Ujjain'] }
          ]
        }
      }]
    }]
  });

  journalLeadToDisk('Facebook Meta Lead Ads', metaRawJsonString, 'Simulated DB connection blip');
  const drainRes2 = await drainRecoveryQueue(10);
  assert(drainRes2.drained >= 1, `DLQ drained raw JSON Meta string payload successfully`);

  const recoveredMetaLead = await Lead.findOne({ mobile: metaDlqPhone });
  assert(Boolean(recoveredMetaLead), 'Recovered Meta webhook lead exists in MongoDB Atlas');
  assert(recoveredMetaLead.name === 'Manish Malviya', `Lead name parsed correctly from Meta field_data (Actual: ${recoveredMetaLead.name})`);
  assert(recoveredMetaLead.city === 'Ujjain', `City parsed correctly from Meta field_data (Actual: ${recoveredMetaLead.city})`);

  // ------------------------------------------------------------------
  // TEST 7: Legacy Phone Deduplication & Normalization
  // ------------------------------------------------------------------
  console.log('\n--- TEST 7: Legacy Phone Deduplication & Normalization ---');
  const legacyPhone = `9822${Date.now().toString().slice(-6)}`;
  // Seed legacy lead with un-normalized mobile "+919822..."
  const legacyLead = await Lead.create({
    name: 'Purana Format Grahak',
    mobile: `+91${legacyPhone}`,
    status: 'Interested',
    submission_count: 1
  });

  // Ingest fresh lead with normalized 10-digit mobile "9822..."
  const legacyMatchRes = await ingestLead({
    name: 'Purana Format Grahak (Updated)',
    mobile: legacyPhone,
    campaign_name: 'Brand Redesign'
  }, {
    source: 'Website Landing Page',
    skipDlqDrain: true
  });

  assert(legacyMatchRes.action === 'DUPLICATE_UPDATED', 'Correctly matches legacy lead with +91 prefix and avoids duplicate');
  const updatedLegacyDoc = await Lead.findById(legacyLead._id);
  assert(updatedLegacyDoc.submission_count === 2, 'Submission count incremented on matched legacy lead');
  assert(updatedLegacyDoc.mobile === legacyPhone, `Normalized legacy phone to 10 digits in database (Actual: ${updatedLegacyDoc.mobile})`);

  // ------------------------------------------------------------------
  // CLEANUP TEMPORARY TEST DATA
  // ------------------------------------------------------------------
  console.log('\n--- Cleaning up temporary test leads ---');
  await Lead.deleteMany({
    mobile: { $in: [burstPhone, retryPhone, oldPhone, recentPhone, dlqPhone, metaDlqPhone, legacyPhone, `+91${legacyPhone}`, ...distinctResults.map(r => r.mobile)] }
  });
  await LeadActivity.deleteMany({
    lead: { $in: [savedLead._id, closedLead._id, recentClosedLead._id, recoveredInDb?._id, recoveredMetaLead?._id, legacyLead._id].filter(Boolean) }
  });
  if (fs.existsSync(recoveryFile)) {
    fs.unlinkSync(recoveryFile);
  }
  console.log('Cleanup completed successfully.');

  console.log('\n======================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
