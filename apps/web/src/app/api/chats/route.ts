import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/chats — list support chats (admin)
export async function GET(req: NextRequest) {
  try {
    const userClient = createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: admin } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', user.id)
      .eq('role', 'admin')
      .single();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';

    let query = supabase
      .from('support_chats')
      .select(`
        *,
        therapist:therapists(id, full_name, avatar_url, phone, rating)
      `)
      .order('updated_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chats — create support chat (admin)
export async function POST(req: NextRequest) {
  try {
    const userClient = createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: admin } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', user.id)
      .eq('role', 'admin')
      .single();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { therapist_id } = body;
    if (!therapist_id) {
      return NextResponse.json({ error: 'therapist_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('support_chats')
      .insert({ therapist_id, status: 'active' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send welcome message from admin
    await supabase.from('support_messages').insert({
      chat_id: data.id,
      sender_type: 'admin',
      message: 'Halo! Ada yang bisa kami bantu? Silakan sampaikan pertanyaan atau kendala Anda di sini.',
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
