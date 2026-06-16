import { NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getAppSettings();
    const secretKey = process.env.XENDIT_DISBURSEMENT_SECRET_KEY || process.env.XENDIT_SECRET_KEY || settings.xendit_disbursement_secret_key || settings.xendit_secret_key;
    if (!secretKey) {
      return NextResponse.json({ balance: 0, error: 'Konfigurasi pembayaran belum lengkap' });
    }

    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
    const res = await fetch('https://api.xendit.co/balance?account_type=CASH', {
      headers: { 'Authorization': authHeader },
      cache: 'no-store',
    });
    const data = await res.json();

    if (!res.ok) {
      console.error('[Xendit Balance] Error:', data);
      return NextResponse.json({ balance: 0, error: data.message || data.error || 'Gagal ambil saldo' });
    }

    return NextResponse.json({ balance: Number(data.balance) || 0 });
  } catch (err: any) {
    console.error('[Xendit Balance] Exception:', err.message);
    return NextResponse.json({ balance: 0, error: err.message });
  }
}
