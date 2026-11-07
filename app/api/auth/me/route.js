import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  sanitizeUserForClient,
  clearSessionCookie
} from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, payload } = await getAuthenticatedUser(request);
    if (!user) {
      const res = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
      return clearSessionCookie(res);
    }

    return NextResponse.json({
      authenticated: true,
      sessionId: payload?.sid || null,
      user: sanitizeUserForClient(user)
    });
  } catch (err) {
    console.error('Auth me GET error:', err);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    if (body.shift_status && ['Clocked In', 'On Break', 'Clocked Out'].includes(body.shift_status)) {
      user.shift_status = body.shift_status;
      if (body.shift_status === 'Clocked In') {
        user.last_clock_in = new Date();
        user.on_leave = false;
      } else if (body.shift_status === 'Clocked Out') {
        user.last_clock_out = new Date();
      }
    }

    if (typeof body.name === 'string' && body.name.trim().length >= 2) {
      user.name = body.name.trim();
    }

    if (typeof body.team === 'string' && body.team.trim()) {
      user.team = body.team.trim();
    }

    if (body.daily_call_target !== undefined) {
      user.daily_call_target = Math.max(0, Number(body.daily_call_target) || 0);
    }

    if (body.daily_conversion_target !== undefined) {
      user.daily_conversion_target = Math.max(0, Number(body.daily_conversion_target) || 0);
    }

    user.last_active_at = new Date();
    await user.save();

    return NextResponse.json({
      success: true,
      user: sanitizeUserForClient(user)
    });
  } catch (err) {
    console.error('Auth me PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 });
  }
}
