import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/auth/otp/debug?phone=+62xxx&role=user
// Returns the latest OTP for debugging purposes (development only)
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoint only available in development' }, { status: 403 });
  }

  const phone = req.nextUrl.searchParams.get('phone');
  const role = req.nextUrl.searchParams.get('role') || 'user';

  if (!phone) {
    return NextResponse.json({ error: 'Query param phone required' }, { status: 400 });
  }

  let normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '+62' + normalizedPhone.substring(1);
  } else if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('phone', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message, hint: 'Apakah tabel otp_codes sudah dibuat? Jalankan migration SQL di Supabase dashboard.' }, { status: 500 });
  }

  return NextResponse.json({
    phone: normalizedPhone,
    records: data.map(r => ({
      id: r.id,
      otp: r.otp,
      is_used: r.is_used,
      expires_at: r.expires_at,
      created_at: r.created_at,
      expired: new Date(r.expires_at) < new Date(),
    })),
  });
}
