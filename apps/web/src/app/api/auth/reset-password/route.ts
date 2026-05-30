import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, new_password } = await req.json();

    if (!phone || !otp || !new_password) {
      return NextResponse.json({ error: 'Phone, OTP, dan password baru diperlukan' }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: 'Kata sandi minimal 6 karakter' }, { status: 400 });
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
      return NextResponse.json({ error: 'Kode OTP tidak valid atau sudah kedaluwarsa' }, { status: 401 });
    }

    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);

    const { data: therapist } = await supabase
      .from('therapists')
      .select('supabase_uid')
      .eq('phone', normalizedPhone)
      .single();

    if (!therapist?.supabase_uid) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      therapist.supabase_uid,
      { password: new_password }
    );

    if (updateError) {
      console.error('[ResetPassword] Auth update error:', updateError);
      return NextResponse.json({ error: 'Gagal memperbarui kata sandi' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Kata sandi berhasil diperbarui' });
  } catch (err: any) {
    console.error('[ResetPassword] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
