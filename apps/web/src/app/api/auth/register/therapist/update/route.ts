import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings, DEFAULT_SETTINGS } from '@/lib/settings';

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      nik, full_name, experience_years, address, rt_rw, kelurahan, district, city, province,
      gender, birth_place, birth_date, marital_status,
      specializations, bio, ktp_photo_url, selfie_photo_url, certificate_url, revision_note, validate_only,
    } = body;

    // Check NIK uniqueness if provided
    if (nik !== undefined && nik) {
      const { data: existing } = await supabase
        .from('therapists')
        .select('id')
        .eq('nik', nik)
        .neq('supabase_uid', user.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'NIK sudah terdaftar oleh terapis lain.' }, { status: 409 });
      }
    }

    // validate_only: hanya validasi, jangan simpan apapun
    if (validate_only) {
      return NextResponse.json({ success: true, validated: true });
    }

    const updateData: any = {};
    if (nik !== undefined) updateData.nik = nik;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (experience_years !== undefined) updateData.experience_years = experience_years;
    if (address !== undefined) updateData.address = address;
    if (rt_rw !== undefined) updateData.rt_rw = rt_rw;
    if (kelurahan !== undefined) updateData.kelurahan = kelurahan;
    if (district !== undefined) updateData.district = district;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (gender !== undefined) updateData.gender = gender;
    if (birth_place !== undefined) updateData.birth_place = birth_place;
    if (birth_date !== undefined) updateData.birth_date = birth_date;
    if (marital_status !== undefined) updateData.marital_status = marital_status;
    if (specializations !== undefined) updateData.specializations = specializations;
    if (bio !== undefined) updateData.bio = bio;
    if (ktp_photo_url !== undefined) updateData.ktp_photo_url = ktp_photo_url;
    if (selfie_photo_url !== undefined) updateData.selfie_photo_url = selfie_photo_url;
    if (certificate_url !== undefined) updateData.certificate_url = certificate_url;
    if (revision_note !== undefined) updateData.revision_note = revision_note;

    updateData.registration_step = 'submitted';

    const { data: therapist, error: updateError } = await supabase
      .from('therapists')
      .update(updateData)
      .eq('supabase_uid', user.id)
      .select('id')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Kirim notifikasi ke admin bahwa ada terapis baru mendaftar
    const settings = await getAppSettings();
    const platformName = settings.platform_name || DEFAULT_SETTINGS.platform_name;

    await supabase.from('notifications').insert({
      title: 'Pendaftaran Terapis Baru',
      body: `Terapis baru telah mengirimkan data pendaftaran untuk diverifikasi.`,
      type: 'registration_submit',
      data: { therapist_id: therapist.id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update Therapist Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
