/**
 * Pure Meta Graph API v21.0 Lead Field Parser
 * Zero dummy fallbacks — preserves exact prospect answers from Meta Lead Ads forms.
 */

export function sanitizePhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  cleaned = cleaned.replace(/^\+91/, '').replace(/^91/, '');
  cleaned = cleaned.replace(/\D/g, '');
  if (cleaned.length === 10 && !/^0+$/.test(cleaned)) return cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
    if (cleaned.length === 10 && !/^0+$/.test(cleaned)) return cleaned;
  }
  return '';
}

export function humanizeMetaAnswer(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMetaLeadItem(item, formNameOrMapping = '', maybeMapping = null) {
  const formName = typeof formNameOrMapping === 'string'
    ? formNameOrMapping.trim()
    : String(formNameOrMapping?.formName || '').trim();

  const customMapping = (maybeMapping && typeof maybeMapping === 'object')
    ? maybeMapping
    : (formNameOrMapping && typeof formNameOrMapping === 'object' && !Array.isArray(formNameOrMapping))
      ? (formNameOrMapping.fieldMapping || formNameOrMapping)
      : {};

  const metaLeadId = item?.id ? String(item.id) : '';
  const createdTime = item?.created_time ? new Date(item.created_time) : new Date();
  const campaignName = item?.campaign_name ? String(item.campaign_name).trim() : '';
  const adName = item?.ad_name ? String(item.ad_name).trim() : '';
  const formId = item?.form_id ? String(item.form_id) : '';

  let name = '';
  let rawPhone = '';
  let email = '';
  let city = '';
  let state = '';
  let business_type = '';
  let product_interest = '';
  let inbox_url = '';
  const extraAnswers = [];

  for (const field of item?.field_data || []) {
    const rawKey = String(field?.name || '').trim();
    const keyLower = rawKey.toLowerCase();
    const rawVal = Array.isArray(field?.values) && field.values.length > 0
      ? String(field.values[0] || '').trim()
      : '';
    if (!rawVal) continue;

    const mappedTarget = customMapping?.[rawKey];

    if (keyLower === 'inbox_url' || keyLower.includes('inbox') || /^https?:\/\/business\.facebook\.com\/latest\//i.test(rawVal)) {
      inbox_url = rawVal;
    } else if (mappedTarget === 'name' || (!mappedTarget && (keyLower === 'full_name' || (keyLower.includes('name') && !keyLower.includes('company'))))) {
      name = rawVal;
    } else if (mappedTarget === 'mobile' || (!mappedTarget && (keyLower.includes('phone') || keyLower.includes('mobile') || keyLower.includes('whatsapp') || keyLower.includes('contact')))) {
      rawPhone = rawVal;
    } else if (mappedTarget === 'email' || (!mappedTarget && keyLower.includes('email'))) {
      email = rawVal.toLowerCase();
    } else if (mappedTarget === 'city' || (!mappedTarget && (keyLower.includes('city') || keyLower.includes('district') || keyLower.includes('शहर') || keyLower.includes('जिला')))) {
      city = humanizeMetaAnswer(rawVal);
    } else if (mappedTarget === 'state' || (!mappedTarget && (keyLower.includes('state') || keyLower.includes('province') || keyLower.includes('राज्य')))) {
      state = humanizeMetaAnswer(rawVal);
    } else if (
      mappedTarget === 'business_type' ||
      (!mappedTarget && (keyLower.includes('business') || keyLower.includes('जुड़ना') || keyLower.includes('company') || keyLower.includes('role') || keyLower.includes('education')))
    ) {
      business_type = humanizeMetaAnswer(rawVal);
    } else if (
      mappedTarget === 'product_interest' ||
      (!mappedTarget && (keyLower.includes('product') || keyLower.includes('कब_शुरू') || keyLower.includes('शुरू') || keyLower.includes('requirement') || keyLower.includes('post') || keyLower.includes('experience')))
    ) {
      product_interest = humanizeMetaAnswer(rawVal);
    } else {
      const cleaned = humanizeMetaAnswer(rawVal);
      if (!product_interest) {
        product_interest = `${humanizeMetaAnswer(rawKey)}: ${cleaned}`;
      } else {
        extraAnswers.push(`${humanizeMetaAnswer(rawKey)}: ${cleaned}`);
      }
    }
  }

  const cleanMobile = sanitizePhone(rawPhone);

  const noteParts = ['Meta Lead Ads Ingestion'];
  if (formName) {
    noteParts.push(`Form: "${formName}"${formId ? ` (${formId})` : ''}`);
  } else if (formId) {
    noteParts.push(`Form ID: ${formId}`);
  }
  if (adName) noteParts.push(`Ad: "${adName}"`);
  if (metaLeadId) noteParts.push(`Lead ID: ${metaLeadId}`);
  if (inbox_url) noteParts.push(`Inbox: ${inbox_url}`);
  if (extraAnswers.length > 0) noteParts.push(extraAnswers.join(' | '));

  return {
    metaLeadId,
    createdTime,
    campaignName,
    adName,
    formId,
    name,
    mobile: cleanMobile,
    cleanMobile,
    rawMobile: rawPhone,
    rawPhone,
    email,
    city,
    state,
    businessType: business_type,
    business_type,
    productInterest: product_interest,
    product_interest,
    inbox_url,
    extraAnswers,
    notes: noteParts.join(' • ')
  };
}
