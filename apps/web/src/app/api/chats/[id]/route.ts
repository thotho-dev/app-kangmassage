import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function verifyAdmin(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  return supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', userId)
    .eq('role', 'admin')
    .single();
}

// GET /api/chats/[id] — get messages for a chat
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userClient = createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const admin = await verifyAdmin(supabase, user.id);
    if (!admin.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: chat } = await supabase
      .from('support_chats')
      .select(`*, therapist:therapists(id, full_name, avatar_url, phone)`)
      .eq('id', id)
      .single();

    return NextResponse.json({ messages, chat });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chats/[id] — send message as admin
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userClient = createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const admin = await verifyAdmin(supabase, user.id);
    if (!admin.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { message } = body;
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check chat exists and is active
    const { data: chat } = await supabase
      .from('support_chats')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    if (chat.status === 'closed') {
      return NextResponse.json({ error: 'Chat session is closed' }, { status: 400 });
    }

    const { data: msg, error } = await supabase
      .from('support_messages')
      .insert({ chat_id: id, sender_type: 'admin', message: message.trim() })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update timestamp on chat
    await supabase
      .from('support_chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    // Send Expo Push Notification to therapist (fire & forget)
    const { data: therapistPush } = await supabase
      .from('support_chats')
      .select('therapist_id, therapist:therapists(push_token)')
      .eq('id', id)
      .single();

    const pushToken = (therapistPush as any)?.therapist?.push_token;
    if (pushToken) {
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: pushToken,
          title: 'Pesan baru dari Admin',
          body: message.trim(),
          data: { type: 'support_chat' },
          sound: 'default',
          priority: 'high',
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ data: msg }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chats/[id] — close/delete chat session (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userClient = createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const admin = await verifyAdmin(supabase, user.id);
    if (!admin.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete chat — CASCADE deletes all messages
    const { error } = await supabase
      .from('support_chats')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
