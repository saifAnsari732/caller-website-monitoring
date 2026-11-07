import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../lib/models/User';
import {
  ensureAuthBootstrap,
  verifyPassword,
  hashPassword,
  createAuthenticatedSession,
  attachSessionCookie,
  sanitizeUserForClient,
  getClientIp
} from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function POST(request) {
  try {
    await connectDB();
    await ensureAuthBootstrap();

    const body = await request.json();
    const rawIdentifier = String(body.identifier || body.mobile || body.email || '').trim();
    const password = String(body.password || '');
    const rememberMe = Boolean(body.rememberMe);

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: 'Please enter your Admin mobile number, email, or Admin ID and password.' },
        { status: 400 }
      );
    }

    const cleanDigits = rawIdentifier.replace(/\D/g, '').slice(-10);
    const orConditions = [
      { email: rawIdentifier.toLowerCase() },
      { employee_id: rawIdentifier.toUpperCase() },
      { mobile: rawIdentifier }
    ];
    if (cleanDigits.length === 10) {
      orConditions.push({ mobile: cleanDigits });
    }

    const user = await User.findOne({ $or: orConditions });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please verify your Administrator mobile/email and password.' },
        { status: 401 }
      );
    }

    // STRICT ADMIN-ONLY WEB PORTAL ENFORCEMENT (Telecallers use the Mobile App)
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          error:
            'Access Restricted: This Web Monitoring Console is for Administrators only. Telecaller agents must sign in via the Kisan Connect Mobile App.'
        },
        { status: 403 }
      );
    }

    if (user.status === 'disabled') {
      return NextResponse.json(
        { error: 'Your administrator account has been deactivated.' },
        { status: 403 }
      );
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minsLeft = Math.max(1, Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000));
      return NextResponse.json(
        {
          error: `Account temporarily locked due to multiple failed sign-in attempts. Try again in ${minsLeft} minute${minsLeft > 1 ? 's' : ''}.`,
          lockedUntil: user.locked_until
        },
        { status: 423 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
      if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
        user.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }
      await user.save();

      const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - user.failed_login_attempts);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Invalid password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lockout.`
              : 'Account locked for 15 minutes due to 5 failed sign-in attempts.'
        },
        { status: 401 }
      );
    }

    if (!user.password.startsWith('$2')) {
      user.password = await hashPassword(password);
    }

    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login_at = new Date();
    user.last_login_ip = getClientIp(request);
    user.last_active_at = new Date();
    await user.save();

    const { token, sessionId, expiresAt } = await createAuthenticatedSession({
      user,
      request,
      rememberMe
    });

    const response = NextResponse.json({
      success: true,
      token,
      sessionId,
      expiresAt,
      user: sanitizeUserForClient(user)
    });

    return attachSessionCookie(response, token, rememberMe);
  } catch (err) {
    console.error('Auth login error:', err);
    return NextResponse.json(
      { error: 'Unable to complete sign-in right now. Please try again.' },
      { status: 500 }
    );
  }
}
