import { NextResponse } from 'next/server';
import AuthSession from '../../../../lib/models/AuthSession';
import { getAuthenticatedUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, payload } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    const query =
      scope === 'all' && user.role === 'admin'
        ? {}
        : { user: user._id };

    const sessions = await AuthSession.find(query)
      .populate('user', 'name email role employee_id')
      .sort({ last_active_at: -1 })
      .limit(20)
      .lean();

    const formatted = sessions.map((s) => ({
      id: String(s._id),
      sessionId: s.session_id,
      deviceLabel: s.device_label || 'Web Browser',
      ipAddress: s.ip_address || '127.0.0.1',
      revoked: Boolean(s.revoked),
      isExpired: s.expires_at ? new Date(s.expires_at) < new Date() : false,
      isCurrent: payload?.sid === s.session_id,
      lastActiveAt: s.last_active_at,
      createdAt: s.createdAt,
      expiresAt: s.expires_at,
      userName: s.user?.name || user.name,
      userRole: s.user?.role || user.role,
      employeeId: s.user?.employee_id || user.employee_id
    }));

    return NextResponse.json({ sessions: formatted });
  } catch (err) {
    console.error('Sessions GET error:', err);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { user, payload } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetSid = searchParams.get('sid');
    const allOther = searchParams.get('allOther') === '1';

    if (allOther) {
      const filter = {
        user: user._id,
        revoked: false,
        ...(payload?.sid ? { session_id: { $ne: payload.sid } } : {})
      };
      const res = await AuthSession.updateMany(filter, {
        $set: { revoked: true, revoked_at: new Date() }
      });
      return NextResponse.json({
        success: true,
        revokedCount: res.modifiedCount || 0,
        message: 'All other active device sessions have been revoked.'
      });
    }

    if (!targetSid) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const sessionDoc = await AuthSession.findOne({ session_id: targetSid });
    if (!sessionDoc) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (String(sessionDoc.user) !== String(user._id) && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    sessionDoc.revoked = true;
    sessionDoc.revoked_at = new Date();
    await sessionDoc.save();

    return NextResponse.json({
      success: true,
      message: 'Device session revoked.'
    });
  } catch (err) {
    console.error('Sessions DELETE error:', err);
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
