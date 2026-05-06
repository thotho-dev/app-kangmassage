import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/auth/otp/verify
export async function POST(req: NextRequest) {
  try {
    const { phone, otp, full_name, role = 'user' } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });
    }

    // Mock OTP verification (always accept "123456" in development)
    const isValidOtp = process.env.NODE_ENV === 'development'
      ? otp === '123456'
      : false; // Replace with actual OTP verification

    if (!isValidOtp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Find or create user
    let profileData;
    const table = role === 'therapist' ? 'therapists' : 'users';

    const { data: existing } = await supabase
      .from(table)
      .select('*')
      .eq('phone', phone)
      .single();

    if (existing) {
      profileData = existing;
    } else {
      // Create new user/therapist
      // First create a Supabase auth user (mock email)
      const mockEmail = `${phone.replace('+', '')}@pijat.app`;
      const mockPassword = `pijat_${phone}_${Date.now()}`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: mockEmail,
        password: mockPassword,
        phone,
        email_confirm: true,
        phone_confirm: true,
      });

      if (authError) {
        // If user already exists in auth, get their data
        if (!authError.message.includes('already exists')) {
          return NextResponse.json({ error: authError.message }, { status: 500 });
        }
      }

      const supabaseUid = authData?.user?.id;

      const { data: newProfile, error: profileError } = await supabase
        .from(table)
        .insert({
          supabase_uid: supabaseUid,
          full_name: full_name || `User ${phone.slice(-4)}`,
          phone,
          role: role === 'therapist' ? undefined : 'user',
        })
        .select()
        .single();

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      profileData = newProfile;
    }

    // Create a session token (simplified JWT-like approach)
    const token = Buffer.from(JSON.stringify({
      id: profileData.id,
      phone,
      role,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    })).toString('base64');

    return NextResponse.json({
      data: {
        token,
        user: profileData,
        role,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
