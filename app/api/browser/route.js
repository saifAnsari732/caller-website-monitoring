import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Lead from '../../../lib/models/Lead';
import User from '../../../lib/models/User';
import { getOrInitSettings } from '../../../lib/settings';
import { parseMetaLeadItem, sanitizePhone } from '../../../lib/metaLeadParser';

export const dynamic = 'force-dynamic';

function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request) {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    const { searchParams } = new URL(request.url);
    const requestedFormId = searchParams.get('formId') || 'ALL';
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '100', 10)));

    const token = (settings.metaConfig?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || '').trim();
    const storedForm = (settings.metaForms || []).find(f => String(f.formId) === String(requestedFormId));

    let graphLeads = [];
    let formDetails = storedForm
      ? {
          id: storedForm.formId,
          name: storedForm.formName,
          status: storedForm.active !== false ? 'ACTIVE' : 'PAUSED',
          leads_count: storedForm.leadsCaptured || 0,
          questions: []
        }
      : null;

    // 1. If a specific form is requested and token exists, try live Meta Graph API
    if (requestedFormId && requestedFormId !== 'ALL' && token.length > 20) {
      try {
        const fRes = await fetch(
          `https://graph.facebook.com/v21.0/${requestedFormId}?fields=id,name,status,leads_count,questions,created_time&access_token=${encodeURIComponent(token)}`,
          { cache: 'no-store' }
        );
        const fJson = await fRes.json();
        if (fJson && !fJson.error) {
          formDetails = fJson;
        }
      } catch (err) {
        console.warn('Form details fetch warning:', err.message);
      }

      try {
        const lRes = await fetch(
          `https://graph.facebook.com/v21.0/${requestedFormId}/leads?fields=id,created_time,ad_name,campaign_name,form_id,field_data&limit=${limit}&access_token=${encodeURIComponent(token)}`,
          { cache: 'no-store' }
        );
        const lData = await lRes.json();
        if (Array.isArray(lData?.data)) {
          graphLeads = lData.data.map(item => {
            const parsed = parseMetaLeadItem(item, formDetails?.name || '');
            const fieldMap = {};
            for (const fd of (item.field_data || [])) {
              fieldMap[fd.name] = Array.isArray(fd.values) && fd.values.length > 0 ? fd.values[0] : '';
            }
            return {
              id: String(item.id),
              created_time: item.created_time,
              ad_name: item.ad_name || '',
              campaign_name: item.campaign_name || parsed.campaignName || formDetails?.name || '',
              form_name: formDetails?.name || '',
              fields: fieldMap,
              full_name: parsed.name,
              phone: parsed.mobile || parsed.rawMobile,
              email: parsed.email,
              city: parsed.city,
              state: parsed.state,
              business_type: parsed.businessType,
              product_interest: parsed.productInterest,
              inbox_url: fieldMap.inbox_url || '',
              custom_question_1: parsed.businessType,
              custom_question_2: parsed.productInterest,
              inCrm: false,
              crmStatus: 'Unsynced',
              assignedCaller: null
            };
          });
        }
      } catch (err) {
        console.warn('Leads fetch warning:', err.message);
      }
    }

    // 2. Also query MongoDB for real captured Meta leads matching this form (or ALL Meta leads)
    const formName = formDetails?.name || storedForm?.formName || '';
    let dbQuery = null;

    if (requestedFormId === 'ALL') {
      dbQuery = {
        $or: [
          { lead_source: { $regex: 'meta|facebook|instagram', $options: 'i' } },
          { notes: { $regex: 'Meta', $options: 'i' } }
        ]
      };
    } else {
      const orClauses = [{ notes: { $regex: escapeRegex(requestedFormId), $options: 'i' } }];
      if (formName) {
        const escapedName = escapeRegex(formName.trim());
        orClauses.push({ notes: { $regex: `"${escapedName}"`, $options: 'i' } });
        orClauses.push({ campaign_name: new RegExp(`^${escapedName}$`, 'i') });
      }
      dbQuery = { $or: orClauses };
    }

    const dbLeadsRaw = await Lead.find(dbQuery)
      .populate('assigned_to', 'name mobile employee_id')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Map DB leads by clean phone for deduplication & enrichment
    const dbByPhone = new Map();
    const formattedDbLeads = dbLeadsRaw.map(doc => {
      const clean = sanitizePhone(doc.mobile);
      if (clean) dbByPhone.set(clean, doc);

      // Extract form name or inbox url from notes if present
      const formMatch = (doc.notes || '').match(/Meta (?:Lead )?Form[:\s]+"([^"]+)"/i);
      const inboxMatch = (doc.notes || '').match(/Inbox:\s*(https?:\/\/\S+)/i);

      return {
        id: doc.lead_id || String(doc._id),
        lead_id: doc.lead_id || '',
        dbId: String(doc._id),
        created_time: doc.createdAt,
        ad_name: '',
        campaign_name: doc.campaign_name || (formMatch ? formMatch[1] : formName),
        form_name: formMatch ? formMatch[1] : (doc.campaign_name || formName || 'Meta Lead Ads'),
        fields: {},
        full_name: doc.name,
        phone: doc.mobile,
        email: doc.email || '',
        city: doc.city || '',
        state: doc.state || '',
        business_type: doc.business_type || '',
        product_interest: doc.product_interest || '',
        inbox_url: inboxMatch ? inboxMatch[1] : '',
        custom_question_1: doc.business_type || '',
        custom_question_2: doc.product_interest || '',
        inCrm: true,
        crmStatus: doc.status || 'Assigned',
        assignedCaller: doc.assigned_to ? doc.assigned_to.name : 'Unassigned'
      };
    });

    // Merge: enrich graphLeads with DB status, then append any DB leads not in graphLeads
    const seenPhones = new Set();
    const mergedLeads = [];

    for (const gl of graphLeads) {
      const clean = sanitizePhone(gl.phone);
      const matchedDb = clean ? dbByPhone.get(clean) : null;
      if (clean) seenPhones.add(clean);

      if (matchedDb) {
        mergedLeads.push({
          ...gl,
          lead_id: matchedDb.lead_id || '',
          dbId: String(matchedDb._id),
          inCrm: true,
          crmStatus: matchedDb.status || 'Assigned',
          assignedCaller: matchedDb.assigned_to ? matchedDb.assigned_to.name : 'Unassigned'
        });
      } else {
        mergedLeads.push(gl);
      }
    }

    for (const dl of formattedDbLeads) {
      const clean = sanitizePhone(dl.phone);
      if (clean && seenPhones.has(clean)) continue;
      if (clean) seenPhones.add(clean);
      mergedLeads.push(dl);
    }

    return NextResponse.json({
      success: true,
      formId: requestedFormId,
      formDetails,
      totalFetched: mergedLeads.length,
      leads: mergedLeads
    });
  } catch (error) {
    console.error('Browser API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
