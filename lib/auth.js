import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import connectDB from './db';
import User from './models/User';
import AuthSession from './models/AuthSession';
import { SESSION_COOKIE_NAME, signJwtHS256, verifyJwtHS256 } from './jwt-edge';

const PLACEHOLDER_BCRYPT = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8D0R5w7E/p2wV8hH5pL3s7E2K1b2G.';

export async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword), 10);
}

export async function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compare(String(plainPassword), storedHash);
  }
  // Safe constant-time comparison fallback for legacy non-bcrypt records
  const a = Buffer.from(String(plainPassword));
  const b = Buffer.from(String(storedHash));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function validatePasswordStrength(password) {
  const pwd = String(password || '');
  if (pwd.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  return { valid: true };
}

export function sanitizeUserForClient(userDoc) {
  if (!userDoc) return null;
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  return {
    id: String(obj._id || obj.id),
    name: obj.name,
    mobile: obj.mobile || '',
    email: obj.email || '',
    employee_id: obj.employee_id || '',
    role: obj.role || 'telecaller',
    team: obj.team || 'North Region Sales',
    status: obj.status || 'active',
    on_leave: Boolean(obj.on_leave),
    shift_status: obj.shift_status || 'Clocked In',
    daily_call_target: obj.daily_call_target || 50,
    daily_conversion_target: obj.daily_conversion_target || 5,
    last_login_at: obj.last_login_at || null,
    password_changed_at: obj.password_changed_at || null,
    createdAt: obj.createdAt || null
  };
}

export function parseDeviceLabel(userAgent = '') {
  const ua = String(userAgent);
  if (!ua) return 'Web Browser';

  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Google Chrome';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  let os = 'Desktop';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X') && !ua.includes('iPhone') && !ua.includes('iPad')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export function extractTokenFromRequest(request) {
  const cookieToken = request?.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  try {
    const nextCookieToken = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (nextCookieToken) return nextCookieToken;
  } catch {
    // ignore outside request scope
  }

  const authHeader =
    request?.headers?.get?.('authorization') ||
    (() => {
      try {
        return headers().get('authorization');
      } catch {
        return '';
      }
    })();

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export async function requireAdminApi(request) {
  const token = extractTokenFromRequest(request);
  if (!token) return null;
  const payload = await verifyJwtHS256(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export function attachSessionCookie(response, token, rememberMe = false) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  return response;
}

export async function createAuthenticatedSession({ user, request, rememberMe = false }) {
  const sessionId = crypto.randomUUID();
  const expiresInSeconds = rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const userAgent = request.headers.get('user-agent') || '';
  const ipAddress = getClientIp(request);

  await AuthSession.create({
    session_id: sessionId,
    user: user._id,
    device_label: parseDeviceLabel(userAgent),
    user_agent: userAgent,
    ip_address: ipAddress,
    remember_me: Boolean(rememberMe),
    revoked: false,
    last_active_at: new Date(),
    expires_at: expiresAt
  });

  const token = await signJwtHS256(
    {
      id: String(user._id),
      sid: sessionId,
      tv: user.token_version || 0,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id
    },
    expiresInSeconds
  );

  return { token, sessionId, expiresAt };
}

export async function getAuthenticatedUser(request) {
  const token = extractTokenFromRequest(request);
  if (!token) return { user: null, payload: null };

  const payload = await verifyJwtHS256(token);
  if (!payload || !payload.id) return { user: null, payload: null };

  await connectDB();
  const user = await User.findById(payload.id);
  if (!user || user.status === 'disabled' || user.role !== 'admin') {
    return { user: null, payload: null };
  }

  // Verify token_version hasn't been invalidated by password reset / global sign-out
  if ((user.token_version || 0) !== (payload.tv || 0)) {
    return { user: null, payload: null };
  }

  // If session_id is embedded, verify session is not revoked
  if (payload.sid) {
    const session = await AuthSession.findOne({ session_id: payload.sid }).lean();
    if (session && session.revoked) {
      return { user: null, payload: null };
    }
    if (session) {
      AuthSession.updateOne(
        { session_id: payload.sid },
        { $set: { last_active_at: new Date() } }
      ).catch(() => {});
    }
  }

  return { user, payload };
}

export async function ensureAuthBootstrap() {
  return;
}
