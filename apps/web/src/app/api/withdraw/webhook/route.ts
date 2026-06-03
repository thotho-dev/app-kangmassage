import { NextResponse } from 'next/server';

// Deprecated — Therapist withdrawals now use Xendit Disbursements.
// This webhook was for the old Midtrans Iris integration.
// Xendit disbursement callbacks are handled at /api/withdraw/xendit-webhook
export async function POST() {
  return NextResponse.json({ status: 'deprecated', message: 'Use /api/withdraw/xendit-webhook instead' });
}
