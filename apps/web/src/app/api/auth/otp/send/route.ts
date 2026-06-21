import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const requestId = Date.now().toString(36);
  try {
    const { phone, role = 'user', skip_check } = await req.json();
    console.log(`[${requestId}] OTP send request for phone: ${phone}, role: ${role}`);

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    console.log(`[${requestId}] Normalized phone: ${normalizedPhone}`);

    const supabase = createAdminClient();

    // Check if phone already registered (skip for change-phone flow)
    if (!skip_check) {
      const table = role === 'therapist' ? 'therapists' : 'users';
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (existing) {
        console.log(`[${requestId}] Phone already registered`);
        return NextResponse.json({
          error: 'Nomor ini sudah terdaftar, yuk masuk aja!',
          is_new_user: false,
          request_id: requestId,
        }, { status: 409 });
      }
    }

    // Invalidate existing OTPs for this phone
    await supabase.from('otp_codes').update({ is_used: true }).eq('phone', normalizedPhone).eq('is_used', false);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[${requestId}] Generated OTP: ${otp}`);

    // Store OTP in database with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        phone: normalizedPhone,
        otp,
        role,
        expires_at: expiresAt,
      });

    if (otpError) {
      console.error(`[${requestId}] Failed to store OTP:`, JSON.stringify(otpError));
      return NextResponse.json({ error: 'Gagal menyimpan OTP', detail: otpError.message }, { status: 500 });
    }
    console.log(`[${requestId}] OTP stored in database successfully`);

    // Send OTP via Fonnte WhatsApp API
    const fonnteToken = process.env.FONNTE_API_KEY;
    console.log(`[${requestId}] FONNTE_API_KEY available: ${!!fonnteToken}`);

    if (fonnteToken) {
      const localNumber = normalizedPhone.replace(/^\+62/, '').replace(/^62/, '');
      const message = `*${otp}* adalah kode verifikasi Kang Massage Anda. Jangan bagikan kode ini kepada siapa pun.`;
      console.log(`[${requestId}] Sending via Fonnte - local number: ${localNumber}`);

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
          console.log(`[${requestId}] Fonnte attempt ${attempt + 1} status: ${fonnteRes.status}, body:`, JSON.stringify(fonnteData));
          if (fonnteRes.ok && fonnteData?.status !== false) {
            console.log(`[${requestId}] Fonnte sent successfully`);
            break;
          }
          console.warn(`[${requestId}] Fonnte attempt ${attempt + 1} failed:`, JSON.stringify(fonnteData));
        } catch (fetchError: any) {
          console.warn(`[${requestId}] Fonnte attempt ${attempt + 1} error:`, fetchError.message);
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    } else {
      console.log(`[${requestId}] FONNTE_API_KEY not set — dev fallback`);
    }

    const isDev = process.env.NODE_ENV === 'development';

    return NextResponse.json({
      message: 'OTP sent successfully',
      request_id: requestId,
      fonnte_configured: !!fonnteToken,
      is_new_user: true,
    });
  } catch (error: any) {
    console.error(`[${requestId}] OTP Send Error:`, error.message, error.stack);
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
