import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Call from '../../../lib/models/Call';
import User from '../../../lib/models/User';
import Lead from '../../../lib/models/Lead';
import { purgeDashboardCache } from '../../../lib/cache';
import { requireAdminApi } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function formatDuration(sec) {
  const s = Number(sec) || 0;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins === 0) return `${rem}s`;
  return `${mins}m ${rem}s`;
}

export async function GET(request) {
  try {
    if (!(await requireAdminApi(request))) {
      return NextResponse.json({ error: 'Administrator authentication required' }, { status: 401 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const callerId = searchParams.get('callerId') || '';
    const search = searchParams.get('search') || '';
    const dateFilter = searchParams.get('date') || '';

    const callQuery = {};
    if (callerId) callQuery.caller = callerId;
    if (dateFilter) {
      const start = new Date(dateFilter);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter);
      end.setHours(23, 59, 59, 999);
      callQuery.start_time = { $gte: start, $lte: end };
    }

    const [calls, telecallers, recentLeads] = await Promise.all([
      Call.find(callQuery)
        .populate('caller', 'name mobile employee_id team')
        .populate('lead', 'name mobile lead_id city status')
        .sort({ start_time: -1 })
        .limit(150)
        .lean(),
      User.find({ role: 'telecaller' }).select('name _id mobile team').lean(),
      Lead.find({}).select('name mobile lead_id _id city assigned_to').sort({ createdAt: -1 }).limit(50).lean()
    ]);

    const filteredCalls = search
      ? calls.filter(c => {
          const q = search.toLowerCase();
          return (
            (c.lead?.name || '').toLowerCase().includes(q) ||
            (c.lead?.mobile || '').toLowerCase().includes(q) ||
            (c.caller?.name || '').toLowerCase().includes(q) ||
            (c.status || '').toLowerCase().includes(q) ||
            (c.notes || '').toLowerCase().includes(q)
          );
        })
      : calls;

    const summaryMap = new Map();
    for (const tc of telecallers) {
      summaryMap.set(tc._id.toString(), {
        id: tc._id.toString(),
        name: tc.name,
        team: tc.team || 'North Region Sales',
        total: 0,
        connected: 0,
        totalSeconds: 0
      });
    }

    for (const c of filteredCalls) {
      const cId = c.caller?._id?.toString();
      if (!cId) continue;
      if (!summaryMap.has(cId)) {
        summaryMap.set(cId, {
          id: cId,
          name: c.caller?.name || 'Telecaller',
          team: c.caller?.team || 'North Region Sales',
          total: 0,
          connected: 0,
          totalSeconds: 0
        });
      }
      const entry = summaryMap.get(cId);
      entry.total += 1;
      if (!['Not Connected', 'Wrong Number', 'Rejected'].includes(c.status)) {
        entry.connected += 1;
      }
      entry.totalSeconds += (c.duration || 0);
    }

    const summaryData = Array.from(summaryMap.values()).map(s => ({
      ...s,
      date: dateFilter || 'All Recorded',
      duration: formatDuration(s.totalSeconds)
    }));

    const callLogs = filteredCalls.map((c, idx) => ({
      id: `C-${1000 + filteredCalls.length - idx}`,
      rawId: c._id.toString(),
      time: new Date(c.start_time || c.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      agent: c.caller?.name || 'Telecaller',
      agentTeam: c.caller?.team || '',
      leadName: c.lead?.name || '—',
      leadMobile: c.lead?.mobile || '',
      leadId: c.lead?.lead_id || '',
      durationSec: c.duration || 0,
      duration: formatDuration(c.duration || 0),
      outcome: c.status || 'Connected',
      recordingUrl: c.recording_url || null,
      notes: c.notes || ''
    }));

    return NextResponse.json({
      summaryData,
      callLogs,
      telecallers: telecallers.map(t => ({ id: t._id.toString(), name: t.name, team: t.team })),
      leads: recentLeads.map(l => ({ id: l._id.toString(), lead_id: l.lead_id, name: l.name, mobile: l.mobile, assigned_to: l.assigned_to?.toString() || '' }))
    });
  } catch (error) {
    console.error('Calls GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { leadId, callerId, duration, status, notes } = await request.json();
    if (!leadId || !callerId) {
      return NextResponse.json({ error: 'Lead and Telecaller are required' }, { status: 400 });
    }

    const durSec = Math.max(0, Number(duration) || 0);
    const now = new Date();
    const startTime = new Date(now.getTime() - durSec * 1000);

    const call = await Call.create({
      lead: leadId,
      caller: callerId,
      start_time: startTime,
      end_time: now,
      duration: durSec,
      status: status || 'Interested',
      notes: notes || ''
    });

    await Lead.findByIdAndUpdate(leadId, {
      $set: {
        status: status || 'Interested',
        last_contacted_at: now
      },
      $inc: { call_attempts: 1 }
    });

    purgeDashboardCache();
    return NextResponse.json({ success: true, call }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
