import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const requestId = Date.now().toString(36);
  try {
    const { phone, otp, full_name, role = 'user' } = await req.json();
    console.log(`[${requestId}] OTP verify request - phone: ${phone}, role: ${role}`);

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });
    }

    // Normalize phone
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    console.log(`[${requestId}] Normalized phone: ${normalizedPhone}, OTP: ${otp}`);

    const supabase = createAdminClient();

    // 1. Verify OTP from database
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
      console.error(`[${requestId}] OTP lookup failed:`, JSON.stringify(otpFetchError), 'now:', now);
      return NextResponse.json({ error: 'Kode OTP tidak valid atau sudah kedaluwarsa' }, { status: 401 });
    }
    console.log(`[${requestId}] OTP match found: id=${otpRecord.id}, expires_at=${otpRecord.expires_at}`);

    // 2. Mark OTP as used
    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);
    console.log(`[${requestId}] OTP marked as used`);

    // 3. Find or create user profile
    const table = role === 'therapist' ? 'therapists' : 'users';
    let profileData: any;

    const { data: existing, error: lookupError } = await supabase
      .from(table)
      .select('*')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    console.log(`[${requestId}] Profile lookup:`, existing ? `found id=${existing.id}` : 'not found', lookupError ? `error=${lookupError.message}` : '');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const tempPassword = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    if (existing) {
      profileData = existing;

      // Existing user: update their password so we can sign them in
      if (existing.supabase_uid) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existing.supabase_uid,
          { password: tempPassword }
        );
        if (updateError) {
          console.error(`[${requestId}] Failed to update user password:`, updateError.message);
        } else {
          console.log(`[${requestId}] Password updated for auth user: ${existing.supabase_uid}`);
        }
      } else {
        console.warn(`[${requestId}] Profile has no supabase_uid, creating auth user`);
      }
    }

    if (!existing || !existing.supabase_uid) {
      // Create Supabase auth user
      const mockEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@user.pijat.app`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        email: mockEmail,
        password: tempPassword,
        email_confirm: true,
        phone_confirm: true,
      });

      if (authError) {
        console.error(`[${requestId}] Auth user creation error:`, authError.message);
        if (!authError.message.toLowerCase().includes('already exist')) {
          return NextResponse.json({ error: authError.message }, { status: 500 });
        }
      }

      const supabaseUid = authData?.user?.id;
      console.log(`[${requestId}] Auth user created/found: ${supabaseUid}`);

      if (!existing) {
        const { data: newProfile, error: profileError } = await supabase
          .from(table)
          .insert({
            supabase_uid: supabaseUid,
            full_name: full_name || `User ${normalizedPhone.slice(-4)}`,
            phone: normalizedPhone,
            role: role === 'therapist' ? 'therapist' : 'user',
            wallet_balance: 0,
          })
          .select()
          .single();

        if (profileError) {
          console.error(`[${requestId}] Profile creation error:`, JSON.stringify(profileError));
          return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        profileData = newProfile;
        console.log(`[${requestId}] New profile created: id=${newProfile.id}`);
      } else {
        // Update existing profile with supabase_uid
        const { data: updated, error: updateProfileError } = await supabase
          .from(table)
          .update({ supabase_uid: supabaseUid })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateProfileError) {
          console.error(`[${requestId}] Profile update error:`, updateProfileError.message);
        }
        profileData = updated || existing;
      }
    }

    // 4. Sign in using GoTrue REST API to get session
    console.log(`[${requestId}] Signing in with phone: ${normalizedPhone}`);
    let sessionData: any = null;
    try {
      const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          password: tempPassword,
        }),
      });

      sessionData = await signInResponse.json();
      console.log(`[${requestId}] Sign-in response status: ${signInResponse.status}, has_token: ${!!sessionData?.access_token}`);

      if (!signInResponse.ok) {
        console.error(`[${requestId}] Sign-in failed:`, JSON.stringify(sessionData));
      }
    } catch (signInError: any) {
      console.error(`[${requestId}] Sign-in error:`, signInError.message);
    }

    return NextResponse.json({
      data: {
        user: profileData,
        role,
        session: sessionData?.access_token ? {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          user: sessionData.user,
        } : null,
      },
    });
  } catch (err: any) {
    console.error(`[${requestId}] OTP Verify Error:`, err.message, err.stack);
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 });
  }
}
