import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../lib/models/User';
import Lead from '../../../../lib/models/Lead';
import Call from '../../../../lib/models/Call';
import Followup from '../../../../lib/models/Followup';
import { requireUserApi } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const userPayload = await requireUserApi(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (userPayload.role === 'telecaller') {
      return NextResponse.json({ error: 'Forbidden: Team Leader or Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    let teamLeaderId = userPayload.id;
    if (userPayload.role === 'admin' && searchParams.get('team_leader_id')) {
      teamLeaderId = searchParams.get('team_leader_id');
    }

    const tlDoc = await User.findById(teamLeaderId).lean();
    if (!tlDoc) return NextResponse.json({ error: 'Team Leader not found' }, { status: 404 });

    // Fetch team telecallers
    const teamTelecallers = await User.find({
      $or: [
        { team_leader_id: teamLeaderId },
        { team: tlDoc.team, role: 'telecaller' }
      ]
    }).lean();

    const telecallerIds = teamTelecallers.map(t => t._id);
    const allMemberIds = [tlDoc._id, ...telecallerIds];

    // Team Leads Filter
    const teamLeadsFilter = {
      $or: [
        { assigned_team_leader: tlDoc._id },
        { assigned_to: { $in: allMemberIds } }
      ]
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const clientDate = searchParams.get('clientDate') || new Date().toISOString().split('T')[0];

    const [
      teamTotalLeads,
      newLeads,
      uncontactedLeads,
      interestedLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      leadsList,
      teamCalls,
      teamFollowups
    ] = await Promise.all([
      Lead.countDocuments(teamLeadsFilter),
      Lead.countDocuments({ ...teamLeadsFilter, status: { $in: ['New', 'Fresh Lead', 'Assigned', 'Fresh Inquiry'] } }),
      Lead.countDocuments({ ...teamLeadsFilter, call_attempts: { $lte: 0 } }),
      Lead.countDocuments({ ...teamLeadsFilter, status: { $in: ['Interested', 'DSS Interested', 'RSS Interested', 'SS Interested'] } }),
      Lead.countDocuments({ ...teamLeadsFilter, status: 'Qualified' }),
      Lead.countDocuments({ ...teamLeadsFilter, status: { $in: ['Converted', 'Closed'] } }),
      Lead.countDocuments({ ...teamLeadsFilter, status: { $in: ['Lost', 'Not Interested', 'Rejected', 'Invalid Lead', 'Duplicate Lead'] } }),
      Lead.find(teamLeadsFilter).select('response_time_seconds sla_breached assigned_to status priority').lean(),
      Call.find({ caller: { $in: allMemberIds } }).lean(),
      Followup.find({ caller: { $in: allMemberIds }, completed: false }).lean()
    ]);

    // Average first response time
    const validResponses = leadsList.filter(l => l.response_time_seconds && l.response_time_seconds > 0);
    const avgResponseTimeMin = validResponses.length > 0
      ? Math.round(validResponses.reduce((acc, curr) => acc + curr.response_time_seconds, 0) / validResponses.length / 60)
      : 8;

    // Follow-ups breakdown
    let todayFollowupsCount = 0;
    let overdueFollowupsCount = 0;
    teamFollowups.forEach(f => {
      const fDate = f.date ? f.date.toString().split('T')[0] : '';
      if (fDate === clientDate) todayFollowupsCount++;
      else if (fDate < clientDate) overdueFollowupsCount++;
    });

    // Calls breakdown
    const totalCalls = teamCalls.length;
    const connectedCalls = teamCalls.filter(c => c.status === 'completed' || (c.duration && c.duration > 0)).length;
    const todaysCalls = teamCalls.filter(c => {
      const cDate = c.start_time || c.createdAt;
      return cDate && new Date(cDate) >= todayStart && new Date(cDate) <= todayEnd;
    }).length;

    // Daily target versus completed calls
    const teamDailyTarget = teamTelecallers.reduce((acc, t) => acc + (t.daily_call_target || 50), 0);
    const targetProgressPct = teamDailyTarget > 0 ? Math.min(100, Math.round((todaysCalls / teamDailyTarget) * 100)) : 0;
    const conversionRate = teamTotalLeads > 0 ? parseFloat(((convertedLeads / teamTotalLeads) * 100).toFixed(1)) : 0;

    // Telecaller Leaderboard
    const leaderboard = teamTelecallers.map(tc => {
      const tcCalls = teamCalls.filter(c => c.caller?.toString() === tc._id.toString());
      const tcConnected = tcCalls.filter(c => c.status === 'completed' || (c.duration && c.duration > 0)).length;
      const tcLeads = leadsList.filter(l => l.assigned_to?.toString() === tc._id.toString());
      const tcInterested = tcLeads.filter(l => ['Interested', 'DSS Interested', 'RSS Interested', 'SS Interested'].includes(l.status)).length;
      const tcConverted = tcLeads.filter(l => ['Converted', 'Closed'].includes(l.status)).length;
      const tcRate = tcLeads.length > 0 ? parseFloat(((tcConverted / tcLeads.length) * 100).toFixed(1)) : 0;

      return {
        id: tc._id,
        name: tc.name,
        employee_id: tc.employee_id,
        mobile: tc.mobile,
        shift_status: tc.shift_status || 'Clocked In',
        daily_call_target: tc.daily_call_target || 50,
        calls: tcCalls.length,
        connected: tcConnected,
        interested: tcInterested,
        converted: tcConverted,
        totalLeads: tcLeads.length,
        conversionRate: tcRate
      };
    });

    leaderboard.sort((a, b) => b.converted - a.converted || b.connected - a.connected || b.calls - a.calls);
    leaderboard.forEach((item, idx) => { item.rank = idx + 1; });

    return NextResponse.json({
      teamLeader: {
        id: tlDoc._id,
        name: tlDoc.name,
        email: tlDoc.email,
        mobile: tlDoc.mobile,
        team: tlDoc.team,
        employee_id: tlDoc.employee_id
      },
      kpis: {
        teamTotalLeads,
        newLeads,
        uncontactedLeads,
        todayFollowupsCount,
        overdueFollowupsCount,
        totalCalls,
        connectedCalls,
        todaysCalls,
        interestedLeads,
        qualifiedLeads,
        convertedLeads,
        lostLeads,
        conversionRate,
        avgFirstResponseTimeMinutes: avgResponseTimeMin,
        teamDailyTarget,
        targetProgressPct
      },
      leaderboard,
      telecallers: teamTelecallers.map(t => ({
        id: t._id,
        name: t.name,
        employee_id: t.employee_id,
        mobile: t.mobile,
        daily_call_target: t.daily_call_target,
        shift_status: t.shift_status
      }))
    });
  } catch (err) {
    console.error('Team Leader dashboard error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
