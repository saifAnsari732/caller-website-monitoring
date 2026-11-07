import { NextResponse } from 'next/server';
import { getCachedDashboardData, getCacheHeaders } from '../../../lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getCachedDashboardData();
    return NextResponse.json(data, {
      headers: getCacheHeaders(15, 60)
    });
  } catch (err) {
    console.error('Dashboard cache error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
