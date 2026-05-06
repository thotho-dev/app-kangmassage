import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/therapists - List therapists
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('therapists')
      .select('*, therapist_locations(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    const isActive = searchParams.get('is_active');
    if (isActive) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/therapists - Create therapist (admin)
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    // Normalize phone number to E.164 (Assuming ID +62)
    let phone = body.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '+62' + phone.substring(1);
    } else if (phone.startsWith('8')) {
      phone = '+62' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }

    // Update body with normalized phone for database consistency
    body.phone = phone;

    const password = body.password || phone;
    if (password.length < 6) {
      return NextResponse.json({ error: 'Kata sandi terlalu pendek, minimal gunakan 6 karakter ya.' }, { status: 400 });
    }

    // 1. Create Auth User in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email || undefined,
      phone: phone,
      password: password, 
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: body.full_name,
        role: 'therapist'
      }
    });

    if (authError) {
      console.error('Auth Error Details:', authError);
      
      if (authError.message.includes('already registered')) {
        // Find existing user to get UID
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const user = existingUser.users.find(u => u.phone === phone || u.email === body.email);
        if (user) {
          body.supabase_uid = user.id;
        } else {
          return NextResponse.json({ error: `Akun ini sebenarnya sudah terdaftar, tapi ada sedikit kendala saat menghubungkan datanya. Hubungi tim teknis ya.` }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: `Maaf, ada kendala saat mendaftarkan akun: ${authError.message}` }, { status: 400 });
      }
    } else if (authData.user) {
      body.supabase_uid = authData.user.id;
    }

    // Prepare body for therapists table
    // Ensure phone in DB is also normalized if needed, or keep original
    // body.phone = phone; // Uncomment if you want normalized phone in DB too

    // Remove password from body before inserting into DB
    delete body.password;

    // 2. Insert into therapists table
    const { data, error } = await supabase
      .from('therapists')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Database Error:', error);
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Email atau Nomor Telepon ini sudah digunakan oleh terapis lain. Silakan cek kembali ya.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Waduh, sepertinya ada masalah teknis di database. Silakan coba sesaat lagi.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('API Route Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
