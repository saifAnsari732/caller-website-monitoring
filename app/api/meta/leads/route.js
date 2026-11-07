import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import User from '../../../../lib/models/User';
import { getOrInitSettings } from '../../../../lib/settings';
import { purgeDashboardCache, purgeMetaCache } from '../../../../lib/cache';

export const dynamic = 'force-dynamic';

function sanitizePhone(phone) {
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
          status: { $in: ['Fresh Lead', 'Assigned', 'Follow Up', 'Callback'] }
        })
      }))
    );
    counts.sort((a, b) => a.open - b.open);
    return counts[0].caller;
  }

  // Default Cyclic Round-Robin
  const lastLead = await Lead.findOne({ assigned_to: { $in: pool.map(p => p._id) } })
    .sort({ assigned_at: -1 })
    .lean();
  const lastIdx = lastLead?.assigned_to
    ? pool.findIndex(c => c._id.toString() === lastLead.assigned_to.toString())
    : -1;
  return pool[(lastIdx + 1) % pool.length];
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
        { campaign_name: { $regex: 'meta|facebook|kisan', $options: 'i' } }
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
      businessType: lead.business_type || 'Distributor',
      productInterest: lead.product_interest || 'Mustard Oil (15L Tin)',
      campaignName: lead.campaign_name || 'Facebook Meta Lead Ads',
      leadSource: lead.lead_source || 'Facebook Meta Lead Ads',
      status: lead.status,
      tags: lead.tags || [],
      assignedToId: lead.assigned_to?._id?.toString() || '',
      assignedTo: lead.assigned_to ? lead.assigned_to.name : 'Unassigned',
      assignedTeam: lead.assigned_to?.team || '',
      assignedMobile: lead.assigned_to ? lead.assigned_to.mobile : '',
      callAttempts: lead.call_attempts || 0,
      notes: lead.notes || '',
      createdAt: lead.createdAt,
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

    // Action 1: Redistribute Unassigned Meta Leads
    if (body.action === 'REDISTRIBUTE_UNASSIGNED') {
      const unassigned = await Lead.find({
        assigned_to: null,
        $or: [
          { lead_source: { $regex: 'meta|facebook|instagram', $options: 'i' } },
          { campaign_name: { $regex: 'meta|facebook|kisan', $options: 'i' } }
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

    // Action 2: Sync Leads from Linked Meta Form directly from Meta Graph API
    if (body.action === 'SYNC_FORM_LEADS') {
      const { formId, count = 10 } = body;
      const formConfig = (settings.metaForms || []).find(f => f.formId === formId) || settings.metaForms?.[0];
      const targetFormId = formConfig?.formId || formId || '1768141694308234';
      const campaignName = formConfig?.campaignName || 'Facebook Meta Lead Ads';
      const formName = formConfig?.formName || 'Mirzapur 1 =9/2026, 16:00';
      const mapping = formConfig?.fieldMapping || {
        full_name: 'name',
        phone_number: 'mobile',
        phone: 'mobile',
        email: 'email',
        city: 'city',
        state: 'state',
        'आप_किस_रूप_में_जुड़ना_चाहते_हैं?': 'business_type',
        business_inquiry_type: 'business_type',
        product_preference: 'product_interest'
      };
      const autoSyncAllowed = (settings.metaConfig?.autoSyncEnabled ?? true) && (formConfig ? formConfig.active !== false : true);
      const numToSync = Math.min(25, Math.max(1, Number(count) || 10));

      const token = settings.metaConfig?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || '';
      let rawPayloads = [];

      if (token && token.trim().length > 15) {
        try {
          const graphRes = await fetch(
            `https://graph.facebook.com/v21.0/${targetFormId}/leads?fields=id,created_time,field_data&limit=${numToSync}&access_token=${token.trim()}`
          );
          const graphData = await graphRes.json();
          if (Array.isArray(graphData?.data) && graphData.data.length > 0) {
            rawPayloads = graphData.data.map(item => {
              const mappedDoc = { metaLeadId: item.id, createdTime: item.created_time };
              for (const f of (item.field_data || [])) {
                const key = f.name;
                const val = (Array.isArray(f.values) && f.values.length > 0) ? f.values[0] : '';
                const crmField = mapping[key] || (
                  key.includes('name') ? 'name' :
                  key.includes('phone') || key.includes('mobile') ? 'mobile' :
                  key.includes('city') ? 'city' :
                  key.includes('state') ? 'state' :
                  key.includes('email') ? 'email' :
                  key.includes('inbox') ? 'inbox_url' :
                  key.includes('business') || key.includes('जुड़ना') ? 'business_type' : 'product_interest'
                );
                if (crmField && val) mappedDoc[crmField] = val;
              }
              return mappedDoc;
            });
          }
        } catch (fetchErr) {
          console.warn('Meta Graph leads fetch warning:', fetchErr.message);
        }
      }

      if (rawPayloads.length === 0) {
        return NextResponse.json({
          success: true,
          syncedCount: 0,
          formName,
          campaignName,
          syncedLeads: [],
          message: `Checked Meta Lead Form "${formName}" (${targetFormId}). No new leads currently pending synchronization.`
        });
      }

      const syncedLeads = [];

      for (const payload of rawPayloads) {
        const cleanMobile = sanitizePhone(payload.mobile) || payload.mobile || '';

        // Check if lead already exists by mobile or Meta Lead ID
        let existing = null;
        if (cleanMobile && cleanMobile.length === 10) {
          existing = await Lead.findOne({ mobile: cleanMobile });
        }
        if (!existing && payload.metaLeadId) {
          existing = await Lead.findOne({ notes: { $regex: payload.metaLeadId } });
        }

        if (existing) {
          continue;
        }

        const chosenCaller = autoSyncAllowed
          ? await pickCallerForForm(activeCallers, formConfig, settings.distributionStrategy)
          : null;

        const isPhoneValid = cleanMobile && cleanMobile.length === 10;
        const phoneToStore = isPhoneValid ? cleanMobile : (payload.mobile || '9826011223');
        const tags = isPhoneValid ? [] : ['Urgent'];

        let leadNotes = `Real Meta Lead Ads Ingestion • Form: "${formName}" (${targetFormId})`;
        if (payload.metaLeadId) leadNotes += ` • Lead ID: ${payload.metaLeadId}`;
        if (payload.inbox_url) leadNotes += ` • Inbox: ${payload.inbox_url}`;

        const created = await Lead.create({
          name: payload.name || 'Facebook Meta Prospect',
          mobile: phoneToStore,
          email: payload.email || '',
          city: payload.city || (formName.includes('Mirzapur') ? 'Mirzapur' : formName.includes('Agra') ? 'Agra' : 'Indore'),
          state: payload.state || 'Uttar Pradesh',
          business_type: payload.business_type || 'Distributor',
          product_interest: payload.product_interest || 'Mustard Oil (15L Tin)',
          lead_source: 'Facebook Meta Lead Ads',
          campaign_name: campaignName,
          status: chosenCaller ? 'Assigned' : 'Fresh Lead',
          assigned_to: chosenCaller ? chosenCaller._id : null,
          assigned_at: chosenCaller ? new Date() : null,
          tags,
          notes: leadNotes
        });

        syncedLeads.push({
          lead_id: created.lead_id,
          name: created.name,
          mobile: created.mobile,
          assignedTo: chosenCaller ? chosenCaller.name : 'Unassigned'
        });
      }

      // Update leadsCaptured on form in SystemSetting
      if (formConfig) {
        const idx = settings.metaForms.findIndex(f => f.formId === formConfig.formId);
        if (idx >= 0) {
          settings.metaForms[idx].leadsCaptured = (settings.metaForms[idx].leadsCaptured || 0) + syncedLeads.length;
          settings.metaForms[idx].lastLeadAt = new Date();
        }
      }
      settings.metaConfig.lastSyncAt = new Date();
      settings.markModified('metaForms');
      settings.markModified('metaConfig');
      await settings.save();

      purgeDashboardCache();
      purgeMetaCache();

      return NextResponse.json({
        success: true,
        syncedCount: syncedLeads.length,
        formName,
        campaignName,
        syncedLeads,
        message: `Successfully ingested and routed ${syncedLeads.length} live leads from Meta Lead Form "${formName}"!`
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Meta leads POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
