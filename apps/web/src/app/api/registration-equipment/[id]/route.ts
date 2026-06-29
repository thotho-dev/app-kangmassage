import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PUT /api/registration-equipment/[id] - Admin update
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = Math.max(0, Number(body.price) || 0);
    if (body.discount_price !== undefined) updateData.discount_price = Math.max(0, Number(body.discount_price) || 0);
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.is_mandatory !== undefined) updateData.is_mandatory = body.is_mandatory;
    if (body.sort_order !== undefined) updateData.sort_order = Number(body.sort_order);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('registration_equipment')
      .update(updateData)
      .eq('id', params.id)
      .select('id, name, description, price, discount_price, image_url, is_active, is_mandatory, sort_order, created_at, updated_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/registration-equipment/[id] - Admin delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    const { error } = await supabase
      .from('registration_equipment')
      .delete()
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
