import { NextResponse } from 'next/server';
import AuthSession from '../../../../lib/models/AuthSession';
import {
  getAuthenticatedUser,
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
  createAuthenticatedSession,
  attachSessionCookie,
  sanitizeUserForClient
} from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { user, payload } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const revokeOtherSessions = body.revokeOtherSessions !== false;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Both current password and new password are required.' },
        { status: 400 }
      );
    }

    const pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: pwdCheck.message }, { status: 400 });
    }

    const isMatch = await verifyPassword(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from your current password.' },
        { status: 400 }
      );
    }

    user.password = await hashPassword(newPassword);
    user.password_changed_at = new Date();

    if (revokeOtherSessions) {
      user.token_version = (user.token_version || 0) + 1;
      await AuthSession.updateMany(
        { user: user._id, revoked: false },
        { $set: { revoked: true, revoked_at: new Date() } }
      );
    }

    await user.save();

    if (revokeOtherSessions) {
      const { token } = await createAuthenticatedSession({
        user,
        request,
        rememberMe: true
      });
      const res = NextResponse.json({
        success: true,
        message: 'Password updated and other active sessions signed out.',
        user: sanitizeUserForClient(user)
      });
      return attachSessionCookie(res, token, true);
    }

    return NextResponse.json({
      success: true,
      sessionId: payload?.sid,
      message: 'Password updated successfully.',
      user: sanitizeUserForClient(user)
    });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Unable to update password.' }, { status: 500 });
  }
}
