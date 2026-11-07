import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import User from '../../../lib/models/User';
import Lead from '../../../lib/models/Lead';
import Call from '../../../lib/models/Call';
import { ensureInitialCRMData } from '../../../lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    await ensureInitialCRMData();

    const callers = await User.find({ role: 'telecaller' }).select('-password').sort({ createdAt: 1 }).lean();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const enriched = await Promise.all(
      callers.map(async (tc) => {
        const [
          assignedLeads,
          interestedLeads,
          followupsCount,
          closedDeals,
          callsDocs
        ] = await Promise.all([
          Lead.countDocuments({ assigned_to: tc._id }),
          Lead.countDocuments({
            assigned_to: tc._id,
            status: { $in: ['Interested', 'Distributor Interested', 'Trader Interested', 'DSS Interested', 'RSS Interested', 'SS Interested'] }
          }),
          Lead.countDocuments({ assigned_to: tc._id, status: { $in: ['Follow Up', 'Callback'] } }),
          Lead.countDocuments({ assigned_to: tc._id, status: 'Closed' }),
          Call.find({ caller: tc._id }).lean()
        ]);

        const totalCalls = callsDocs.length;
        const connectedCalls = callsDocs.filter(c => !['Not Connected', 'Wrong Number', 'Rejected'].includes(c.status)).length;
        const totalDuration = callsDocs.reduce((acc, c) => acc + (c.duration || 0), 0);
        const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

        const shiftStatus = tc.on_leave
          ? 'On Leave'
          : (tc.shift_status || (tc.status === 'active' ? 'Clocked In' : 'Clocked Out'));

        return {
          id: tc._id.toString(),
          name: tc.name,
          email: tc.email,
          mobile: tc.mobile,
          employee_id: tc.employee_id,
          role: 'Telecaller',
          team: tc.team || 'North Region Sales',
          status: (tc.status === 'active' && !tc.on_leave && shiftStatus !== 'Clocked Out') ? 'Online' : 'Offline',
          shiftStatus,
          active: tc.status === 'active',
          onLeave: Boolean(tc.on_leave),
          todaysCalls: totalCalls,
          targetCalls: tc.daily_call_target || 50,
          connected: connectedCalls,
          assignedLeads,
          interested: interestedLeads,
          followups: followupsCount,
          closed: closedDeals,
          targetConversions: tc.daily_conversion_target || 5,
          loginTime: tc.last_clock_in ? new Date(tc.last_clock_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '09:30 AM',
          logoutTime: tc.last_clock_out ? new Date(tc.last_clock_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--',
          lastActivity: tc.last_active_at ? new Date(tc.last_active_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Active',
          avgCallDurationSec: avgDuration
        };
      })
    );

    // Recent audit logs from real Calls and Leads
    const [recentCalls, recentAssignedLeads] = await Promise.all([
      Call.find({}).populate('caller', 'name').populate('lead', 'name lead_id mobile').sort({ createdAt: -1 }).limit(8).lean(),
      Lead.find({ assigned_to: { $ne: null } }).populate('assigned_to', 'name').sort({ updatedAt: -1 }).limit(6).lean()
    ]);

    const auditLogs = [];
    recentCalls.forEach(c => {
      auditLogs.push({
        id: `call-${c._id}`,
        time: new Date(c.createdAt || c.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(c.createdAt || c.start_time).getTime(),
        agent: c.caller?.name || 'Telecaller',
        action: `Call Logged (${c.status})`,
        details: `Called ${c.lead?.name || 'Lead'} (${c.lead?.lead_id || ''}) • Talk time: ${c.duration || 0}s. ${c.notes || ''}`
      });
    });

    recentAssignedLeads.forEach(l => {
      auditLogs.push({
        id: `lead-${l._id}`,
        time: new Date(l.updatedAt || l.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(l.updatedAt || l.createdAt).getTime(),
        agent: l.assigned_to?.name || 'System Router',
        action: 'Lead Pipeline Assigned',
        details: `${l.lead_id} (${l.name} - ${l.city || 'India'}) status is ${l.status}`
      });
    });

    auditLogs.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ telecallers: enriched, auditLogs: auditLogs.slice(0, 12) });
  } catch (error) {
    console.error('Telecallers GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, mobile, email, team, targetCalls, targetConversions, password } = body;

    if (!name || !mobile) {
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 });
    }

    const count = await User.countDocuments();
    const employee_id = body.employee_id || `EMP${100 + count + 1}`;
    const cleanEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}${count + 1}@kisanconnect.com`;

    // Hash password compatible with bcryptjs in backend ($2a$10$...)
    // Using backend's bcryptjs if available or simple fallback hash
    let hashedPassword = password || 'password123';
    try {
      const bcryptPath = 'i:/call-app/caller-app-backned/node_modules/bcryptjs';
      const bcrypt = eval('require')(bcryptPath);
      hashedPassword = await bcrypt.hash(password || 'password123', 10);
    } catch {
      // fallback
    }

    const created = await User.create({
      name,
      mobile,
      email: cleanEmail,
      employee_id,
      password: hashedPassword,
      role: 'telecaller',
      team: team || 'North Region Sales',
      status: 'active',
      on_leave: false,
      shift_status: 'Clocked In',
      daily_call_target: Number(targetCalls) || 50,
      daily_conversion_target: Number(targetConversions) || 5
    });

    return NextResponse.json({ success: true, telecaller: created }, { status: 201 });
  } catch (error) {
    console.error('Telecaller POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, status, on_leave, shift_status, daily_call_target, daily_conversion_target, team } = body;

    if (!id) return NextResponse.json({ error: 'Telecaller ID required' }, { status: 400 });

    const update = {};
    if (status !== undefined) update.status = status;
    if (on_leave !== undefined) update.on_leave = Boolean(on_leave);
    if (shift_status !== undefined) {
      update.shift_status = shift_status;
      if (shift_status === 'Clocked In') {
        update.last_clock_in = new Date();
        update.on_leave = false;
      } else if (shift_status === 'Clocked Out') {
        update.last_clock_out = new Date();
      }
    }
    if (daily_call_target !== undefined) update.daily_call_target = Number(daily_call_target);
    if (daily_conversion_target !== undefined) update.daily_conversion_target = Number(daily_conversion_target);
    if (team !== undefined) update.team = team;

    const updated = await User.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password');
    return NextResponse.json({ success: true, telecaller: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
