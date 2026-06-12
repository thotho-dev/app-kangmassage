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

    await supabase.from('otp_codes').update({ is_used: true }).eq('phone', normalizedPhone).eq('is_used', false);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from('otp_codes').insert({
      phone: normalizedPhone,
      otp,
      role: 'therapist',
      expires_at: expiresAt,
    });

    const fonnteToken = process.env.FONNTE_API_KEY;
    let fonnteSent = false;

    if (fonnteToken) {
      const localNumber = normalizedPhone.replace(/^\+62/, '').replace(/^62/, '');
      const message = `*${otp}* adalah kode OTP untuk reset kata sandi Kang Massage Anda. Jangan bagikan kode ini kepada siapa pun.`;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const fonnteRes = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
              'Authorization': fonnteToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ target: localNumber, message, countryCode: '62' }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const fonnteData = await fonnteRes.json();
          if (fonnteRes.ok && fonnteData?.status !== false) {
            fonnteSent = true;
            break;
          }
          console.warn(`[ForgotSend] Attempt ${attempt + 1} failed:`, JSON.stringify(fonnteData));
        } catch (err: any) {
          console.warn(`[ForgotSend] Attempt ${attempt + 1} error:`, err.message);
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({
      message: 'OTP terkirim',
      fonnte_configured: !!fonnteToken,
      fonnte_sent: fonnteSent,
      ...(!fonnteSent && { otp }),
    });
  } catch (err: any) {
    console.error('[ForgotSend] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
