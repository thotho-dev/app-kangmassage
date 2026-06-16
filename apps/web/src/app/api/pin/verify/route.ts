import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { scryptSync, timingSafeEqual } from 'crypto';

function verifyPin(pin: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    const hash = scryptSync(pin, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const keyBuf = Buffer.from(key, 'hex');
    return hashBuf.length === keyBuf.length && timingSafeEqual(hashBuf, keyBuf);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, pin } = await req.json();

    if (!user_id || !pin) {
      return NextResponse.json({ error: 'User ID dan PIN diperlukan' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, transaction_pin, pin_enabled')
      .eq('id', user_id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (!user.pin_enabled || !user.transaction_pin) {
      return NextResponse.json({ error: 'PIN transaksi belum diatur' }, { status: 400 });
    }

    if (!verifyPin(pin, user.transaction_pin)) {
      return NextResponse.json({ error: 'PIN salah' }, { status: 401 });
    }

    return NextResponse.json({ status: 'success', valid: true });
  } catch (error: any) {
    console.error('[PIN Verify] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
