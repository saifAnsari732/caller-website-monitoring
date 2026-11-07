import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Followup from '../../../lib/models/Followup';
import Lead from '../../../lib/models/Lead';
import User from '../../../lib/models/User';
import { ensureInitialCRMData } from '../../../lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    await ensureInitialCRMData();
    const todayStr = new Date().toISOString().split('T')[0];

    const [followups, leads, telecallers] = await Promise.all([
      Followup.find({})
        .populate('lead', 'name mobile city business_type lead_id status product_interest')
        .populate('caller', 'name mobile team')
        .sort({ completed: 1, date: 1, time: 1 })
        .limit(200)
        .lean(),
      Lead.find({}).select('name mobile lead_id _id assigned_to').sort({ createdAt: -1 }).limit(60).lean(),
      User.find({ role: 'telecaller' }).select('name _id mobile team').lean()
    ]);

    let dueToday = 0;
    let overdue = 0;
    let upcoming = 0;
    let completed = 0;

    const formatted = followups.map(f => {
      let bucket = 'TODAY';
      let statusLabel = 'Due Today';

      if (f.completed) {
        completed++;
        bucket = 'COMPLETED';
        statusLabel = 'Completed';
      } else if (f.date < todayStr) {
        overdue++;
        bucket = 'OVERDUE';
        statusLabel = 'Overdue';
      } else if (f.date === todayStr) {
        dueToday++;
        bucket = 'TODAY';
        statusLabel = 'Due Today';
      } else {
        upcoming++;
        bucket = 'UPCOMING';
        statusLabel = 'Upcoming';
      }

      return {
        id: f._id.toString(),
        leadId: f.lead?._id?.toString() || '',
        leadCode: f.lead?.lead_id || 'L-00',
        client: f.lead?.name || 'Unknown Prospect',
        mobile: f.lead?.mobile || '',
        city: f.lead?.city || 'India',
        businessType: f.lead?.business_type || 'Distributor',
        productInterest: f.lead?.product_interest || 'Oil Inquiry',
        agent: f.caller?.name || 'Unassigned',
        agentTeam: f.caller?.team || 'Sales',
        date: f.date,
        time: `${f.date} at ${f.time}`,
        rawTime: f.time,
        notes: f.notes || 'Scheduled callback',
        bucket,
        status: statusLabel,
        completed: Boolean(f.completed)
      };
    });

    return NextResponse.json({
      kpis: { dueToday, overdue, upcoming, completed },
      followups: formatted,
      leads: leads.map(l => ({ id: l._id.toString(), lead_id: l.lead_id, name: l.name, mobile: l.mobile, assigned_to: l.assigned_to?.toString() || '' })),
      telecallers: telecallers.map(t => ({ id: t._id.toString(), name: t.name }))
    });
  } catch (error) {
    console.error('Followups GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { leadId, callerId, date, time, notes } = await request.json();
    if (!leadId || !callerId || !date || !time) {
      return NextResponse.json({ error: 'Lead, caller, date, and time are required' }, { status: 400 });
    }

    const created = await Followup.create({
      lead: leadId,
      caller: callerId,
      date,
      time,
      notes: notes || 'Follow-up scheduled by Admin',
      completed: false
    });

    await Lead.findByIdAndUpdate(leadId, { $set: { status: 'Follow Up' } });

    return NextResponse.json({ success: true, followup: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await connectDB();
    const { id, completed, date, time, notes } = await request.json();
    if (!id) return NextResponse.json({ error: 'Followup ID required' }, { status: 400 });

    const update = {};
    if (completed !== undefined) update.completed = Boolean(completed);
    if (date !== undefined) update.date = date;
    if (time !== undefined) update.time = time;
    if (notes !== undefined) update.notes = notes;

    const updated = await Followup.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );
    return NextResponse.json({ success: true, followup: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
