import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { phone, password, role = 'user' } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password required' }, { status: 400 });
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+62' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    const supabase = createAdminClient();

    const table = role === 'therapist' ? 'therapists' : 'users';
    const { data: user, error: userError } = await supabase
      .from(table)
      .select('*')
      .eq('phone', normalizedPhone)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    if (!user.supabase_uid) {
      return NextResponse.json({ error: 'Akun tidak memiliki autentikasi' }, { status: 400 });
    }

    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(user.supabase_uid);
    if (authUserError || !authUser.user?.email) {
      return NextResponse.json({ error: 'Gagal mendapatkan informasi akun' }, { status: 500 });
    }

    const email = authUser.user.email;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    return NextResponse.json({ data: { user, authUser: authData.user, session: authData.session } });
  } catch (err: any) {
    console.error('[phone-login] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
