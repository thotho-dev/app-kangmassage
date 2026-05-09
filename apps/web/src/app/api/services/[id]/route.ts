import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/services/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('services').select('*').eq('id', params.id).single();
    if (error) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

// PUT /api/services/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { data, error } = await supabase.from('services').update(body).eq('id', params.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

// DELETE /api/services/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    // Soft Delete: Mark as deleted and inactive
    const { error } = await supabase
      .from('services')
      .update({ is_deleted: true, is_active: false })
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Service deleted' });
  } catch { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
