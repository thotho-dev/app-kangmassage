import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Nomor telepon diperlukan' }, { status: 400 });
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    const supabase = createAdminClient();

    const { data: therapist } = await supabase
      .from('therapists')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (!therapist) {
      return NextResponse.json({
        error: 'Nomor telepon tidak ditemukan. Silakan periksa kembali.',
      }, { status: 404 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from('otp_codes').insert({
      phone: normalizedPhone,
      otp,
      role: 'therapist',
      expires_at: expiresAt,
    });

    const fonnteToken = process.env.FONNTE_API_KEY;
    if (fonnteToken) {
      const localNumber = normalizedPhone.replace(/^\+62/, '').replace(/^62/, '');
      const message = `*${otp}* adalah kode OTP untuk reset kata sandi Kang Massage Anda. Jangan bagikan kode ini kepada siapa pun.`;

      fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': fonnteToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target: localNumber, message, countryCode: '62' }),
      }).catch(err => console.warn('[ForgotSend] Fonnte error:', err.message));
    }

    const isDev = process.env.NODE_ENV === 'development';

    return NextResponse.json({
      message: 'OTP terkirim',
      ...(isDev && !fonnteToken && { mock_otp: otp }),
    });
  } catch (err: any) {
    console.error('[ForgotSend] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
