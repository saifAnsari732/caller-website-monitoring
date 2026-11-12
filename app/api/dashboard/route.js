import { NextResponse } from 'next/server';
import { getCachedDashboardData, getCacheHeaders } from '../../../lib/cache';
import { requireAdminApi } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const adminPayload = await requireAdminApi(request);
    if (!adminPayload) {
      return NextResponse.json({ error: 'Administrator authentication required' }, { status: 401 });
    }
    const data = await getCachedDashboardData(adminPayload.id);
    return NextResponse.json(data, {
      headers: getCacheHeaders(15, 60)
    });
  } catch (err) {
    console.error('Dashboard cache error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
