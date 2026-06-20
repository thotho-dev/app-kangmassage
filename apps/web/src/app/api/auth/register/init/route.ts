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

    // Create Supabase auth user (with retry if orphaned auth user exists)
    async function createAuthUser() {
      const result = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        email: mockEmail,
        password,
        email_confirm: true,
        phone_confirm: true,
      });

      if (result.error?.message.toLowerCase().includes('already exist')) {
        const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const filter = encodeURIComponent(`email=eq.${mockEmail}`);
        const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?filter=${filter}`, {
          headers: { Authorization: `Bearer ${svcKey}`, apikey: svcKey! },
        });
        const listJson = await listRes.json();
        const existingId = listJson?.users?.[0]?.id;

        if (existingId) {
          await supabase.auth.admin.deleteUser(existingId);
          await supabase.from('therapists').delete().eq('phone', normalizedPhone);
        }

        const retry = await supabase.auth.admin.createUser({
          phone: normalizedPhone,
          email: mockEmail,
          password,
          email_confirm: true,
          phone_confirm: true,
        });
        if (retry.error) throw retry.error;
        return retry.data;
      }

      if (result.error) throw result.error;
      return result.data;
    }

    const authData = await createAuthUser();

    const supabaseUid = authData.user.id;

    // Clean up any orphaned rows to prevent duplicate key conflicts
    await supabase.from('therapists').delete().eq('supabase_uid', supabaseUid);
    await supabase.from('therapists').delete().eq('phone', normalizedPhone);

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
