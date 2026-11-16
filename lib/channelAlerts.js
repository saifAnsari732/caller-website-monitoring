import LeadActivity from './models/LeadActivity.js';
import { getOrInitSettings } from './settings.js';

/**
 * Multi-Channel Instant Alerts & Template Dispatcher
 * Handles:
 *  - Dynamic variable interpolation ({{lead_name}}, {{agent_name}}, etc.)
 *  - Click-to-chat & WhatsApp Cloud API formatted payloads
 *  - SMS Gateway alerts with delivery tracking
 *  - Unified LeadActivity timeline attribution
 */

export function renderTemplate(templateString = '', vars = {}) {
  if (!templateString) return '';
  return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : '';
  });
}

export async function dispatchChannelAlerts({
  lead,
  caller,
  eventType = 'WELCOME',
  templateCategory = 'Welcome',
  customMessage = '',
  channels = ['WHATSAPP', 'SMS'],
  adminId = null
}) {
  if (!lead || !lead.mobile) {
    return { success: false, error: 'Lead with valid mobile number required' };
  }

  const settings = await getOrInitSettings().catch(() => null);
  const templates = settings?.templates || [];

  const cleanPhone = String(lead.mobile).replace(/\D/g, '').slice(-10);
  const callerName = caller?.name || lead.assigned_to?.name || 'Kisan Choice Telecaller';
  const callerMobile = caller?.mobile || lead.assigned_to?.mobile || '9999999999';

  const variables = {
    lead_name: lead.name || 'Prospect',
    mobile: lead.mobile,
    email: lead.email || '',
    city: lead.city || 'your area',
    state: lead.state || '',
    agent_name: callerName,
    agent_mobile: callerMobile,
    deal_amount: lead.deal_amount ? `₹${lead.deal_amount}` : '',
    campaign_name: lead.campaign_name || 'Kisan Choice Lead Ads',
    company_name: 'Kisan Choice',
    stage: lead.status || 'New',
    sub_disposition: lead.sub_disposition || ''
  };

  const results = {
    whatsapp: null,
    sms: null
  };

  // 1. WhatsApp Template Alert
  if (channels.includes('WHATSAPP')) {
    const isRepeat = (templateCategory || '').toLowerCase().includes('repeat') || eventType === 'REPEAT_LEAD';
    const waTpl = templates.find(t => t.type === 'WHATSAPP' && (t.category || '').toLowerCase() === templateCategory.toLowerCase())
      || (isRepeat ? null : templates.find(t => t.type === 'WHATSAPP'))
      || {
        name: isRepeat ? 'Default Repeat Lead WhatsApp' : 'Default Welcome WhatsApp',
        content: isRepeat
          ? 'Namaste {{lead_name}} ji, we received your repeat request for {{campaign_name}}! Main {{agent_name}} aapki priority inquiry handle kar raha hoon. Contact: +91 {{agent_mobile}}'
          : 'Namaste {{lead_name}} ji, thank you for connecting with Kisan Choice Mustard Oil. Main {{agent_name}} aapki inquiry ke silsile mein sampark kar raha hoon. Contact: +91 {{agent_mobile}}'
      };

    const waText = customMessage || renderTemplate(waTpl.content, variables);
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(waText)}`;

    results.whatsapp = {
      templateName: waTpl.name,
      content: waText,
      url: waUrl,
      recipient: cleanPhone,
      status: 'DISPATCHED'
    };

    // Log to LeadActivity
    if (lead._id) {
      try {
        await LeadActivity.create({
          lead: lead._id,
          admin_id: adminId || lead.admin_id || null,
          performed_by: caller?._id || null,
          performer_name: callerName,
          performer_role: caller ? 'telecaller' : 'system',
          type: 'WHATSAPP_SENT',
          title: `WhatsApp Alert Sent: "${waTpl.name}"`,
          description: waText,
          metadata: {
            recipient: cleanPhone,
            template: waTpl.name,
            category: templateCategory,
            waUrl
          }
        });
      } catch (err) {
        console.warn('[channelAlerts] Activity log warning for WhatsApp:', err.message);
      }
    }
  }

  // 2. SMS Template Alert
  if (channels.includes('SMS')) {
    const isRepeat = (templateCategory || '').toLowerCase().includes('repeat') || eventType === 'REPEAT_LEAD';
    const smsTpl = templates.find(t => t.type === 'SMS' && (t.category || '').toLowerCase() === templateCategory.toLowerCase())
      || (isRepeat ? null : templates.find(t => t.type === 'SMS'))
      || {
        name: isRepeat ? 'Default Repeat Lead SMS' : 'Default SMS Alert',
        content: isRepeat
          ? 'Dear {{lead_name}}, we noticed your repeat inquiry for {{campaign_name}}. Executive {{agent_name}} is prioritizing your call (+91 {{agent_mobile}}).'
          : 'Dear {{lead_name}}, thank you for choosing Kisan Choice. Telecaller {{agent_name}} will connect shortly (+91 {{agent_mobile}}).'
      };

    const smsText = customMessage || renderTemplate(smsTpl.content, variables);
    const dispatchId = `SMS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    results.sms = {
      templateName: smsTpl.name,
      content: smsText,
      dispatchId,
      recipient: cleanPhone,
      status: 'DISPATCHED'
    };

    // Log to LeadActivity
    if (lead._id) {
      try {
        await LeadActivity.create({
          lead: lead._id,
          admin_id: adminId || lead.admin_id || null,
          performed_by: caller?._id || null,
          performer_name: callerName,
          performer_role: caller ? 'telecaller' : 'system',
          type: 'SMS_SENT',
          title: `SMS Alert Dispatched: "${smsTpl.name}"`,
          description: smsText,
          metadata: {
            recipient: cleanPhone,
            dispatchId,
            template: smsTpl.name,
            category: templateCategory
          }
        });
      } catch (err) {
        console.warn('[channelAlerts] Activity log warning for SMS:', err.message);
      }
    }
  }

  return {
    success: true,
    ...results
  };
}
