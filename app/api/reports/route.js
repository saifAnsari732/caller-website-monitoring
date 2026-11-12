import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import User from '../../../lib/models/User';
import Lead from '../../../lib/models/Lead';
import Call from '../../../lib/models/Call';
import { requireAdminApi } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function formatDuration(sec = 0) {
  const s = Math.round(Number(sec) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${rem}s`;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${rem}s`;
}

function parseDateRange(range = '7d', customStart = null, customEnd = null) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (customStart && customEnd) {
    start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all':
    default:
      start = new Date('2020-01-01');
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;
  }
  return { start, end };
}

export async function GET(request) {
  try {
    if (!(await requireAdminApi(request))) {
      return NextResponse.json({ error: 'Administrator authentication required' }, { status: 401 });
    }
    await connectDB();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const teamFilter = searchParams.get('team') || 'ALL';
    const callerFilter = searchParams.get('callerId') || '';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const { start: startDate, end: endDate } = parseDateRange(range, customStart, customEnd);

    // Filter telecallers
    const userQuery = { role: 'telecaller' };
    if (teamFilter !== 'ALL') userQuery.team = teamFilter;
    if (callerFilter) userQuery._id = callerFilter;

    const telecallers = await User.find(userQuery).select('-password').sort({ createdAt: 1 }).lean();
    const telecallerIds = telecallers.map(tc => tc._id);

    // Call query within range
    const callQuery = {
      caller: { $in: telecallerIds },
      $or: [
        { start_time: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    };

    const [allCalls, allLeads] = await Promise.all([
      Call.find(callQuery)
        .populate('caller', 'name mobile employee_id team shift_status')
        .populate('lead', 'name mobile lead_id city status priority')
        .sort({ start_time: -1, createdAt: -1 })
        .lean(),
      Lead.find({ assigned_to: { $in: telecallerIds } })
        .populate('assigned_to', 'name employee_id')
        .lean()
    ]);

    // Build disposition counters
    const dispositionCounts = {
      'Interested': 0,
      'Distributor Interested': 0,
      'Trader Interested': 0,
      'DSS Interested': 0,
      'RSS Interested': 0,
      'SS Interested': 0,
      'Follow Up': 0,
      'Callback': 0,
      'Connected': 0,
      'Closed': 0,
      'Not Connected': 0,
      'Wrong Number': 0,
      'Rejected': 0,
      'Other': 0
    };

    allCalls.forEach(call => {
      const st = call.status || 'Connected';
      if (dispositionCounts[st] !== undefined) {
        dispositionCounts[st] += 1;
      } else {
        dispositionCounts['Other'] += 1;
      }
    });

    // Group calls by caller
    const callsByCaller = new Map();
    telecallerIds.forEach(id => callsByCaller.set(id.toString(), []));
    allCalls.forEach(call => {
      const cId = call.caller?._id?.toString() || call.caller?.toString();
      if (cId && callsByCaller.has(cId)) {
        callsByCaller.get(cId).push(call);
      }
    });

    // Group leads by caller
    const leadsByCaller = new Map();
    telecallerIds.forEach(id => leadsByCaller.set(id.toString(), []));
    allLeads.forEach(lead => {
      const aId = lead.assigned_to?._id?.toString() || lead.assigned_to?.toString();
      if (aId && leadsByCaller.has(aId)) {
        leadsByCaller.get(aId).push(lead);
      }
    });

    // Build enriched agent performance metrics
    const agentMetrics = telecallers.map(tc => {
      const tcIdStr = tc._id.toString();
      const calls = callsByCaller.get(tcIdStr) || [];
      const assigned = leadsByCaller.get(tcIdStr) || [];

      const totalCalls = calls.length;
      const connectedCalls = calls.filter(c => !['Not Connected', 'Wrong Number', 'Rejected'].includes(c.status)).length;
      const connectionRate = totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : '0.0';

      const totalTalkTimeSec = calls.reduce((acc, c) => acc + (Number(c.duration) || 0), 0);
      const avgTalkTimeSec = totalCalls > 0 ? Math.round(totalTalkTimeSec / totalCalls) : 0;

      // Dispositions for this caller
      const interestedLeads = assigned.filter(l =>
        ['Interested', 'Distributor Interested', 'Trader Interested', 'DSS Interested', 'RSS Interested', 'SS Interested'].includes(l.status)
      ).length;
      const closedDeals = assigned.filter(l => l.status === 'Closed').length;
      const followups = assigned.filter(l => ['Follow Up', 'Callback'].includes(l.status)).length;

      const conversionRate = assigned.length > 0
        ? (((interestedLeads + closedDeals) / assigned.length) * 100).toFixed(1)
        : '0.0';

      const dailyCallTarget = tc.daily_call_target || 50;
      const dailyConversionTarget = tc.daily_conversion_target || 5;

      // Adjust target for multi-day ranges
      let daysCount = 1;
      if (range === '7d') daysCount = 7;
      else if (range === '30d') daysCount = 30;
      else if (range === 'all') daysCount = 60;
      const targetCalls = dailyCallTarget * (range === 'today' || range === 'yesterday' ? 1 : Math.min(daysCount, 7));
      const targetConversions = dailyConversionTarget * (range === 'today' || range === 'yesterday' ? 1 : Math.min(daysCount, 7));

      const targetAchievedPercent = Math.min(100, Math.round((totalCalls / (targetCalls || 1)) * 100));

      // Calculate composite Productivity Score (0 - 100)
      const callScore = Math.min(30, (totalCalls / (targetCalls || 1)) * 30);
      const connScore = (Number(connectionRate) / 100) * 30;
      const convScore = Math.min(25, (Number(conversionRate) / 25) * 25);
      const talkScore = Math.min(15, (avgTalkTimeSec / 120) * 15);
      const productivityScore = Math.round(callScore + connScore + convScore + talkScore);

      let rating = 'Needs Attention';
      let ratingColor = 'text-rose-700 bg-rose-50 border-rose-200';
      if (productivityScore >= 75) {
        rating = 'Top Performer';
        ratingColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      } else if (productivityScore >= 55) {
        rating = 'High Achiever';
        ratingColor = 'text-blue-700 bg-blue-50 border-blue-200';
      } else if (productivityScore >= 35) {
        rating = 'On Track';
        ratingColor = 'text-amber-700 bg-amber-50 border-amber-200';
      }

      return {
        id: tcIdStr,
        name: tc.name,
        employee_id: tc.employee_id || `EMP-${tcIdStr.slice(-4)}`,
        email: tc.email,
        mobile: tc.mobile,
        team: tc.team || 'North Region Sales',
        status: tc.status === 'active' ? 'Active' : 'Disabled',
        shiftStatus: tc.on_leave ? 'On Leave' : (tc.shift_status || 'Clocked In'),
        assignedLeads: assigned.length,
        totalCalls,
        connectedCalls,
        connectionRate: `${connectionRate}%`,
        connectionRateNum: Number(connectionRate),
        totalTalkTimeSec,
        totalTalkTimeFormatted: formatDuration(totalTalkTimeSec),
        avgTalkTimeSec,
        avgTalkTimeFormatted: formatDuration(avgTalkTimeSec),
        interestedLeads,
        closedDeals,
        followups,
        conversionRate: `${conversionRate}%`,
        conversionRateNum: Number(conversionRate),
        targetCalls,
        targetConversions,
        targetAchievedPercent,
        productivityScore,
        rating,
        ratingColor
      };
    });

    // Sort agents by productivity score descending for leaderboard rank
    agentMetrics.sort((a, b) => b.productivityScore - a.productivityScore || b.totalCalls - a.totalCalls);
    agentMetrics.forEach((a, idx) => {
      a.rank = idx + 1;
    });

    // Timeline volume data (for Recharts)
    const timelineMap = new Map();
    const daysToShow = range === 'today' || range === 'yesterday' ? 1 : (range === '7d' ? 7 : 14);
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      timelineMap.set(key, {
        date: key,
        totalCalls: 0,
        connectedCalls: 0,
        talkTimeMinutes: 0,
        interestedLeads: 0
      });
    }

    allCalls.forEach(call => {
      const cDate = new Date(call.start_time || call.createdAt);
      const key = cDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (timelineMap.has(key)) {
        const item = timelineMap.get(key);
        item.totalCalls += 1;
        if (!['Not Connected', 'Wrong Number', 'Rejected'].includes(call.status)) {
          item.connectedCalls += 1;
        }
        item.talkTimeMinutes += Math.round((Number(call.duration) || 0) / 60);
      }
    });

    const timelineData = Array.from(timelineMap.values());

    // KPI Aggregates
    const totalCallsCount = allCalls.length;
    const totalConnectedCount = allCalls.filter(c => !['Not Connected', 'Wrong Number', 'Rejected'].includes(c.status)).length;
    const overallConnectionRate = totalCallsCount > 0 ? ((totalConnectedCount / totalCallsCount) * 100).toFixed(1) : '0.0';
    const totalTalkSeconds = allCalls.reduce((acc, c) => acc + (Number(c.duration) || 0), 0);
    const overallAvgSeconds = totalCallsCount > 0 ? Math.round(totalTalkSeconds / totalCallsCount) : 0;
    const totalHotProspects = allLeads.filter(l =>
      ['Interested', 'Distributor Interested', 'Trader Interested', 'DSS Interested', 'RSS Interested', 'SS Interested'].includes(l.status)
    ).length;
    const totalClosedDeals = allLeads.filter(l => l.status === 'Closed').length;

    const topPerformer = agentMetrics.length > 0 ? agentMetrics[0] : null;

    // Call logs for deep inspection & audio replay
    const formattedCallLogs = allCalls.slice(0, 60).map(c => ({
      id: c._id.toString(),
      leadId: c.lead?.lead_id || 'L-Unknown',
      leadName: c.lead?.name || 'Customer Prospect',
      leadMobile: c.lead?.mobile || '--',
      leadCity: c.lead?.city || '',
      leadStatus: c.lead?.status || 'Assigned',
      callerName: c.caller?.name || 'Telecaller',
      callerEmployeeId: c.caller?.employee_id || 'EMP',
      callerTeam: c.caller?.team || 'North Region Sales',
      status: c.status || 'Connected',
      durationSec: c.duration || 0,
      durationFormatted: formatDuration(c.duration || 0),
      notes: c.notes || '',
      recordingUrl: c.recording_url || null,
      callTime: new Date(c.start_time || c.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
      timestamp: new Date(c.start_time || c.createdAt).getTime()
    }));

    return NextResponse.json({
      success: true,
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalCalls: totalCallsCount,
        connectedCalls: totalConnectedCount,
        connectionRate: `${overallConnectionRate}%`,
        totalTalkTimeSec: totalTalkSeconds,
        totalTalkTimeFormatted: formatDuration(totalTalkSeconds),
        avgTalkTimeFormatted: formatDuration(overallAvgSeconds),
        hotProspects: totalHotProspects,
        closedDeals: totalClosedDeals,
        activeTelecallers: telecallers.filter(t => t.status === 'active' && !t.on_leave).length,
        totalTelecallers: telecallers.length,
        topPerformer: topPerformer
          ? { name: topPerformer.name, score: topPerformer.productivityScore, calls: topPerformer.totalCalls }
          : null
      },
      agentMetrics,
      timelineData,
      dispositionCounts,
      callLogs: formattedCallLogs
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate caller reports' }, { status: 500 });
  }
}
