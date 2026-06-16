import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) {
      return NextResponse.json({ error: 'Withdrawal ID diperlukan' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: withdrawal, error: wError } = await supabase
      .from('user_withdrawals')
      .select('*, users!inner(*)')
      .eq('id', withdrawal_id)
      .eq('status', 'awaiting_otp')
      .single();

    if (wError || !withdrawal) {
      return NextResponse.json({ error: 'Data penarikan tidak ditemukan' }, { status: 404 });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from('user_withdrawals').update({
      otp_code: otp,
      otp_expires_at: otpExpiresAt,
      otp_verified: false,
    }).eq('id', withdrawal_id);

    // Send OTP via Fonnte
    const fonnteToken = process.env.FONNTE_API_KEY;
    if (fonnteToken) {
      const user = withdrawal.users;
      const localNumber = user.phone.replace(/^\+62/, '').replace(/^62/, '');
      const message = `*${otp}* adalah kode verifikasi penarikan saldo Kang Massage sebesar Rp ${Number(withdrawal.amount).toLocaleString('id-ID')}. Jangan bagikan kode ini kepada siapa pun.`;
      fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: localNumber, message, countryCode: '62' }),
      }).catch(e => console.error('[OTP Resend] Fonnte error:', e));
    }

    return NextResponse.json({ status: 'success', message: 'OTP telah dikirim ulang' });
  } catch (error: any) {
    console.error('[OTP Resend] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
