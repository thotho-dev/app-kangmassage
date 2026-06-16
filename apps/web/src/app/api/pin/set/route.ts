import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { randomBytes, scryptSync } from 'crypto';

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, pin, confirm_pin } = await req.json();

    if (!user_id || !pin || !confirm_pin) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 });
    }

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: 'PIN harus 6 digit angka' }, { status: 400 });
    }

    if (pin !== confirm_pin) {
      return NextResponse.json({ error: 'PIN tidak cocok' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const hashed = hashPin(pin);

    const { error } = await supabase
      .from('users')
      .update({ transaction_pin: hashed, pin_enabled: true })
      .eq('id', user_id);

    if (error) {
      return NextResponse.json({ error: 'Gagal menyimpan PIN: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'success', message: 'PIN berhasil dibuat' });
  } catch (error: any) {
    console.error('[PIN Set] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
