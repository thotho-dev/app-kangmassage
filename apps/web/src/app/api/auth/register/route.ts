import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/auth/register
// Creates auth user + profile with full_name + password
// Returns session
export async function POST(req: NextRequest) {
  const requestId = Date.now().toString(36);
  try {
    const { phone, full_name, password, role = 'user' } = await req.json();
    console.log(`[${requestId}] Register - phone: ${phone}, name: ${full_name}, role: ${role}`);

    if (!phone || !full_name || !password) {
      return NextResponse.json({ error: 'Phone, full_name, and password required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    const supabase = createAdminClient();

    // Check if already exists
    const table = role === 'therapist' ? 'therapists' : 'users';
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Nomor sudah terdaftar. Silakan login.' }, { status: 409 });
    }

    // Create Supabase auth user
    const mockEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@user.pijat.app`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      phone: normalizedPhone,
      email: mockEmail,
      password,
      email_confirm: true,
      phone_confirm: true,
    });

    if (authError) {
      console.error(`[${requestId}] Auth create error:`, authError.message);
      if (authError.message.toLowerCase().includes('already exist')) {
        return NextResponse.json({ error: 'Nomor sudah terdaftar. Silakan login.' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const supabaseUid = authData.user.id;
    console.log(`[${requestId}] Auth user created: ${supabaseUid}`);

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from(table)
      .insert({
        supabase_uid: supabaseUid,
        full_name,
        phone: normalizedPhone,
        role,
        wallet_balance: 0,
      })
      .select()
      .single();

    if (profileError) {
      console.error(`[${requestId}] Profile insert error:`, profileError.message);
      // Cleanup auth user
      await supabase.auth.admin.deleteUser(supabaseUid).catch(() => {});
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Sign in with password to get session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ phone: normalizedPhone, password }),
    });

    const sessionData = await signInResponse.json();
    console.log(`[${requestId}] Sign-in: ${signInResponse.ok ? 'ok' : 'failed'}`);

    return NextResponse.json({
      data: {
        user: profile,
        role,
        session: sessionData?.access_token ? {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          user: sessionData.user,
        } : null,
      },
    });
  } catch (err: any) {
    console.error(`[${requestId}] Register Error:`, err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
