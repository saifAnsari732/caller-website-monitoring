import Lead from './models/Lead.js';
import LeadActivity from './models/LeadActivity.js';
import SystemSetting from './models/SystemSetting.js';

/**
 * NeoDove CRM Outbound Sync & Mirroring Service
 * Forwards captured leads to an external NeoDove instance or webhook
 * ensuring seamless bidirectional coexistence with zero lead loss.
 */

export async function syncLeadToNeoDove(lead, customSettings = null) {
  if (!lead || !lead.mobile) {
    return { skipped: true, reason: 'Invalid lead or missing mobile' };
  }

  // Prevent circular webhook loops
  if (lead.lead_source === 'NeoDove') {
    return { skipped: true, reason: 'Loop prevention: Lead originated from NeoDove' };
  }

  const settings = customSettings || await SystemSetting.findOne({ key: 'global' }).lean();
  const neodoveCfg = settings?.neodoveConfig;

  if (!neodoveCfg?.enabled || !neodoveCfg?.webhookUrl) {
    return { skipped: true, reason: 'NeoDove outbound sync is not enabled or webhookUrl is missing' };
  }

  const payload = {
    source: 'Kisan Choice CRM',
    external_lead_id: lead.lead_id,
    name: lead.name,
    mobile: lead.mobile,
    email: lead.email || '',
    city: lead.city || '',
    state: lead.state || '',
    campaign_name: lead.campaign_name || 'Native Campaign',
    lead_source: lead.lead_source || 'Kisan Choice CRM',
    deal_amount: lead.deal_amount || 0,
    stage: lead.status || 'New',
    sub_disposition: lead.sub_disposition || '',
    notes: lead.notes || '',
    assigned_to: lead.assigned_to?.name || (typeof lead.assigned_to === 'string' ? lead.assigned_to : ''),
    custom_fields: {
      join_as: lead.join_as || '',
      start_timeline: lead.start_timeline || '',
      ...(lead.custom_fields || {})
    },
    created_at: lead.createdAt || new Date()
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const headers = {
      'Content-Type': 'application/json',
      'X-CRM-Source': 'Kisan-Choice-CRM',
      'X-Lead-Id': lead.lead_id || ''
    };
    if (neodoveCfg.apiKey) {
      headers['X-Api-Key'] = neodoveCfg.apiKey;
      headers['Authorization'] = `Bearer ${neodoveCfg.apiKey}`;
    }

    const res = await fetch(neodoveCfg.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const success = res.ok;
    const resText = await res.text().catch(() => '');

    // Update lead sync status
    if (lead._id) {
      await Lead.findByIdAndUpdate(lead._id, {
        $set: {
          neodove_synced: success,
          neodove_synced_at: new Date()
        }
      });
    }

    // Increment settings stats
    if (success) {
      await SystemSetting.updateOne(
        { key: 'global' },
        {
          $inc: { 'neodoveConfig.leadsSyncedOut': 1 },
          $set: { 'neodoveConfig.lastOutboundAt': new Date() }
        }
      );
    }

    // Log to LeadActivity
    if (lead._id) {
      await LeadActivity.create({
        lead: lead._id,
        admin_id: lead.admin_id || null,
        performed_by: null,
        performer_name: 'NeoDove Sync Engine',
        performer_role: 'system',
        type: 'NEODOVE_SYNC',
        title: success ? 'Mirrored to NeoDove CRM' : 'NeoDove Sync Warning',
        description: success
          ? `Successfully mirrored lead ${lead.lead_id} to NeoDove webhook.`
          : `NeoDove webhook returned HTTP ${res.status}: ${resText.slice(0, 150)}`,
        metadata: {
          status: success ? 'SUCCESS' : 'FAILED',
          statusCode: res.status,
          webhookUrl: neodoveCfg.webhookUrl
        }
      }).catch(() => {});
    }

    return {
      success,
      statusCode: res.status,
      response: resText
    };
  } catch (err) {
    console.warn('[neodoveSync] Sync error:', err.message);

    if (lead._id) {
      await LeadActivity.create({
        lead: lead._id,
        admin_id: lead.admin_id || null,
        performed_by: null,
        performer_name: 'NeoDove Sync Engine',
        performer_role: 'system',
        type: 'NEODOVE_SYNC',
        title: 'NeoDove Outbound Sync Failed',
        description: `Failed to dispatch lead ${lead.lead_id} to NeoDove: ${err.message}`,
        metadata: {
          status: 'ERROR',
          error: err.message
        }
      }).catch(() => {});
    }

    return {
      success: false,
      error: err.message
    };
  }
}
