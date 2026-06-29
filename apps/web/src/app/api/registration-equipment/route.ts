import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/registration-equipment - Public list of active equipment
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('registration_equipment')
      .select('id, name, description, price, discount_price, image_url, is_active, is_mandatory, sort_order, created_at, updated_at')
      .order('sort_order', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/registration-equipment - Admin create
export async function POST(req: NextRequest) {
  try {
    const userClient = createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: admin } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', user.id)
      .eq('role', 'admin')
      .single();

    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'Nama perlengkapan wajib diisi' }, { status: 400 });

    const { data, error } = await supabase
      .from('registration_equipment')
      .insert({
        name: body.name,
        description: body.description || '',
        price: Math.max(0, Number(body.price) || 0),
        discount_price: Math.max(0, Number(body.discount_price) || 0),
        image_url: body.image_url || null,
        is_active: body.is_active !== false,
        is_mandatory: body.is_mandatory === true,
        sort_order: Number(body.sort_order) || 0,
      })
      .select('id, name, description, price, discount_price, image_url, is_active, is_mandatory, sort_order, created_at, updated_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
