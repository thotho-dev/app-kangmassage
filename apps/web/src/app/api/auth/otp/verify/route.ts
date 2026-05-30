import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const requestId = Date.now().toString(36);
  try {
    const { phone, otp, role = 'user', skip_step_update, mark_used = true } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: otpRecord, error: otpFetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('otp', otp)
      .eq('role', role)
      .eq('is_used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpFetchError || !otpRecord) {
      return NextResponse.json({ error: 'Kode OTP tidak valid atau sudah kedaluwarsa' }, { status: 401 });
    }

    if (mark_used) {
      await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);
    }

    // Update therapist registration step if role is therapist (skip for forgot-password)
    if (role === 'therapist' && !skip_step_update) {
      await supabase
        .from('therapists')
        .update({ registration_step: 'otp_verified' })
        .eq('phone', normalizedPhone);
    }

    return NextResponse.json({
      valid: true,
      phone: normalizedPhone,
      role,
      request_id: requestId,
    });
  } catch (err: any) {
    console.error(`[${requestId}] OTP Verify Error:`, err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
