import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const requestId = Date.now().toString(36);
  try {
    const { phone, full_name, gender, password, role = 'user' } = await req.json();

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

    const table = role === 'therapist' ? 'therapists' : 'users';
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Nomor sudah terdaftar. Silakan login.' }, { status: 409 });
    }

    const mockEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@user.pijat.app`;

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
        // Orphaned auth user exists — look it up via GoTrue Admin API and delete
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
          await supabase.from(table).delete().eq('phone', normalizedPhone);
        }

        // Retry once
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
    await supabase.from(table).delete().eq('supabase_uid', supabaseUid);
    await supabase.from(table).delete().eq('phone', normalizedPhone);

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

    if (profileError) {
      await supabase.auth.admin.deleteUser(supabaseUid).catch(() => {});
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        user: profile,
        role,
      },
    });
  } catch (err: any) {
    console.error(`[${requestId}] Register Error:`, err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
