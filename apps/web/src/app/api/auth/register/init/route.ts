import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings, DEFAULT_SETTINGS } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, email, full_name, gender, password, experience_years, device_id } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password required' }, { status: 400 });
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password minimal 8 karakter, harus mengandung huruf besar dan angka' }, { status: 400 });
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('therapists')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Nomor sudah terdaftar. Silakan login.' }, { status: 409 });
    }

    const mockEmail = email || `${normalizedPhone.replace(/[^0-9]/g, '')}@therapist.pijat.app`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      phone: normalizedPhone,
      email: mockEmail,
      password,
      email_confirm: true,
      phone_confirm: true,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('already exist')) {
        return NextResponse.json({ error: 'Nomor sudah terdaftar. Silakan login.' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const supabaseUid = authData.user.id;

    const settings = await getAppSettings();
    const bronzeCut = settings.bronze_platform_cut ?? DEFAULT_SETTINGS.bronze_platform_cut;
    const commissionRate = 100 - bronzeCut;

    const { error: profileError } = await supabase
      .from('therapists')
      .insert({
        supabase_uid: supabaseUid,
        full_name: full_name || 'Terapis',
        phone: normalizedPhone,
        email: mockEmail,
        gender: gender || null,
        experience_years: experience_years || 0,
        device_id: device_id || null,
        tier: 'bronze',
        commission_rate: commissionRate,
        wallet_balance: 0,
        is_verified: false,
        registration_step: 'pending',
      });

    if (profileError) {
      await supabase.auth.admin.deleteUser(supabaseUid).catch(() => {});
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
      body: JSON.stringify({ phone: normalizedPhone, password }),
    });

    const sessionData = await signInResponse.json();

    await supabase.from('therapists').update({ registration_step: 'otp_sent' }).eq('phone', normalizedPhone);

    return NextResponse.json({
      data: {
        session: sessionData?.access_token ? {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          user: sessionData.user,
        } : null,
      },
      phone: normalizedPhone,
    });
  } catch (err: any) {
    console.error('Register Init Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
