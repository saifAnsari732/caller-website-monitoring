import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../lib/models/User';
import AuthSession from '../../../../lib/models/AuthSession';
import { hashPassword, validatePasswordStrength } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const rawMobile = String(body.mobile || '').replace(/\D/g, '').slice(-10);
    const email = String(body.email || '').trim().toLowerCase();
    const employeeId = String(body.employeeId || '').trim().toUpperCase();
    const newPassword = String(body.newPassword || '');

    if (rawMobile.length !== 10 || (!email && !employeeId)) {
      return NextResponse.json(
        { error: 'Please enter your registered 10-digit mobile number and either your work email or Employee ID.' },
        { status: 400 }
      );
    }

    const pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: pwdCheck.message }, { status: 400 });
    }

    const user = await User.findOne({ mobile: rawMobile });
    if (!user) {
      return NextResponse.json(
        { error: 'Verification failed. Ensure your registered mobile and email/Admin ID match.' },
        { status: 400 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          error:
            'This password reset portal is for CRM Administrators only. Telecaller passwords can be reset by an Admin under Telecallers management.'
        },
        { status: 403 }
      );
    }

    const emailMatches = email && user.email && user.email.toLowerCase() === email;
    const empMatches = employeeId && user.employee_id && user.employee_id.toUpperCase() === employeeId;

    if (!emailMatches && !empMatches) {
      return NextResponse.json(
        { error: 'Verification failed. Registered email or Employee ID did not match our records.' },
        { status: 400 }
      );
    }

    user.password = await hashPassword(newPassword);
    user.password_changed_at = new Date();
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.token_version = (user.token_version || 0) + 1;
    await user.save();

    await AuthSession.updateMany(
      { user: user._id, revoked: false },
      { $set: { revoked: true, revoked_at: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Unable to reset password right now.' }, { status: 500 });
  }
}
