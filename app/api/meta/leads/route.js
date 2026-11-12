import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import { getOrInitSettings } from '../../../../lib/settings';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';
import { parseMetaLeadItem, sanitizePhone } from '../../../../lib/metaLeadParser';
import { requireAdminApi } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function pickCallerForForm(activeCallers, formConfig, globalStrategy) {
  if (!activeCallers || activeCallers.length === 0) return null;

  if (formConfig?.distributionRule === 'DIRECT_CALLER' && formConfig?.assignedCallerId) {
    const direct = activeCallers.find(c => c._id.toString() === formConfig.assignedCallerId.toString());
    if (direct) return direct;
  }

  let pool = activeCallers;
  if (formConfig?.assignedTeam) {
    const teamMembers = activeCallers.filter(
      c => (c.team || '').toLowerCase() === formConfig.assignedTeam.toLowerCase()
    );
    if (teamMembers.length > 0) pool = teamMembers;
  }

  const rule = formConfig?.distributionRule || globalStrategy || 'ROUND_ROBIN';

  if (rule === 'LOAD_BALANCED') {
    const counts = await Promise.all(
      pool.map(async (c) => ({
        caller: c,
        open: await Lead.countDocuments({
          assigned_to: c._id,
          status: { $in: ['Fresh Lead', 'Assigned', 'In-Progress', 'Follow Up', 'Callback'] }
        })
      }))
    );
    counts.sort((a, b) => a.open - b.open);
    return counts[0].caller;
  }

  // Atomic round-robin counter prevents race-condition collisions during concurrent lead bursts
  const CounterModel = (await import('../../../../lib/models/Counter.js')).default;
  const poolKey = `rr_${formConfig?.formId || formConfig?.assignedTeam || 'global'}`;
  const counter = await CounterModel.findOneAndUpdate(
    { _id: poolKey },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  const callerIdx = Math.abs((counter?.seq || 0) % pool.length);
  return pool[callerIdx];
}

export async function GET(request) {
  try {
    await connectDB();
    const settings = await getOrInitSettings();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const campaign = searchParams.get('campaign') || '';
    const callerId = searchParams.get('callerId') || '';

    const baseMetaFilter = {
      $or: [
        { lead_source: { $regex: 'meta|facebook|instagram', $options: 'i' } },
        { campaign_name: { $ne: '' } }
      ]
    };

    const andConditions = [baseMetaFilter];

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
          { lead_id: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
          { product_interest: { $regex: search, $options: 'i' } },
          { campaign_name: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (status) {
      andConditions.push({ status });
    }

    if (campaign) {
      andConditions.push({
        $or: [
          { campaign_name: { $regex: campaign, $options: 'i' } },
          { notes: { $regex: campaign, $options: 'i' } }
        ]
      });
    }

    if (callerId) {
      andConditions.push({
        assigned_to: callerId === 'UNASSIGNED' ? null : callerId
      });
    }

    const query = andConditions.length === 1 ? baseMetaFilter : { $and: andConditions };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      total,
      leads,
      todayCount,
      assignedCount,
      unassignedCount,
      convertedCount,
      zeroLossCount,
      telecallers
    ] = await Promise.all([
      Lead.countDocuments(query),
      Lead.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('assigned_to', 'name _id mobile team')
        .lean(),
      Lead.countDocuments({ ...baseMetaFilter, createdAt: { $gte: todayStart } }),
      Lead.countDocuments({ ...baseMetaFilter, assigned_to: { $ne: null } }),
      Lead.countDocuments({ ...baseMetaFilter, assigned_to: null }),
      Lead.countDocuments({ ...baseMetaFilter, status: 'Closed' }),
      Lead.countDocuments({ ...baseMetaFilter, tags: 'Urgent' }),
      User.find({ role: 'telecaller' }).select('name _id mobile team status on_leave shift_status').lean()
    ]);

    const formatted = leads.map(lead => ({
      id: lead._id.toString(),
      leadId: lead.lead_id,
      name: lead.name,
      mobile: lead.mobile,
      email: lead.email || '',
      city: lead.city || '',
      state: lead.state || '',
      businessType: lead.business_type || '',
      productInterest: lead.product_interest || '',
      campaignName: lead.campaign_name || '',
      leadSource: lead.lead_source || 'Facebook Meta Lead Ads',
      status: lead.status,
      tags: lead.tags || [],
      assignedToId: lead.assigned_to?._id?.toString() || '',
      assignedTo: lead.assigned_to ? lead.assigned_to.name : 'Unassigned',
      assignedTeam: lead.assigned_to?.team || '',
      assignedMobile: lead.assigned_to ? lead.assigned_to.mobile : '',
      callAttempts: lead.call_attempts || 0,
      notes: lead.notes || '',
      createdAt: lead.createdAt
    }));

    return NextResponse.json({
      leads: formatted,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      kpis: {
        total,
        todayCount,
        assignedCount,
        unassignedCount,
        convertedCount,
        zeroLossCount
      },
      telecallers,
      metaForms: settings.metaForms || []
    });
  } catch (error) {
    console.error('Meta leads fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminPayload = await requireAdminApi(request);
    await connectDB();
    const body = await request.json();
    const settings = await getOrInitSettings();

    let activeCallers = await User.find({
      role: 'telecaller',
      status: 'active',
      on_leave: false,
      shift_status: { $ne: 'Clocked Out' }
    }).sort({ _id: 1 });

    if (activeCallers.length === 0) {
      activeCallers = await User.find({ role: 'telecaller', status: 'active' }).sort({ _id: 1 });
    }

    if (body.action === 'REDISTRIBUTE_UNASSIGNED') {
      const unassigned = await Lead.find({
        assigned_to: null,
        $or: [
          { lead_source: { $regex: 'meta|facebook|instagram', $options: 'i' } },
          { campaign_name: { $ne: '' } }
        ]
      });

      let count = 0;
      for (const lead of unassigned) {
        const caller = await pickCallerForForm(activeCallers, null, settings.distributionStrategy);
        if (caller) {
          lead.assigned_to = caller._id;
          lead.assigned_at = new Date();
          lead.status = 'Assigned';
          await lead.save();
          count++;
        }
      }

      purgeDashboardCache();
      purgeMetaCache();

      return NextResponse.json({
        success: true,
        redistributedCount: count,
        message: `Assigned ${count} unassigned Meta leads across active telecallers.`
      });
    }

    if (body.action === 'INGEST_SINGLE_LEAD') {
      const { leadData, formId } = body;
      if (!leadData) {
        return NextResponse.json({ error: 'leadData is required' }, { status: 400 });
      }

      const formConfig = (settings.metaForms || []).find(f => f.formId === formId);
      const formName = formConfig?.formName || leadData.form_name || '';
      const campaignName = leadData.campaign_name || formConfig?.campaignName || formName;

      const cleanMobile = sanitizePhone(leadData.phone || leadData.mobile);
      const rawPhone = String(leadData.phone || leadData.mobile || '').trim();
      if (!cleanMobile && !rawPhone) {
        return NextResponse.json({ error: 'Lead does not contain a phone number.' }, { status: 400 });
      }

      const isPhoneValid = cleanMobile.length === 10;
      const phoneToStore = isPhoneValid ? cleanMobile : rawPhone;
      const tags = isPhoneValid ? [] : ['Urgent'];

      let existing = null;
      if (leadData.id) {
        existing = await Lead.findOne({
          $or: [
            { meta_lead_id: String(leadData.id) },
            { notes: { $regex: String(leadData.id) } }
          ]
        });
      }
      if (!existing && isPhoneValid) {
        existing = await Lead.findOne({ mobile: cleanMobile });
      }

      if (existing) {
        return NextResponse.json({
          success: true,
          alreadyExists: true,
          lead_id: existing.lead_id,
          message: `Lead "${existing.name}" (${existing.mobile}) already exists in CRM.`
        });
      }

      const chosenCaller = await pickCallerForForm(activeCallers, formConfig, settings.distributionStrategy);

      const noteParts = [`Meta Lead Form: "${formName || formId || 'Meta'}"`];
      if (leadData.id) noteParts.push(`Meta Lead ID: ${leadData.id}`);
      if (leadData.ad_name) noteParts.push(`Ad: ${leadData.ad_name}`);
      if (leadData.inbox_url) noteParts.push(`Inbox: ${leadData.inbox_url}`);

      const created = await Lead.create({
        admin_id: adminPayload?.id || null,
        name: (leadData.full_name || leadData.name || '').trim() || `Meta Lead ${leadData.id || ''}`.trim(),
        mobile: phoneToStore,
        email: (leadData.email || '').trim(),
        city: (leadData.city || '').trim(),
        state: (leadData.state || '').trim(),
        business_type: (leadData.business_type || leadData.custom_question_1 || '').trim(),
        product_interest: (leadData.product_interest || leadData.custom_question_2 || '').trim(),
        join_as: (leadData.join_as || leadData.business_type || leadData.custom_question_1 || '').trim(),
        start_timeline: (leadData.start_timeline || leadData.product_interest || leadData.custom_question_2 || '').trim(),
        meta_lead_id: String(leadData.id || ''),
        meta_form_id: String(formId || ''),
        lead_source: 'Facebook Meta Lead Ads',
        campaign_name: campaignName,
        status: chosenCaller ? 'Assigned' : 'Fresh Inquiry',
        lead_status: 'In-Progress',
        assigned_to: chosenCaller ? chosenCaller._id : null,
        assigned_at: chosenCaller ? new Date() : null,
        tags,
        notes: noteParts.join(' • '),
        ...(leadData.created_time ? { createdAt: new Date(leadData.created_time) } : {})
      });

      if (formConfig) {
        const idx = settings.metaForms.findIndex(f => f.formId === formConfig.formId);
        if (idx >= 0) {
          settings.metaForms[idx].lastLeadAt = new Date();
          settings.markModified('metaForms');
          await settings.save();
        }
      }

      purgeDashboardCache();
      purgeMetaCache();

      return NextResponse.json({
        success: true,
        lead_id: created.lead_id,
        name: created.name,
        mobile: created.mobile,
        assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned',
        message: `Successfully pushed "${created.name}" to CRM and assigned to ${chosenCaller ? chosenCaller.name : 'Queue'}.`
      });
    }

    if (body.action === 'SYNC_FORM_LEADS') {
      const { formId, count = 15 } = body;
      const token = settings.metaConfig?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || '';
      if (!token || token.trim().length < 15) {
        return NextResponse.json({ error: 'Meta Page Access Token is not configured.' }, { status: 400 });
      }

      const numToSync = Math.min(50, Math.max(1, Number(count) || 15));
      const autoSyncAllowed = settings.metaConfig?.autoSyncEnabled ?? true;

      let formsToSync = [];
      if (formId) {
        const matched = (settings.metaForms || []).find(f => f.formId === formId);
        formsToSync = [matched || { formId, formName: '', campaignName: '', active: true }];
      } else {
        formsToSync = (settings.metaForms || []).filter(f => f.active !== false);
      }

      if (formsToSync.length === 0) {
        return NextResponse.json({
          success: true,
          syncedCount: 0,
          syncedLeads: [],
          message: 'No active Meta Lead Forms found to sync.'
        });
      }

      const syncedLeads = [];

      for (const fCfg of formsToSync) {
        try {
          const graphRes = await fetch(
            `https://graph.facebook.com/v21.0/${fCfg.formId}/leads?fields=id,created_time,ad_name,campaign_name,form_id,field_data&limit=${numToSync}&access_token=${encodeURIComponent(token.trim())}`,
            { cache: 'no-store' }
          );
          const graphData = await graphRes.json();
          if (!Array.isArray(graphData?.data) || graphData.data.length === 0) continue;

          for (const item of graphData.data) {
            const parsed = parseMetaLeadItem(item, fCfg.formName || '');
            if (!parsed.name && !parsed.mobile && !parsed.rawMobile) continue;

            const isPhoneValid = parsed.mobile.length === 10;
            const phoneToStore = isPhoneValid ? parsed.mobile : parsed.rawMobile;
            if (!phoneToStore) continue;

            let existing = null;
            if (parsed.metaLeadId) {
              existing = await Lead.findOne({
                $or: [
                  { meta_lead_id: parsed.metaLeadId },
                  { notes: { $regex: parsed.metaLeadId } }
                ]
              });
            }
            if (!existing && isPhoneValid) {
              existing = await Lead.findOne({ mobile: parsed.mobile });
            }
            if (existing) continue;

            const chosenCaller = autoSyncAllowed && fCfg.active !== false
              ? await pickCallerForForm(activeCallers, fCfg, settings.distributionStrategy)
              : null;

            const created = await Lead.create({
              admin_id: adminPayload?.id || null,
              name: parsed.name || `Meta Lead ${parsed.metaLeadId}`,
              mobile: phoneToStore,
              email: parsed.email,
              city: parsed.city,
              state: parsed.state,
              business_type: parsed.businessType,
              product_interest: parsed.productInterest,
              join_as: parsed.join_as || parsed.businessType || '',
              start_timeline: parsed.start_timeline || parsed.productInterest || '',
              meta_lead_id: parsed.metaLeadId || '',
              meta_form_id: fCfg.formId || '',
              lead_source: 'Facebook Meta Lead Ads',
              campaign_name: parsed.campaignName || fCfg.campaignName || fCfg.formName || '',
              status: chosenCaller ? 'Assigned' : 'Fresh Inquiry',
              lead_status: 'In-Progress',
              assigned_to: chosenCaller ? chosenCaller._id : null,
              assigned_at: chosenCaller ? new Date() : null,
              tags: isPhoneValid ? [] : ['Urgent'],
              notes: parsed.notes,
              ...(parsed.createdTime ? { createdAt: parsed.createdTime } : {})
            });

            syncedLeads.push({
              lead_id: created.lead_id,
              name: created.name,
              mobile: created.mobile,
              assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned'
            });
          }
        } catch (fetchErr) {
          console.warn(`Meta Graph leads fetch warning for ${fCfg.formId}:`, fetchErr.message);
        }
      }

      settings.metaConfig.lastSyncAt = new Date();
      settings.markModified('metaConfig');
      await settings.save();

      purgeDashboardCache();
      purgeMetaCache();

      const label = formId
        ? `Meta Form "${formsToSync[0]?.formName || formId}"`
        : `${formsToSync.length} active Meta Lead Forms`;

      return NextResponse.json({
        success: true,
        syncedCount: syncedLeads.length,
        syncedLeads,
        message: syncedLeads.length > 0
          ? `Successfully ingested ${syncedLeads.length} new leads from ${label}.`
          : `Checked ${label}. All leads are already up to date in CRM.`
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Meta leads POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
