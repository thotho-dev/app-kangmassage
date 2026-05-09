import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/services
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabase
      .from('services')
      .select('*')
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true });

    if (activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/services
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const { data, error } = await supabase
      .from('services')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
