import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/auth/otp/verify
// Only validates OTP, does NOT create user
// Returns: { valid, is_new_user, phone }
export async function POST(req: NextRequest) {
  const requestId = Date.now().toString(36);
  try {
    const { phone, otp, role = 'user' } = await req.json();
    console.log(`[${requestId}] OTP verify - phone: ${phone}, role: ${role}`);

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
      .eq('is_used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpFetchError || !otpRecord) {
      console.log(`[${requestId}] OTP invalid/expired`);
      return NextResponse.json({ error: 'Kode OTP tidak valid atau sudah kedaluwarsa' }, { status: 401 });
    }

    // Mark OTP as used
    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);

    // Check if profile exists
    const table = role === 'therapist' ? 'therapists' : 'users';
    const { data: existing } = await supabase
      .from(table)
      .select('id, full_name, phone')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    const isNewUser = !existing;

    console.log(`[${requestId}] OTP valid. is_new_user: ${isNewUser}`);

    return NextResponse.json({
      valid: true,
      is_new_user: isNewUser,
      phone: normalizedPhone,
      role,
      request_id: requestId,
    });
  } catch (err: any) {
    console.error(`[${requestId}] OTP Verify Error:`, err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
