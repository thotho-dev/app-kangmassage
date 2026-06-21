import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const requestId = Date.now().toString(36);
  const log = (step: string, msg: string) => console.log(`[register/${requestId}] Step ${step}: ${msg}`);
  try {
    const { phone, full_name, gender, password, role = 'user' } = await req.json();
    log('1', `Received: phone=${phone}, name=${full_name}, role=${role}`);

    if (!phone || !full_name || !password) {
      log('1', 'Missing required fields');
      return NextResponse.json({ error: 'Phone, full_name, and password required' }, { status: 400 });
    }
    if (password.length < 6) {
      log('1', 'Password too short');
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    log('2', `Normalized phone: ${normalizedPhone}`);

    const supabase = createAdminClient();
    log('3', 'Admin client created');

    const table = role === 'therapist' ? 'therapists' : 'users';
    const { data: existing, error: existingError } = await supabase
      .from(table)
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();
    log('4', `Check existing: found=${!!existing}, error=${existingError?.message || 'none'}`);

    if (existing) {
      log('4', 'Phone already registered');
      return NextResponse.json({ error: 'Nomor ini sudah terdaftar, yuk masuk aja!' }, { status: 409 });
    }

    const mockEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@user.pijat.app`;
    log('5', `Mock email: ${mockEmail}`);

    async function createAuthUser() {
      log('6', 'Creating auth user...');
      const result = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        email: mockEmail,
        password,
        email_confirm: true,
        phone_confirm: true,
      });
      log('6', `createUser result: error=${result.error?.message || 'none'}, user=${result.data?.user?.id || 'none'}`);

      if (result.error?.message.toLowerCase().includes('already exist')) {
        log('7', 'Orphaned auth user exists, attempting cleanup...');
        const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const filter = encodeURIComponent(`email=eq.${mockEmail}`);
        const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?filter=${filter}`, {
          headers: { Authorization: `Bearer ${svcKey}`, apikey: svcKey! },
        });
        const listJson = await listRes.json();
        log('7', `List admin users: found=${!!listJson?.users?.[0]?.id}`);
        const existingId = listJson?.users?.[0]?.id;

        if (existingId) {
          log('7', `Deleting orphaned auth user: ${existingId}`);
          const delResult = await supabase.auth.admin.deleteUser(existingId);
          log('7', `Delete result: error=${delResult.error?.message || 'none'}`);
          const delProfile = await supabase.from(table).delete().eq('phone', normalizedPhone);
          log('7', `Delete profile: error=${delProfile.error?.message || 'none'}`);
        } else {
          log('7', 'No orphaned auth user found by email');
        }

        log('8', 'Retrying createUser...');
        const retry = await supabase.auth.admin.createUser({
          phone: normalizedPhone,
          email: mockEmail,
          password,
          email_confirm: true,
          phone_confirm: true,
        });
        log('8', `Retry result: error=${retry.error?.message || 'none'}, user=${retry.data?.user?.id || 'none'}`);
        if (retry.error) throw retry.error;
        return retry.data;
      }

      if (result.error) throw result.error;
      return result.data;
    }

    const authData = await createAuthUser();
    log('9', `Auth user created: ${authData.user.id}`);

    const supabaseUid = authData.user.id;

    // Clean up any orphaned rows to prevent duplicate key conflicts
    const clean1 = await supabase.from(table).delete().eq('supabase_uid', supabaseUid);
    log('10', `Clean supabase_uid: error=${clean1.error?.message || 'none'}`);
    const clean2 = await supabase.from(table).delete().eq('phone', normalizedPhone);
    log('10', `Clean phone: error=${clean2.error?.message || 'none'}`);

    const { data: profile, error: profileError } = await supabase
      .from(table)
      .insert({
        supabase_uid: supabaseUid,
        full_name,
        phone: normalizedPhone,
        gender: gender || null,
        role,
        wallet_balance: 0,
      })
      .select()
      .single();
    log('11', `Insert profile: error=${profileError?.message || 'none'}, id=${profile?.id || 'none'}`);

    if (profileError) {
      log('11', `Profile insert failed, deleting auth user ${supabaseUid}`);
      await supabase.auth.admin.deleteUser(supabaseUid).catch(() => {});
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      log('11', 'Profile is null after insert, deleting auth user');
      await supabase.auth.admin.deleteUser(supabaseUid).catch(() => {});
      return NextResponse.json({ error: 'Gagal membuat profil' }, { status: 500 });
    }

    // Sign in to get session (use anon key, not service_role)
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    log('12', `Signing in with email=${mockEmail}, anonKey=${anonKey ? 'set' : 'MISSING'}, supabaseUrl=${supabaseUrl ? 'set' : 'MISSING'}`);

    if (!anonKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Konfigurasi server tidak lengkap' }, { status: 500 });
    }

    const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ email: mockEmail, password }),
    });
    const sessionData = await signInRes.json();
    log('12', `Sign in response status=${signInRes.status}, has_access_token=${!!sessionData?.access_token}, error=${sessionData?.error_description || sessionData?.error || 'none'}`);

    return NextResponse.json({
      data: {
        user: profile,
        role,
        session: sessionData?.access_token ? {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        } : null,
      },
    });
  } catch (err: any) {
    console.error(`[${requestId}] Register Error:`, err.message, err.stack);
    return NextResponse.json({ error: `Internal server error: ${err.message}` }, { status: 500 });
  }
}
