import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Lead from '../../../lib/models/Lead';
import User from '../../../lib/models/User';
import Call from '../../../lib/models/Call';
import Followup from '../../../lib/models/Followup';
import SystemSetting from '../../../lib/models/SystemSetting';
import { purgeDashboardCache } from '../../../lib/cache';
import { requireAdminApi } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

async function pickCallerForDistribution(activeCallers, strategy) {
  if (!activeCallers || activeCallers.length === 0) return null;

  if (strategy === 'LOAD_BALANCED') {
    const counts = await Promise.all(
      activeCallers.map(async (c) => {
        const count = await Lead.countDocuments({
          assigned_to: c._id,
          status: { $in: ['Fresh Lead', 'Assigned', 'Follow Up', 'Callback'] }
        });
        return { caller: c, count };
      })
    );
    counts.sort((a, b) => a.count - b.count);
    return counts[0].caller;
  }

  const lastLead = await Lead.findOne({ assigned_to: { $ne: null } }).sort({ assigned_at: -1 }).lean();
  if (!lastLead || !lastLead.assigned_to) return activeCallers[0];
  const idx = activeCallers.findIndex(c => c._id.toString() === lastLead.assigned_to.toString());
  return activeCallers[(idx + 1) % activeCallers.length];
}

export async function GET(request) {
  try {
    if (!(await requireAdminApi(request))) {
      return NextResponse.json({ error: 'Administrator authentication required' }, { status: 401 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const detailId = searchParams.get('detailId') || '';

    if (detailId) {
      const [lead, calls, followups] = await Promise.all([
        Lead.findById(detailId).populate('assigned_to', 'name mobile employee_id').lean(),
        Call.find({ lead: detailId }).populate('caller', 'name').sort({ start_time: -1 }).lean(),
        Followup.find({ lead: detailId }).populate('caller', 'name').sort({ date: -1, time: -1 }).lean()
      ]);
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      return NextResponse.json({ lead, calls, followups });
    }

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const callerId = searchParams.get('callerId') || '';
    const campaign = searchParams.get('campaign') || '';
    const source = searchParams.get('source') || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { lead_id: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { product_interest: { $regex: search, $options: 'i' } },
        { campaign_name: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (source && source !== 'ALL') {
      query.lead_source = { $regex: source, $options: 'i' };
    }
    if (campaign && campaign !== 'ALL') {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { campaign_name: { $regex: campaign, $options: 'i' } },
            { lead_source: { $regex: campaign, $options: 'i' } }
          ]
        }
      ];
    }
    if (callerId) {
      query.assigned_to = callerId === 'UNASSIGNED' ? null : callerId;
    }

    const [leads, users] = await Promise.all([
      Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('assigned_to', 'name _id mobile')
        .lean(),
      User.find({ role: 'telecaller' }).select('name _id mobile team on_leave shift_status').lean()
    ]);

    return NextResponse.json({ leads, users });
  } catch (error) {
    console.error('Leads GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const settings = await SystemSetting.findOne({ key: 'global' }).lean();
    const strategy = settings?.distributionStrategy || 'ROUND_ROBIN';

    let activeCallers = await User.find({
      role: 'telecaller',
      status: 'active',
      on_leave: false,
      shift_status: { $ne: 'Clocked Out' }
    }).sort({ _id: 1 });

    if (activeCallers.length === 0) {
      activeCallers = await User.find({ role: 'telecaller', status: 'active' }).sort({ _id: 1 });
    }

    if (Array.isArray(body.leads)) {
      const createdLeads = [];
      for (const item of body.leads) {
        const mobileVal = String(item.mobile || '').trim();
        if (!item.name || !mobileVal) continue;
        const chosenCaller = await pickCallerForDistribution(activeCallers, strategy);
        const doc = await Lead.create({
          name: String(item.name).trim(),
          mobile: mobileVal,
          email: (item.email || '').trim(),
          city: (item.city || '').trim(),
          state: (item.state || '').trim(),
          business_type: (item.business_type || '').trim(),
          product_interest: (item.product_interest || '').trim(),
          lead_source: item.lead_source || 'CSV Bulk Import',
          campaign_name: (item.campaign_name || '').trim(),
          status: chosenCaller ? 'Assigned' : 'Fresh Lead',
          assigned_to: chosenCaller ? chosenCaller._id : null,
          assigned_at: chosenCaller ? new Date() : null,
          notes: item.notes || ''
        });
        createdLeads.push(doc);
      }
      purgeDashboardCache();
      return NextResponse.json({ success: true, count: createdLeads.length }, { status: 201 });
    }

    const { name, mobile, email, city, state, business_type, product_interest, lead_source, campaign_name, assigned_to, notes } = body;
    if (!name || !mobile) {
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 });
    }

    let targetCallerId = assigned_to || null;
    if (!targetCallerId) {
      const chosen = await pickCallerForDistribution(activeCallers, strategy);
      if (chosen) targetCallerId = chosen._id;
    }

    const newLead = await Lead.create({
      name: String(name).trim(),
      mobile: String(mobile).trim(),
      email: (email || '').trim(),
      city: (city || '').trim(),
      state: (state || '').trim(),
      business_type: (business_type || '').trim(),
      product_interest: (product_interest || '').trim(),
      lead_source: lead_source || 'Admin Manual Entry',
      campaign_name: (campaign_name || '').trim(),
      status: targetCallerId ? 'Assigned' : 'Fresh Lead',
      assigned_to: targetCallerId,
      assigned_at: targetCallerId ? new Date() : null,
      notes: notes || ''
    });

    purgeDashboardCache();
    const populated = await Lead.findById(newLead._id).populate('assigned_to', 'name _id mobile').lean();
    return NextResponse.json({ success: true, lead: populated }, { status: 201 });
  } catch (error) {
    console.error('Leads POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await connectDB();
    const body = await request.json();

    if (body.action === 'AUTO_REDISTRIBUTE_SLA') {
      const activeCallers = await User.find({
        role: 'telecaller',
        status: 'active',
        on_leave: false,
        shift_status: { $ne: 'Clocked Out' }
      }).sort({ _id: 1 });

      if (activeCallers.length === 0) {
        return NextResponse.json({ error: 'No active clocked-in telecallers available' }, { status: 400 });
      }

      const slaCutoff = new Date(Date.now() - 15 * 60 * 1000);
      const stuckLeads = await Lead.find({
        status: { $in: ['Fresh Lead', 'Assigned'] },
        call_attempts: { $eq: 0 },
        createdAt: { $lte: slaCutoff }
      });

      let idx = 0;
      for (const lead of stuckLeads) {
        const caller = activeCallers[idx % activeCallers.length];
        lead.assigned_to = caller._id;
        lead.assigned_at = new Date();
        lead.status = 'Assigned';
        await lead.save();
        idx++;
      }

      purgeDashboardCache();
      return NextResponse.json({ success: true, redistributedCount: stuckLeads.length });
    }

    if (Array.isArray(body.leadIds) && body.leadIds.length > 0) {
      if (body.assigned_to === 'ROUND_ROBIN' || body.action === 'ROUND_ROBIN') {
        let activeCallers = await User.find({
          role: 'telecaller',
          status: { $in: ['active', 'ACTIVE'] },
          on_leave: false,
          shift_status: { $ne: 'Clocked Out' }
        }).sort({ _id: 1 });
        if (activeCallers.length === 0) {
          activeCallers = await User.find({ role: 'telecaller', status: { $in: ['active', 'ACTIVE'] } }).sort({ _id: 1 });
        }
        if (activeCallers.length > 0) {
          let idx = 0;
          for (const leadId of body.leadIds) {
            const caller = activeCallers[idx % activeCallers.length];
            await Lead.findByIdAndUpdate(leadId, {
              $set: {
                assigned_to: caller._id,
                assigned_at: new Date(),
                status: 'Assigned'
              }
            });
            idx++;
          }
          purgeDashboardCache();
          return NextResponse.json({ success: true, count: body.leadIds.length, method: 'ROUND_ROBIN' });
        }
      }

      await Lead.updateMany(
        { _id: { $in: body.leadIds } },
        {
          $set: {
            assigned_to: body.assigned_to || null,
            assigned_at: body.assigned_to ? new Date() : null,
            status: body.assigned_to ? 'Assigned' : 'Fresh Lead'
          }
        }
      );
      purgeDashboardCache();
      return NextResponse.json({ success: true, count: body.leadIds.length });
    }

    const { leadId, assigned_to, status, notes, priority } = body;
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    const updateData = {};
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to || null;
      updateData.assigned_at = assigned_to ? new Date() : null;
      if (assigned_to && !status) updateData.status = 'Assigned';
    }
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority;

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: updateData },
      { new: true }
    ).populate('assigned_to', 'name _id mobile');

    purgeDashboardCache();
    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error('Leads PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
