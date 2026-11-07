import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../lib/models/User';
import AuthSession from '../../../../lib/models/AuthSession';
import { extractTokenFromRequest, clearSessionCookie } from '../../../../lib/auth';
import { verifyJwtHS256 } from '../../../../lib/jwt-edge';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const token = extractTokenFromRequest(request);
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (token) {
      const payload = await verifyJwtHS256(token);
      if (payload) {
        await connectDB();
        if (payload.sid) {
          await AuthSession.updateOne(
            { session_id: payload.sid },
            { $set: { revoked: true, revoked_at: new Date() } }
          );
        }
        if (payload.id && body.clockOut) {
          await User.updateOne(
            { _id: payload.id },
            {
              $set: {
                shift_status: 'Clocked Out',
                last_clock_out: new Date(),
                last_active_at: new Date()
              }
            }
          );
        }
      }
    }

    const response = NextResponse.json({ success: true, message: 'Signed out successfully.' });
    return clearSessionCookie(response);
  } catch {
    const response = NextResponse.json({ success: true });
    return clearSessionCookie(response);
  }
}
