import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Team from '../../../lib/models/Team';
import User from '../../../lib/models/User';
import { requireUserApi, requireAdminApi } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/teams — List all teams (Admin sees all, Team Leader sees own team)
export async function GET(request) {
  try {
    const userPayload = await requireUserApi(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    await connectDB();

    let query = { status: 'active' };
    if (userPayload.role === 'team_leader' || userPayload.role === 'manager') {
      const tlDoc = await User.findById(userPayload.id).lean();
      query = {
        $or: [
          { leader: userPayload.id },
          { name: tlDoc?.team || '' }
        ]
      };
    }

    const teams = await Team.find(query)
      .populate('leader', 'name mobile email employee_id')
      .populate('members', 'name mobile email employee_id shift_status daily_call_target')
      .sort({ createdAt: 1 })
      .lean();

    const teamLeaders = await User.find({ role: 'team_leader', status: 'active' })
      .select('name mobile email employee_id team')
      .lean();

    const telecallers = await User.find({ role: 'telecaller', status: 'active' })
      .select('name mobile email employee_id team team_leader_id')
      .lean();

    return NextResponse.json({
      teams,
      teamLeaders,
      telecallers
    });
  } catch (err) {
    console.error('Teams GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/teams — Create a new team (Admin only)
export async function POST(request) {
  try {
    const adminPayload = await requireAdminApi(request);
    if (!adminPayload) {
      return NextResponse.json({ error: 'Forbidden: Only Administrators can create teams' }, { status: 403 });
    }
    await connectDB();

    const body = await request.json();
    const { name, code, leaderId, memberIds, campaigns, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Team name and code are required' }, { status: 400 });
    }

    let leader = leaderId;
    if (!leader) {
      const defaultLeader = await User.findOne({ role: 'team_leader', status: 'active' });
      leader = defaultLeader?._id || adminPayload.id;
    }

    const createdTeam = await Team.create({
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      description: description || '',
      leader,
      members: Array.isArray(memberIds) ? memberIds : [],
      campaigns: Array.isArray(campaigns) ? campaigns : ['Facebook Meta Lead Ads'],
      status: 'active'
    });

    // Update members' team_id and team_leader_id
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { $set: { team_id: createdTeam._id, team_leader_id: leader, team: createdTeam.name } }
      );
    }
    await User.findByIdAndUpdate(leader, { $set: { team_id: createdTeam._id, team: createdTeam.name } });

    return NextResponse.json({ success: true, team: createdTeam }, { status: 201 });
  } catch (err) {
    console.error('Teams POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/teams — Deactivate team (Admin only)
export async function DELETE(request) {
  try {
    const adminPayload = await requireAdminApi(request);
    if (!adminPayload) {
      return NextResponse.json({ error: 'Forbidden: Only Administrators can delete teams' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || searchParams.get('id');
    if (!code) return NextResponse.json({ error: 'Team ID or code required' }, { status: 400 });

    await Team.findOneAndUpdate(
      { $or: [{ code }, { _id: code }] },
      { $set: { status: 'inactive' } }
    );

    return NextResponse.json({ success: true, message: 'Team deactivated' });
  } catch (err) {
    console.error('Teams DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
