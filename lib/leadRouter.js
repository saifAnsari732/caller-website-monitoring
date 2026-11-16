import connectDB from './db.js';
import User from './models/User.js';
import Lead from './models/Lead.js';
import Counter from './models/Counter.js';
import { getOrInitSettings } from './settings.js';

/**
 * Smart Lead Routing & Auto-Assignment Engine
 * Supports:
 *  1. Region / State / City matching
 *  2. Team / Skill / Language matching
 *  3. Explicit Routing Rules from SystemSetting
 *  4. Load-Balanced Distribution (least open leads)
 *  5. Atomic Cyclic Round-Robin (zero collision concurrency)
 */

// In-flight load balance tracking to prevent race conditions during burst assignments
const inFlightReservations = new Map();

export function reserveCallerFlight(callerId) {
  if (!callerId) return;
  const id = callerId.toString();
  inFlightReservations.set(id, (inFlightReservations.get(id) || 0) + 1);
}

export function releaseCallerFlight(callerId) {
  if (!callerId) return;
  const id = callerId.toString();
  const current = inFlightReservations.get(id) || 0;
  if (current <= 1) {
    inFlightReservations.delete(id);
  } else {
    inFlightReservations.set(id, current - 1);
  }
}

export function getInFlightReservations(callerId) {
  if (!callerId) return 0;
  return inFlightReservations.get(callerId.toString()) || 0;
}

const STATE_ALIASES = {
  'up': ['uttar pradesh', 'u.p.', 'up'],
  'uttar pradesh': ['uttar pradesh', 'u.p.', 'up'],
  'mp': ['madhya pradesh', 'm.p.', 'mp'],
  'madhya pradesh': ['madhya pradesh', 'm.p.', 'mp'],
  'rj': ['rajasthan', 'rj'],
  'rajasthan': ['rajasthan', 'rj'],
  'bihar': ['bihar', 'br'],
  'haryana': ['haryana', 'hr'],
  'delhi': ['delhi', 'ncr', 'new delhi'],
  'punjab': ['punjab', 'pb'],
  'gujarat': ['gujarat', 'gj'],
  'maharashtra': ['maharashtra', 'mh']
};

function matchesLocation(actual, target) {
  if (!actual || !target) return false;
  const a = actual.trim().toLowerCase();
  const t = target.trim().toLowerCase();
  if (a === t || a.includes(t) || t.includes(a)) return true;

  // Check aliases
  for (const [key, list] of Object.entries(STATE_ALIASES)) {
    if (list.includes(t) && list.some(alias => a.includes(alias))) {
      return true;
    }
  }
  return false;
}

export async function routeLead(leadData = {}, options = {}) {
  await connectDB();
  const settings = await getOrInitSettings();

  // 1. Fetch eligible telecallers (prefer active & clocked in)
  let activeCallers = await User.find({
    role: 'telecaller',
    status: { $in: ['active', 'ACTIVE'] },
    on_leave: false,
    shift_status: { $ne: 'Clocked Out' }
  }).sort({ _id: 1 });

  // Fallback to all active telecallers if everyone is off-shift
  if (activeCallers.length === 0) {
    activeCallers = await User.find({
      role: 'telecaller',
      status: { $in: ['active', 'ACTIVE'] }
    }).sort({ _id: 1 });
  }

  if (activeCallers.length === 0) {
    return {
      caller: null,
      method: 'UNASSIGNED',
      reason: 'No active telecallers found in database'
    };
  }

  // 2. Check Form-level override (if formId provided)
  if (leadData.formId) {
    const matchedForm = (settings.metaForms || []).find(f => f.formId === leadData.formId);
    if (matchedForm) {
      if (matchedForm.distributionRule === 'DIRECT_CALLER' && matchedForm.assignedCallerId) {
        const direct = activeCallers.find(c => c._id.toString() === matchedForm.assignedCallerId.toString());
        if (direct) {
          return {
            caller: direct,
            method: 'FORM_DIRECT_CALLER',
            ruleName: `Form: ${matchedForm.formName}`,
            reason: `Directly assigned to ${direct.name}`
          };
        }
      }
      if (matchedForm.assignedTeam) {
        const teamCallers = activeCallers.filter(
          c => (c.team || '').toLowerCase() === matchedForm.assignedTeam.toLowerCase()
        );
        if (teamCallers.length > 0) {
          const counterKey = `rr_form_${matchedForm.formId}`;
          const counter = await Counter.findOneAndUpdate(
            { _id: counterKey },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
          );
          const idx = Math.abs((counter?.seq || 0) % teamCallers.length);
          return {
            caller: teamCallers[idx],
            method: 'FORM_TEAM_ROUND_ROBIN',
            ruleName: `Form Team: ${matchedForm.assignedTeam}`,
            reason: `Assigned via form team pool to ${teamCallers[idx].name}`
          };
        }
      }
    }
  }

  // 3. Evaluate Configured Routing Rules (Region, State, City, Source Matching)
  const rules = (settings.routingRules || []).filter(r => r.active !== false);
  for (const rule of rules) {
    const srcMatch = !rule.source || rule.source === 'ALL' ||
      (leadData.lead_source && leadData.lead_source.toLowerCase().includes(rule.source.toLowerCase())) ||
      (leadData.campaign_name && leadData.campaign_name.toLowerCase().includes(rule.source.toLowerCase()));

    if (!srcMatch) continue;

    let valueMatch = false;
    const matchField = (rule.matchField || 'state').toLowerCase();
    const matchVal = (rule.matchValue || '').trim().toLowerCase();

    if (!matchVal) {
      valueMatch = true; // Wildcard
    } else if (matchField === 'state') {
      valueMatch = matchesLocation(leadData.state, matchVal);
    } else if (matchField === 'city') {
      valueMatch = matchesLocation(leadData.city, matchVal);
    } else if (matchField === 'business_type') {
      const actual = `${leadData.business_type || ''} ${leadData.join_as || ''}`.toLowerCase();
      valueMatch = actual.includes(matchVal);
    } else if (matchField === 'campaign') {
      valueMatch = (leadData.campaign_name || '').toLowerCase().includes(matchVal);
    }

    if (valueMatch) {
      // Check target caller
      if (rule.targetCallerId) {
        const direct = activeCallers.find(c => c._id.toString() === rule.targetCallerId.toString());
        if (direct) {
          return {
            caller: direct,
            method: 'RULE_DIRECT_CALLER',
            ruleName: rule.name,
            reason: `Matched rule "${rule.name}" (${rule.matchField}=${rule.matchValue})`
          };
        }
      }

      // Check target team
      if (rule.targetTeam) {
        const teamCallers = activeCallers.filter(
          c => (c.team || '').toLowerCase() === rule.targetTeam.toLowerCase()
        );
        if (teamCallers.length > 0) {
          const counterKey = `rr_rule_${rule._id || rule.name.replace(/\s+/g, '_')}`;
          const counter = await Counter.findOneAndUpdate(
            { _id: counterKey },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
          );
          const idx = Math.abs((counter?.seq || 0) % teamCallers.length);
          return {
            caller: teamCallers[idx],
            method: 'RULE_TEAM_ROUND_ROBIN',
            ruleName: rule.name,
            team: rule.targetTeam,
            reason: `Matched rule "${rule.name}" (${rule.matchField}=${rule.matchValue}) via ${rule.targetTeam}`
          };
        }
      }
    }
  }

  // 4. Caller Geographic & Skill Affinity (Check assigned_states, assigned_cities, languages)
  if (leadData.state || leadData.city) {
    const affinityCallers = activeCallers.filter(c => {
      const matchState = Array.isArray(c.assigned_states) && c.assigned_states.some(s => matchesLocation(leadData.state, s));
      const matchCity = Array.isArray(c.assigned_cities) && c.assigned_cities.some(ci => matchesLocation(leadData.city, ci));
      return matchState || matchCity;
    });

    if (affinityCallers.length > 0) {
      const counterKey = `rr_affinity_${leadData.state || leadData.city}`.replace(/\s+/g, '_');
      const counter = await Counter.findOneAndUpdate(
        { _id: counterKey },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      const idx = Math.abs((counter?.seq || 0) % affinityCallers.length);
      return {
        caller: affinityCallers[idx],
        method: 'GEOGRAPHIC_AFFINITY',
        reason: `Matched location affinity for ${leadData.city || leadData.state}`
      };
    }
  }

  // 5. Global Strategy: LOAD_BALANCED
  const strategy = options.strategy || settings.distributionStrategy || 'ROUND_ROBIN';
  if (strategy === 'LOAD_BALANCED') {
    const counts = await Promise.all(
      activeCallers.map(async (c) => ({
        caller: c,
        open: (await Lead.countDocuments({
          assigned_to: c._id,
          status: { $in: ['Fresh Lead', 'Fresh Inquiry', 'New', 'Assigned', 'In-Progress', 'Follow Up', 'Callback', 'Callback Scheduled'] }
        })) + getInFlightReservations(c._id)
      }))
    );
    counts.sort((a, b) => a.open - b.open);
    return {
      caller: counts[0].caller,
      method: 'LOAD_BALANCED',
      reason: `Least pending leads in pipeline (${counts[0].open} open leads)`
    };
  }

  // 6. Default: Atomic Cyclic Round-Robin
  const poolKey = `rr_global_${leadData.lead_source || 'crm'}`.replace(/\s+/g, '_');
  const counter = await Counter.findOneAndUpdate(
    { _id: poolKey },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  const callerIdx = Math.abs((counter?.seq || 0) % activeCallers.length);
  return {
    caller: activeCallers[callerIdx],
    method: 'ROUND_ROBIN',
    reason: `Atomic round-robin cyclic rotation (${callerIdx + 1}/${activeCallers.length})`
  };
}
