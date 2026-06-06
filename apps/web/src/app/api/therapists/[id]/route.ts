import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings, DEFAULT_SETTINGS } from '@/lib/settings';

// GET /api/therapists/[id] - Get single therapist
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('therapists')
      .select('*, therapist_locations(*)')
      .eq('id', params.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/therapists/[id] - Update therapist
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    // Remove password from body if it exists (we don't store it in the therapists table)
    delete body.password;

    // Auto-calculate commission_rate based on tier + app_settings (only when tier is explicitly sent)
    if (body.tier !== undefined) {
      const tier = body.tier.toLowerCase();
      const settings = await getAppSettings();
      const tierMap: Record<string, number> = {
        bronze: Number(settings.bronze_platform_cut),
        silver: Number(settings.silver_platform_cut),
        gold: Number(settings.gold_platform_cut),
        platinum: Number(settings.platinum_platform_cut),
        diamond: Number(settings.diamond_platform_cut),
      };
      const platformCut = tierMap[tier] ?? DEFAULT_SETTINGS.bronze_platform_cut;
      body.commission_rate = 100 - platformCut;
    }

    // Auto set offline when deactivated
    if (body.is_active === false) {
      body.status = 'offline';
    }

    // Check NIK uniqueness if provided
    if (body.nik) {
      const { data: existing } = await supabase
        .from('therapists')
        .select('id')
        .eq('nik', body.nik)
        .neq('id', params.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'NIK sudah terdaftar oleh terapis lain.' }, { status: 409 });
      }
    }

    // Fetch current therapist data before updating
    const { data: currentTherapist } = await supabase
      .from('therapists')
      .select('is_verified, push_token')
      .eq('id', params.id)
      .single();

    const { data: therapist, error } = await supabase
      .from('therapists')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Update Error:', error);
      return NextResponse.json({ error: 'Waduh, data terapis gagal diperbarui. Coba cek lagi ya.' }, { status: 500 });
    }

    const pushToken = therapist?.push_token;

    // Notifikasi approve (is_verified berubah dari false ke true)
    if (body.is_verified === true && currentTherapist?.is_verified !== true) {
      const settings = await getAppSettings();
      const platformName = settings.platform_name || DEFAULT_SETTINGS.platform_name;
      await supabase.from('notifications').insert({
        therapist_id: params.id,
        title: `Akun ${platformName} Terverifikasi! 🎉`,
        body: `Selamat! Akun Anda telah diverifikasi oleh admin. Sekarang Anda dapat menerima pesanan.`,
        type: 'account_verified',
        data: { is_verified: true },
      });

      if (pushToken) {
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: pushToken,
            title: `Akun ${platformName} Terverifikasi! 🎉`,
            body: 'Selamat! Akun Anda telah diverifikasi. Sekarang Anda dapat menerima pesanan.',
            data: { type: 'account_verified' },
            sound: 'default',
            priority: 'high',
          }),
        }).catch(err => console.warn('[Push] Gagal kirim notif approve:', err.message));
      }
    }

    // Notifikasi revisi (registration_step = otp_verified + revision_note)
    if (body.registration_step === 'otp_verified' && body.revision_note) {
      const fieldsMatch = body.revision_note.match(/^\[(.*?)\]/);
      const fields = fieldsMatch ? fieldsMatch[1] : '';
      await supabase.from('notifications').insert({
        therapist_id: params.id,
        title: 'Perbaikan Data Diperlukan',
        body: `Admin meminta perbaikan pada: ${fields}. Silakan periksa dan kirim ulang data Anda.`,
        type: 'revision_request',
        data: { revision_note: body.revision_note },
      });

      if (pushToken) {
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: pushToken,
            title: 'Perbaikan Data Diperlukan',
            body: `Admin meminta perbaikan pada: ${fields}. Silakan periksa dan kirim ulang.`,
            data: { type: 'revision_request' },
            sound: 'default',
            priority: 'high',
          }),
        }).catch(err => console.warn('[Push] Gagal kirim notif revisi:', err.message));
      }
    }

    return NextResponse.json({ data: therapist });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Terjadi masalah teknis saat memperbarui data.' }, { status: 500 });
  }
}

// DELETE /api/therapists/[id] - Delete therapist
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    
    // 1. Get the supabase_uid first
    const { data: therapist, error: fetchError } = await supabase
      .from('therapists')
      .select('supabase_uid')
      .eq('id', params.id)
      .single();

    if (fetchError || !therapist?.supabase_uid) {
      // If therapist not found in table, maybe it's already gone or was never linked
      // We'll still try to delete from table just in case id was passed
      const { error: deleteError } = await supabase
        .from('therapists')
        .delete()
        .eq('id', params.id);
      
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // 2. Delete from auth.users (Supabase Auth)
    // This will trigger ON DELETE CASCADE on therapists.supabase_uid
    const { error: authError } = await supabase.auth.admin.deleteUser(therapist.supabase_uid);
    
    if (authError) {
      console.error('Auth Delete Error:', authError);
      // Even if auth delete fails (e.g. user already deleted in Auth), try deleting from table
      await supabase.from('therapists').delete().eq('id', params.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
