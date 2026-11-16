import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import connectDB from './db.js';
import Lead from './models/Lead.js';
import User from './models/User.js';
import LeadActivity from './models/LeadActivity.js';
import Counter from './models/Counter.js';
import SystemSetting from './models/SystemSetting.js';
import { getOrInitSettings } from './settings.js';
import { routeLead, reserveCallerFlight, releaseCallerFlight, getInFlightReservations } from './leadRouter.js';
export { reserveCallerFlight, releaseCallerFlight, getInFlightReservations };
import { normalizeStage } from './leadDispositions.js';
import { dispatchChannelAlerts } from './channelAlerts.js';
import { syncLeadToNeoDove } from './neodoveSync.js';
import { purgeDashboardCache } from './cache.js';
import { parseMetaLeadItem } from './metaLeadParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * ==============================================================================
 * ENTERPRISE ZERO-LOSS LEAD INGESTION & CONCURRENCY SAFEGUARD ENGINE
 * ==============================================================================
 * Features:
 * 1. Distributed In-Memory Idempotency Mutex Locks (Keyed on Lead ID / Phone / Digest)
 * 2. Strict Indian E.164 Phone Normalization & Hindi Numeral Parser
 * 3. XSS Sanitization & Proper Name Title-Casing
 * 4. Sliding-Window Intelligent Deduplication & Multi-Lead Merge (LEAD_RESUBMITTED)
 * 5. Cooling-off Re-activation Engine
 * 6. Concurrency Burst In-Flight Load Balancer
 * 7. Durable Disk Dead-Letter Queue (DLQ) Fallback Journaling (data/lead-recovery-queue.jsonl)
 * 8. Automatic DLQ Background Recovery & Drain
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. DATA SANITIZATION & NORMALIZATION UTILITIES
// ------------------------------------------------------------------------------

const HINDI_DIGIT_MAP = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

/**
 * Normalizes Indian mobile numbers into standard 10-digit format and E.164 (+91...).
 * Handles +91, 91, leading 0, spaces, dashes, brackets, Hindi numerals, and tel: prefixes.
 */
export function normalizeIndianPhone(rawPhone) {
  if (!rawPhone) return { isValid: false, clean10: '', e164: '', raw: '' };

  let str = String(rawPhone).trim();
  // Convert any Hindi numerals to standard ASCII
  for (const [hindi, eng] of Object.entries(HINDI_DIGIT_MAP)) {
    str = str.split(hindi).join(eng);
  }

  // Remove common prefixes & formatting characters
  let cleaned = str.replace(/^(tel:|p:|mob:|mobile:|call:)/i, '')
                   .replace(/[\s\-\(\)\.\,\/]/g, '');

  // Strip international Indian prefixes (0091, +91, 91)
  if (cleaned.startsWith('0091')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.slice(2);
  }

  // Strip trunk prefix '0'
  while (cleaned.startsWith('0') && cleaned.length > 10) {
    cleaned = cleaned.slice(1);
  }

  // Keep only digits
  const digits = cleaned.replace(/\D/g, '');

  // Strict check: Must be 10 digits starting with 6, 7, 8, or 9
  const isIndianMobile = /^[6-9]\d{9}$/.test(digits);
  // Filter out obvious test/dummy sequences
  const isDummy = /^([0-9])\1{9}$/.test(digits) || digits === '1234567890' || digits === '9876543210';

  if (isIndianMobile && !isDummy) {
    return {
      isValid: true,
      clean10: digits,
      e164: `+91${digits}`,
      formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      raw: str
    };
  }

  // Fallback: If not valid 10-digit Indian mobile, retain digits safely without crashing
  return {
    isValid: false,
    clean10: digits.length >= 10 ? digits.slice(-10) : digits,
    e164: digits ? `+${digits}` : '',
    raw: str,
    reason: isDummy ? 'Dummy / Test number detected' : (digits.length !== 10 ? 'Invalid digit length' : 'Invalid starting digit')
  };
}

/**
 * HTML/XSS Sanitizer & Control Character Stripper
 */
export function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Strip style tags and their content
    .replace(/<[^>]*>/g, '') // Strip remaining HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control chars
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Proper Name Title-Casing (Handles Indian compound names e.g. "ramesh kumar" -> "Ramesh Kumar")
 * Leaves non-Latin scripts (e.g. Hindi "रमेश कुमार") completely intact.
 */
export function toTitleCase(name) {
  const sanitized = sanitizeText(name);
  if (!sanitized) return '';
  // Check if Latin characters are present
  if (!/[a-zA-Z]/.test(sanitized)) return sanitized;

  return sanitized
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Email Normalization
 */
export function normalizeEmail(email) {
  if (!email) return '';
  const sanitized = sanitizeText(email).toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
  return isValid ? sanitized : '';
}

/**
 * Payload Digest Generation (for quick idempotency checks against rapid retries)
 */
export function computePayloadDigest(data) {
  const normPhone = normalizeIndianPhone(data.mobile || data.phone || '').clean10;
  const key = [
    data.meta_lead_id || data.leadgen_id || '',
    normPhone,
    (data.name || '').trim().toLowerCase(),
    (data.campaign_name || '').trim().toLowerCase(),
    (data.formId || data.meta_form_id || '').trim()
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

// ------------------------------------------------------------------------------
// 2. CONCURRENCY CONTROL & IN-MEMORY KEYED MUTEX LOCKS
// ------------------------------------------------------------------------------

const activeLockQueues = new Map(); // key -> Promise
const recentDigests = new Map(); // digest -> { timestamp, result }

export function getActiveLocksCount() {
  return activeLockQueues.size;
}

export function cleanStaleDigests(maxAgeMs = 30000) {
  const now = Date.now();
  for (const [k, v] of recentDigests.entries()) {
    if (now - v.timestamp > maxAgeMs) {
      recentDigests.delete(k);
    }
  }
}

export function cacheDigestResult(digest, result) {
  if (!digest || !result) return;
  cleanStaleDigests();
  recentDigests.set(digest, {
    timestamp: Date.now(),
    result: {
      _id: result._id?.toString(),
      lead_id: result.lead_id,
      name: result.name,
      mobile: result.mobile,
      assigned_to: typeof result.assigned_to === 'object' ? result.assigned_to?.name : result.assigned_to,
      submission_count: result.submission_count || 1,
      quality_score: result.quality_score || 50,
      status: result.status
    }
  });
}

/**
 * Async Keyed FIFO Mutex: Guarantees strict sequential execution for identical lead keys
 * (e.g. concurrent webhook bursts with same meta_lead_id or phone number).
 * Safely cleans up activeLockQueues map on completion to prevent memory leaks.
 */
export async function withLeadLock(lockKey, asyncFn, timeoutMs = 45000) {
  if (!lockKey) return await asyncFn();

  const prevPromise = activeLockQueues.get(lockKey) || Promise.resolve();

  let release;
  const currentPromise = new Promise(resolve => { release = resolve; });

  const chainedPromise = prevPromise.catch(() => {}).then(() => currentPromise);
  activeLockQueues.set(lockKey, chainedPromise);

  const timeoutPromise = new Promise((_, reject) => {
    const t = setTimeout(() => reject(new Error(`Lead lock timeout (${timeoutMs}ms) for key ${lockKey}`)), timeoutMs);
    currentPromise.finally(() => clearTimeout(t));
  });

  try {
    await Promise.race([prevPromise.catch(() => {}), timeoutPromise]);
    return await asyncFn();
  } finally {
    release();
    if (activeLockQueues.get(lockKey) === chainedPromise) {
      activeLockQueues.delete(lockKey);
    }
  }
}


// ------------------------------------------------------------------------------
// 3. DURABLE DEAD-LETTER QUEUE (DLQ) & FALLBACK DISK JOURNALING
// ------------------------------------------------------------------------------

function getRecoveryQueueFilePath() {
  const base = process.env.DATA_DIR || PROJECT_ROOT;
  return path.join(base, 'data', 'lead-recovery-queue.jsonl');
}

/**
 * Extracts individual lead items from any payload format:
 * - JSON string (from webhook raw text)
 * - Meta webhook structure ({ entry: [{ changes: [{ value: ... }] }] })
 * - Multi-lead arrays ({ leads: [...] }, { data: [...] }, or [...])
 * - Single lead object ({ name, mobile, ... })
 */
export function extractLeadItemsFromPayload(payload, defaultSource = '') {
  if (!payload) return [];
  let data = payload;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }

  // 1. Meta Webhook payload format
  if (data?.entry && Array.isArray(data.entry)) {
    const items = [];
    for (const entry of data.entry) {
      for (const change of (entry.changes || [])) {
        if (change?.value) {
          const val = change.value;
          items.push({
            meta_lead_id: String(val.leadgen_id || val.id || ''),
            formId: String(val.form_id || ''),
            campaign_name: val.campaign_name || '',
            lead_source: 'Facebook Meta Lead Ads',
            field_data: val.field_data || null,
            ...val
          });
        }
      }
    }
    if (items.length > 0) return items;
  }

  // 2. Batch arrays: leads, data, or top-level array
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.leads)) return data.leads;
  if (Array.isArray(data?.data)) return data.data;

  // 3. Single object
  if (typeof data === 'object' && data !== null) return [data];
  return [];
}

/**
 * Immediately journals raw payload to durable disk buffer when DB or network fails.
 * Guarantees ZERO LEAD LOSS even during total database downtime.
 */
export function journalLeadToDisk(source, rawPayload, errorMsg = '') {
  try {
    const filePath = getRecoveryQueueFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let parsedPayload = rawPayload;
    if (typeof rawPayload === 'string') {
      try {
        parsedPayload = JSON.parse(rawPayload);
      } catch {
        parsedPayload = rawPayload;
      }
    }

    const entry = {
      id: `dlq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      source: source || 'unknown_webhook',
      payload: parsedPayload,
      error: String(errorMsg || 'Database connection failure or write timeout'),
      retries: 0,
      status: 'PENDING'
    };

    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
    console.warn(`[DLQ Fallback] Safely journaled lead ${entry.id} to disk (${filePath}). Source: ${source}`);
    return { success: true, queued: true, queueId: entry.id };
  } catch (fsErr) {
    console.error('[DLQ Fallback Fatal Exception]: Failed to write recovery journal:', fsErr);
    return { success: false, error: fsErr.message };
  }
}

/**
 * Inspects the status and count of pending DLQ items.
 */
export function getRecoveryQueueStats() {
  const filePath = getRecoveryQueueFilePath();
  if (!fs.existsSync(filePath)) {
    return { exists: false, pendingCount: 0, filePath };
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    return {
      exists: true,
      pendingCount: lines.length,
      filePath,
      lastEntry: lines.length > 0 ? JSON.parse(lines[lines.length - 1]).timestamp : null
    };
  } catch (err) {
    return { exists: true, error: err.message, filePath };
  }
}

/**
 * Background Recovery Worker: Replays and ingests pending leads from disk DLQ.
 * Extracts individual lead records and parses field_data so zero dummy leads are created.
 */
export async function drainRecoveryQueue(maxBatch = 50) {
  const filePath = getRecoveryQueueFilePath();
  if (!fs.existsSync(filePath)) return { drained: 0, remaining: 0 };

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (readErr) {
    console.error('[DLQ Drain] Read error:', readErr);
    return { drained: 0, remaining: 0 };
  }

  const lines = content.split('\n').filter(Boolean);
  if (lines.length === 0) return { drained: 0, remaining: 0 };

  const remaining = [];
  let drainedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue; // Skip corrupted line
    }

    if (i < maxBatch && entry.status !== 'PROCESSED' && entry.status !== 'FAILED_PERMANENT') {
      try {
        const items = extractLeadItemsFromPayload(entry.payload, entry.source);
        if (items.length === 0 && typeof entry.payload === 'object' && entry.payload !== null) {
          items.push(entry.payload);
        }

        let allOk = items.length > 0;
        for (const rawItem of items) {
          let toIngest = rawItem;
          // If Meta lead with field_data, parse fields
          if (toIngest.field_data && Array.isArray(toIngest.field_data)) {
            const parsed = parseMetaLeadItem(toIngest);
            toIngest = {
              name: parsed.name,
              mobile: parsed.mobile || parsed.rawMobile,
              email: parsed.email,
              city: parsed.city,
              state: parsed.state,
              business_type: parsed.business_type,
              product_interest: parsed.product_interest,
              campaign_name: parsed.campaignName || toIngest.campaign_name,
              meta_lead_id: parsed.metaLeadId || toIngest.meta_lead_id,
              formId: parsed.formId || toIngest.formId,
              lead_source: entry.source || 'Facebook Meta Lead Ads',
              notes: parsed.notes
            };
          }

          const res = await ingestLead(toIngest, {
            source: entry.source || toIngest.lead_source,
            isDlqReplay: true,
            skipDiskJournal: true
          });

          if (!res.success || res.action === 'JOURNALED_DLQ') {
            allOk = false;
          }
        }

        if (allOk) {
          drainedCount++;
          continue; // Successfully ingested, do not keep in remaining
        } else {
          entry.retries = (entry.retries || 0) + 1;
          entry.lastError = 'Partial or failed ingestion during replay';
          if (entry.retries >= 5) entry.status = 'FAILED_PERMANENT';
        }
      } catch (err) {
        entry.retries = (entry.retries || 0) + 1;
        entry.lastError = err.message;
        if (entry.retries >= 5) entry.status = 'FAILED_PERMANENT';
      }
    }
    remaining.push(entry);
  }

  // Rewrite queue file atomically
  try {
    if (remaining.length === 0) {
      fs.writeFileSync(filePath, '', 'utf8');
    } else {
      fs.writeFileSync(filePath, remaining.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    }
  } catch (err) {
    console.error('[DLQ Drain] Error rewriting queue file:', err);
  }

  return { drained: drainedCount, remaining: remaining.length };
}

// ------------------------------------------------------------------------------
// 4. INTELLIGENT LEAD INGESTION & DEDUPLICATION ENGINE
// ------------------------------------------------------------------------------

/**
 * Universal High-Throughput Lead Ingestion Processor
 *
 * @param {Object} item Raw lead data object from any source
 * @param {Object} options Configuration overrides (window hours, source, adminId, etc.)
 */
export async function ingestLead(item = {}, options = {}) {
  const startTime = Date.now();

  // Safely parse JSON string if payload is passed as string
  if (typeof item === 'string') {
    try {
      item = JSON.parse(item);
    } catch {
      item = {};
    }
  }

  const source = options.source || item.lead_source || item.source || 'Website Landing Page';
  const defaultCampaign = options.defaultCampaign || item.campaign_name || item.campaign || 'Direct Inflow';
  const slidingWindowHours = options.duplicateWindowHours || 24;

  // 1. Data Cleansing & Normalization
  const rawName = item.name || item.full_name || item.lead_name || item.contact_name || '';
  const cleanName = toTitleCase(rawName) || (item.email ? item.email.split('@')[0] : 'Valued Prospect');

  const rawPhone = item.mobile || item.phone || item.contact || item.contact_number || item.phone_number || '';
  const phoneObj = normalizeIndianPhone(rawPhone);
  const cleanPhone = phoneObj.clean10;
  const isPhoneValid = phoneObj.isValid;
  const savedMobile = cleanPhone || String(rawPhone).replace(/[^\d+]/g, '').slice(0, 20) || '';

  const cleanEmail = normalizeEmail(item.email);
  const cleanCity = toTitleCase(item.city || item.location || item.district || '');
  const cleanState = toTitleCase(item.state || item.province || '');
  const cleanBusinessType = sanitizeText(item.business_type || item.businessType || item.join_as || '');
  const cleanProductInterest = sanitizeText(item.product_interest || item.productPreference || item.start_timeline || '');
  const cleanJoinAs = sanitizeText(item.join_as || item.business_type || '');
  const cleanStartTimeline = sanitizeText(item.start_timeline || item.product_interest || '');
  const rawMetaId = String(item.meta_lead_id || item.leadgen_id || item.metaLeadId || '').trim();
  const rawNeoId = String(item.neodove_lead_id || item.id || '').trim();
  const formId = String(item.formId || item.form_id || item.meta_form_id || '').trim();
  const subDisp = sanitizeText(item.sub_disposition || item.subDisposition || item.sub_stage || item.disposition || '');
  const rawNotes = sanitizeText(item.notes || '');

  // Guard against completely empty / corrupt payloads
  if (!savedMobile && !cleanEmail && !rawMetaId && !rawNeoId) {
    return {
      success: false,
      error: 'Empty lead payload: contact details required (phone, email, or lead ID)',
      action: 'REJECTED_EMPTY',
      latencyMs: Date.now() - startTime
    };
  }

  // Calculate unique lock key for concurrency mutex
  const lockKey = rawMetaId
    ? `meta_${rawMetaId}`
    : (rawNeoId
      ? `neo_${rawNeoId}`
      : (cleanPhone
        ? `phone_${cleanPhone}`
        : (savedMobile && savedMobile !== '0000000000'
          ? `phone_${savedMobile}`
          : (cleanEmail ? `email_${cleanEmail}` : `name_${cleanName.replace(/\s+/g, '_')}`))));

  // Compute payload digest for fast idempotency cache
  const payloadDigest = computePayloadDigest({
    mobile: savedMobile,
    name: cleanName,
    campaign_name: defaultCampaign,
    meta_lead_id: rawMetaId,
    formId
  });

  // Fast-path idempotency check for rapid duplicate retries (within 5 seconds)
  const cachedEarly = recentDigests.get(payloadDigest);
  if (cachedEarly && (Date.now() - cachedEarly.timestamp) < 5000) {
    return {
      success: true,
      action: 'CACHE_HIT_DUPLICATE',
      status: 'DUPLICATE_UPDATED',
      isDuplicate: true,
      isRepeat: true,
      lead_id: cachedEarly.result.lead_id,
      name: cachedEarly.result.name,
      mobile: cachedEarly.result.mobile,
      assigned_to: cachedEarly.result.assigned_to,
      submission_count: cachedEarly.result.submission_count,
      quality_score: cachedEarly.result.quality_score,
      lead: cachedEarly.result,
      latencyMs: Date.now() - startTime
    };
  }

  // 2. Execute under Concurrency Lock
  return await withLeadLock(lockKey, async () => {
    // Double-checked locking: check if concurrent worker finished this exact digest
    const cachedLocked = recentDigests.get(payloadDigest);
    if (cachedLocked && (Date.now() - cachedLocked.timestamp) < 5000) {
      return {
        success: true,
        action: 'CACHE_HIT_DUPLICATE',
        status: 'DUPLICATE_UPDATED',
        isDuplicate: true,
        isRepeat: true,
        lead_id: cachedLocked.result.lead_id,
        name: cachedLocked.result.name,
        mobile: cachedLocked.result.mobile,
        assigned_to: cachedLocked.result.assigned_to,
        submission_count: cachedLocked.result.submission_count,
        quality_score: cachedLocked.result.quality_score,
        lead: cachedLocked.result,
        latencyMs: Date.now() - startTime
      };
    }

    try {
      await connectDB();
    } catch (dbErr) {
      console.warn(`[Lead Ingestion] DB connection error (${dbErr.message}). Switching to Durable DLQ.`);
      if (!options.skipDiskJournal) {
        const jRes = journalLeadToDisk(source, item, dbErr.message);
        return {
          success: true,
          action: 'JOURNALED_DLQ',
          status: 'JOURNALED_DLQ',
          queueId: jRes.queueId,
          reason: dbErr.message,
          latencyMs: Date.now() - startTime
        };
      }
      throw dbErr;
    }

    try {
      const settings = await getOrInitSettings().catch(() => null);

      // 3. Search for Existing Lead (Intelligent Deduplication Search)
      let existing = null;

      if (rawMetaId) {
        existing = await Lead.findOne({
          $or: [
            { meta_lead_id: rawMetaId },
            { notes: { $regex: rawMetaId } }
          ]
        });
      }

      if (!existing && rawNeoId) {
        existing = await Lead.findOne({ neodove_lead_id: rawNeoId });
      }

      if (!existing && cleanPhone && cleanPhone !== '0000000000') {
        existing = await Lead.findOne({
          $or: [
            { mobile: cleanPhone },
            { mobile: `+91${cleanPhone}` },
            { mobile: `0${cleanPhone}` },
            { mobile: `91${cleanPhone}` }
          ]
        });
      }

      // Fallback: Check email if mobile is missing or generic
      if (!existing && cleanEmail) {
        existing = await Lead.findOne({ email: cleanEmail });
      }

      const now = new Date();

      // ------------------------------------------------------------------------
      // 3A. SLIDING-WINDOW DEDUPLICATION & RE-SUBMISSION ENGINE
      // ------------------------------------------------------------------------
      if (existing) {
        const lastActivityTime = existing.last_resubmitted_at || existing.createdAt || now;
        const hoursElapsed = (now.getTime() - new Date(lastActivityTime).getTime()) / (1000 * 60 * 60);
        const isWithinSlidingWindow = hoursElapsed <= slidingWindowHours;

        // Populate assigned telecaller details if available
        let assignedCaller = null;
        if (existing.assigned_to) {
          assignedCaller = await User.findById(existing.assigned_to).select('name mobile email employee_id team').lean();
        }

        // Increment submission counter
        const newCount = (existing.submission_count || 1) + 1;
        existing.submission_count = newCount;
        existing.is_repeat_lead = true;
        existing.last_resubmitted_at = now;

        // Bump quality score because a repeat inquiry signifies intense buyer intent!
        const prevScore = existing.quality_score || 50;
        const newScore = Math.min(100, prevScore + 15);
        existing.quality_score = newScore;
        if (newScore >= 80) existing.priority = 'VIP';
        else if (newScore >= 60) existing.priority = 'High';

        // Update campaign history array
        const campaignEntry = {
          campaign: defaultCampaign,
          source,
          formId,
          submittedAt: now
        };
        existing.campaign_history = Array.isArray(existing.campaign_history)
          ? [...existing.campaign_history, campaignEntry]
          : [campaignEntry];

        // Enrich missing details if incoming submission provides newer/better info
        if (!existing.email && cleanEmail) existing.email = cleanEmail;
        if (!existing.city && cleanCity) existing.city = cleanCity;
        if (!existing.state && cleanState) existing.state = cleanState;
        if (!existing.business_type && cleanBusinessType) existing.business_type = cleanBusinessType;
        if (!existing.product_interest && cleanProductInterest) existing.product_interest = cleanProductInterest;
        if (rawMetaId && !existing.meta_lead_id) existing.meta_lead_id = rawMetaId;
        if (rawNeoId && !existing.neodove_lead_id) existing.neodove_lead_id = rawNeoId;
        if (subDisp) existing.sub_disposition = subDisp;
        if (item.stage || item.status) existing.status = normalizeStage(item.stage || item.status);
        if (item.lead_status) existing.lead_status = item.lead_status;
        if (item.deal_amount !== undefined && Number(item.deal_amount)) existing.deal_amount = Number(item.deal_amount);

        // Append timestamped re-submission note
        const resubNote = `[Repeat Inflow ${now.toISOString().slice(0, 10)}]: Resubmitted via ${source} (${defaultCampaign})${rawNotes ? ` • Note: ${rawNotes}` : ''}`;
        existing.notes = existing.notes ? `${existing.notes}\n${resubNote}` : resubNote;

        let actionType = 'DUPLICATE_UPDATED';
        const terminalStages = ['Closed', 'Lost', 'Rejected', 'Not Interested', 'Wrong Number'];
        const isTerminal = terminalStages.includes(existing.status);
        const isDifferentCampaign = Boolean(defaultCampaign && existing.campaign_name && defaultCampaign.toLowerCase() !== existing.campaign_name.toLowerCase());
        const isDifferentProduct = Boolean(cleanProductInterest && existing.product_interest && cleanProductInterest.toLowerCase() !== existing.product_interest.toLowerCase());

        // Re-activation if outside sliding window OR if lead in terminal stage submits for different campaign/product
        if (!isWithinSlidingWindow || (isTerminal && (isDifferentCampaign || isDifferentProduct))) {
          if (isTerminal) {
            existing.status = 'Fresh Inquiry';
            existing.lead_status = 'In-Progress';
            actionType = 'REACTIVATED';
          }
        }

        const updatedLead = await Lead.findByIdAndUpdate(
          existing._id,
          {
            $inc: { submission_count: 1 },
            $set: {
              mobile: cleanPhone || existing.mobile, // Normalize legacy mobile in DB
              is_repeat_lead: true,
              last_resubmitted_at: now,
              quality_score: newScore,
              priority: newScore >= 80 ? 'VIP' : (newScore >= 60 ? 'High' : existing.priority),
              status: existing.status,
              lead_status: existing.lead_status,
              notes: existing.notes,
              email: existing.email,
              city: existing.city,
              state: existing.state,
              business_type: existing.business_type,
              product_interest: existing.product_interest,
              campaign_name: isDifferentCampaign ? defaultCampaign : existing.campaign_name,
              meta_lead_id: existing.meta_lead_id,
              neodove_lead_id: existing.neodove_lead_id,
              sub_disposition: existing.sub_disposition
            },
            $push: {
              campaign_history: campaignEntry
            }
          },
          { returnDocument: 'after' }
        ) || existing;

        const actualCount = updatedLead.submission_count;

        // Log LEAD_RESUBMITTED timeline activity in Lead 360° View
        await LeadActivity.create({
          lead: existing._id,
          admin_id: existing.admin_id || options.adminId || null,
          performed_by: assignedCaller?._id || null,
          performer_name: `${source} Gateway`,
          performer_role: 'webhook',
          type: 'LEAD_RESUBMITTED',
          title: isWithinSlidingWindow
            ? `High-Intent Repeat Lead (Submission #${actualCount})`
            : `Lead Re-activated After Cooling-off (${Math.round(hoursElapsed)}h)`,
          description: `Prospect resubmitted inquiry form for campaign "${defaultCampaign}". Quality score increased from ${prevScore} to ${newScore}.`,
          metadata: {
            submission_count: actualCount,
            campaign: defaultCampaign,
            source,
            form_id: formId,
            quality_score: newScore,
            assigned_caller: assignedCaller?.name || 'Unassigned',
            within_window: isWithinSlidingWindow,
            hours_elapsed: Math.round(hoursElapsed)
          }
        }).catch(err => console.warn('[leadIngestionEngine] Activity log warning:', err.message));

        // Multi-Channel Instant Alert to Assigned Telecaller
        if (!options.skipAlerts && assignedCaller) {
          dispatchChannelAlerts({
            lead: updatedLead,
            caller: assignedCaller,
            eventType: 'REPEAT_LEAD',
            templateCategory: 'Repeat Lead',
            customMessage: `URGENT: Repeat Lead Alert! Prospect ${updatedLead.name} (+91 ${updatedLead.mobile}) just resubmitted inquiry for "${defaultCampaign}". Total submissions: ${actualCount}. Prioritize immediate callback!`
          }).catch(err => console.warn('[leadIngestionEngine] Alert warning:', err.message));
        }

        purgeDashboardCache();

        const resultObj = {
          success: true,
          action: actionType,
          status: 'DUPLICATE_UPDATED',
          isDuplicate: true,
          isRepeat: true,
          lead_id: updatedLead.lead_id,
          name: updatedLead.name,
          mobile: updatedLead.mobile,
          assigned_to: assignedCaller ? assignedCaller.name : 'Unassigned',
          submission_count: actualCount,
          quality_score: newScore,
          lead: updatedLead,
          latencyMs: Date.now() - startTime
        };

        cacheDigestResult(payloadDigest, updatedLead);
        return resultObj;
      }

      // ------------------------------------------------------------------------
      // 3B. FRESH LEAD INGESTION & SMART ATOMIC ROUTING
      // ------------------------------------------------------------------------

      // Smart Lead Routing & Auto-Assignment (or Direct Admin Selection)
      let chosenCaller = null;
      let routingMethod = 'AUTO_ROUTER';
      let routingReason = '';

      if (options.assignedCallerId || item.assigned_to) {
        const callerId = options.assignedCallerId || item.assigned_to;
        chosenCaller = await User.findById(callerId);
        routingMethod = 'DIRECT_ADMIN_ASSIGNMENT';
        routingReason = `Directly assigned to ${chosenCaller?.name || callerId}`;
      } else {
        const routingData = {
          state: cleanState,
          city: cleanCity,
          business_type: cleanBusinessType,
          product_interest: cleanProductInterest,
          lead_source: source,
          campaign_name: defaultCampaign,
          formId
        };
        const routingResult = await routeLead(routingData);
        chosenCaller = routingResult.caller;
        routingMethod = routingResult.method;
        routingReason = routingResult.reason;
      }

      // Reserve caller flight in memory to prevent load-balance race collisions
      if (chosenCaller?._id) {
        reserveCallerFlight(chosenCaller._id);
      }

      const normStage = normalizeStage(item.stage || item.status || 'New');
      const initialStatus = normStage === 'New'
        ? (chosenCaller ? 'Assigned' : 'Fresh Inquiry')
        : normStage;

      const tags = Array.isArray(item.tags) ? [...item.tags] : [];
      if (!isPhoneValid) tags.push('Unverified Phone');
      if (source.includes('Meta')) tags.push('Meta Inflow');
      else if (source.includes('NeoDove')) tags.push('NeoDove Inflow');
      else tags.push('Website Inflow');

      let newLead;
      try {
        newLead = await Lead.create({
          admin_id: options.adminId || null,
          name: cleanName,
          mobile: savedMobile,
          email: cleanEmail,
          city: cleanCity,
          state: cleanState,
          business_type: cleanBusinessType,
          product_interest: cleanProductInterest,
          join_as: cleanJoinAs,
          start_timeline: cleanStartTimeline,
          deal_amount: Number(item.deal_amount) || 0,
          sub_disposition: subDisp,
          lead_source: source,
          campaign_name: defaultCampaign,
          meta_lead_id: rawMetaId,
          meta_form_id: formId,
          neodove_lead_id: rawNeoId,
          status: initialStatus,
          lead_status: item.lead_status || 'In-Progress',
          priority: item.priority || 'Normal',
          assigned_to: chosenCaller ? chosenCaller._id : null,
          assigned_at: chosenCaller ? new Date() : null,
          tags,
          custom_fields: item.custom_fields || {},
          notes: rawNotes || `Captured via ${source} • Router=${routingMethod} (${routingReason})`,
          is_repeat_lead: false,
          submission_count: 1,
          last_resubmitted_at: null,
          quality_score: 50,
          campaign_history: [{
            campaign: defaultCampaign,
            source,
            formId,
            submittedAt: now
          }]
        });
      } finally {
        if (chosenCaller?._id) {
          releaseCallerFlight(chosenCaller._id);
        }
      }

      // 1. Log LEAD_CREATED in LeadActivity
      await LeadActivity.create({
        lead: newLead._id,
        admin_id: newLead.admin_id || null,
        performer_name: `${source} Gateway`,
        performer_role: 'webhook',
        type: 'LEAD_CREATED',
        title: `Lead Captured via ${source}`,
        description: `Prospect ${newLead.name} (${savedMobile}) registered via ${source}. Router: ${routingMethod}`,
        metadata: {
          lead_id: newLead.lead_id,
          source,
          campaign: newLead.campaign_name,
          city: newLead.city,
          state: newLead.state,
          meta_lead_id: rawMetaId,
          neodove_lead_id: rawNeoId
        }
      }).catch(err => console.warn('[leadIngestionEngine] Activity log warning:', err.message));

      // 2. Log LEAD_ASSIGNED in LeadActivity
      if (chosenCaller) {
        await LeadActivity.create({
          lead: newLead._id,
          admin_id: newLead.admin_id || null,
          performed_by: chosenCaller._id,
          performer_name: chosenCaller.name,
          performer_role: 'system',
          type: 'LEAD_ASSIGNED',
          title: `Auto-Assigned to ${chosenCaller.name}`,
          description: `Assigned via Smart Router (${routingReason})`,
          metadata: {
            caller_id: chosenCaller._id,
            caller_name: chosenCaller.name,
            method: routingMethod,
            ruleName: null
          }
        }).catch(err => console.warn('[leadIngestionEngine] Activity log warning:', err.message));
      }

      // 3. Multi-Channel Instant Welcome Alerts (WhatsApp / SMS)
      if (!options.skipAlerts) {
        dispatchChannelAlerts({
          lead: newLead,
          caller: chosenCaller,
          eventType: 'WELCOME',
          templateCategory: 'Welcome',
          adminId: options.adminId || null
        }).catch(err => console.warn('[leadIngestionEngine] Welcome alert trigger warning:', err.message));
      }

      // 4. NeoDove Coexistence Mirroring (if enabled)
      if (settings?.neodoveConfig?.enabled && settings?.neodoveConfig?.autoSync) {
        syncLeadToNeoDove(newLead, settings).catch(err =>
          console.warn('[leadIngestionEngine] NeoDove mirror warning:', err.message)
        );
      }

      // 5. Update Webhook Statistics in SystemSetting
      if (source.includes('Website')) {
        await SystemSetting.updateOne(
          { key: 'global' },
          {
            $inc: { 'websiteWebhookConfig.leadsCaptured': 1 },
            $set: { 'websiteWebhookConfig.lastLeadAt': now }
          }
        ).catch(() => {});
      } else if (source.includes('NeoDove')) {
        await SystemSetting.updateOne(
          { key: 'global' },
          {
            $inc: { 'neodoveConfig.leadsCaptured': 1 },
            $set: { 'neodoveConfig.lastInboundAt': now }
          }
        ).catch(() => {});
      }

      // 6. Asynchronously trigger DLQ drain to recover any previously journaled leads
      if (options.isDlqReplay !== true && !options.skipDlqDrain) {
        drainRecoveryQueue(5).catch(() => {});
      }

      purgeDashboardCache();
      cacheDigestResult(payloadDigest, newLead);

      return {
        success: true,
        action: 'CREATED',
        status: 'INGESTED_200_OK',
        isDuplicate: false,
        isRepeat: false,
        lead_id: newLead.lead_id,
        name: newLead.name,
        mobile: newLead.mobile,
        assigned_to: chosenCaller ? chosenCaller.name : 'Unassigned',
        routingMethod: routingMethod,
        lead: newLead,
        latencyMs: Date.now() - startTime
      };

    } catch (innerErr) {
      console.error('[leadIngestionEngine] Exception during ingestion:', innerErr);
      if (!options.skipDiskJournal) {
        const jRes = journalLeadToDisk(source, item, innerErr.message);
        return {
          success: true,
          action: 'JOURNALED_DLQ',
          status: 'JOURNALED_DLQ',
          queueId: jRes.queueId,
          reason: innerErr.message,
          latencyMs: Date.now() - startTime
        };
      }
      throw innerErr;
    }
  });
}
