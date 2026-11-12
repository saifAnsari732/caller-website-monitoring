import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../lib/models/User';
import {
  hashPassword,
  validatePasswordStrength,
  createAuthenticatedSession,
  attachSessionCookie,
  sanitizeUserForClient,
  getClientIp
} from '../../../../lib/auth';
import { purgeDashboardCache } from '../../../../lib/cache';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const name = String(body.name || '').trim();
    const rawMobile = String(body.mobile || '').replace(/\D/g, '').slice(-10);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const requestedRole = body.role === 'telecaller' ? 'telecaller' : 'admin';
    const team = String(body.team || (requestedRole === 'admin' ? 'Operations HQ' : 'North Region Sales')).trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter a valid full name.' }, { status: 400 });
    }

    if (rawMobile.length !== 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid work email address.' }, { status: 400 });
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: pwdCheck.message }, { status: 400 });
    }

    const existing = await User.findOne({
      $or: [{ mobile: rawMobile }, { email }]
    });

    if (existing) {
      const conflictField = existing.mobile === rawMobile ? 'mobile number' : 'email address';
      return NextResponse.json(
        { error: `An account with this ${conflictField} already exists. Please sign in instead.` },
        { status: 409 }
      );
    }

    const totalUsers = await User.countDocuments({ role: requestedRole });
    const employee_id = requestedRole === 'admin'
      ? `ADM${String(10 + totalUsers + 1)}`
      : `EMP${String(100 + totalUsers + 1)}`;
    const hashedPassword = await hashPassword(password);

    const createdUser = await User.create({
      name,
      mobile: rawMobile,
      email,
      employee_id,
      password: hashedPassword,
      role: requestedRole,
      team,
      status: 'active',
      on_leave: false,
      shift_status: 'Clocked In',
      last_clock_in: new Date(),
      last_active_at: new Date(),
      last_login_at: new Date(),
      last_login_ip: getClientIp(request),
      daily_call_target: requestedRole === 'admin' ? 0 : 50,
      daily_conversion_target: requestedRole === 'admin' ? 0 : 5
    });

    purgeDashboardCache();

    const { token, sessionId, expiresAt } = await createAuthenticatedSession({
      user: createdUser,
      request,
      rememberMe: true
    });

    const response = NextResponse.json(
      {
        success: true,
        token,
        sessionId,
        expiresAt,
        user: sanitizeUserForClient(createdUser)
      },
      { status: 201 }
    );

    return attachSessionCookie(response, token, true);
  } catch (err) {
    console.error('Auth register error:', err);
    return NextResponse.json(
      { error: err.message || 'Unable to create workspace account right now.' },
      { status: 500 }
    );
  }
}
