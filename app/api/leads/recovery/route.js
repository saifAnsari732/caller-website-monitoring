import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db.js';
import { requireAdminApi } from '../../../../lib/auth.js';
import { getRecoveryQueueStats, drainRecoveryQueue } from '../../../../lib/leadIngestionEngine.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const admin = await requireAdminApi(request);
    if (!admin) {
      return NextResponse.json({ error: 'Administrator authentication required' }, { status: 401 });
    }
    const stats = getRecoveryQueueStats();
    return NextResponse.json({
      status: 'active',
      service: 'Zero-Loss Durable Lead Dead-Letter Queue (DLQ)',
      ...stats
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdminApi(request);
    if (!admin) {
      return NextResponse.json({ error: 'Administrator authentication required' }, { status: 401 });
    }
    await connectDB();
    const result = await drainRecoveryQueue(50);
    return NextResponse.json({
      success: true,
      message: `DLQ Drain executed. Drained: ${result.drained}, Remaining: ${result.remaining}`,
      ...result
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
