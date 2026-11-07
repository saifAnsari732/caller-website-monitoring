import { NextResponse } from 'next/server';
import { getCachedMetaStatus, getCacheHeaders } from '../../../../lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getCachedMetaStatus();
    return NextResponse.json(data, {
      headers: getCacheHeaders(15, 60)
    });
  } catch (err) {
    console.error('Meta status cache error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
