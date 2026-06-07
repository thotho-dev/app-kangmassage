import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, sender_id, sender_type, content } = await req.json();

    if (!conversation_id || !sender_id || !sender_type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['user', 'therapist'].includes(sender_type)) {
      return NextResponse.json({ error: 'Invalid sender_type' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Get conversation to know recipient
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 2. Insert message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({ conversation_id, sender_id, sender_type, content })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // 3. Update conversation atomically
    const updateField = sender_type === 'therapist' ? 'user_unread_count' : 'therapist_unread_count';
    await supabase.rpc('increment_conversation_unread', {
      p_conversation_id: conversation_id,
      p_field: updateField
    });

    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        last_message_sender: sender_type,
        last_message_is_read: false
      })
      .eq('id', conversation_id);

    // 4. Send push notification to recipient
    const recipientType = sender_type === 'therapist' ? 'user' : 'therapist';

    let recipientId: string;
    let recipientTable: string;
    let pushTokenField: string;
    let senderName: string;

    if (recipientType === 'user') {
      recipientId = conversation.user_id;
      recipientTable = 'users';

      const { data: senderTherapist } = await supabase
        .from('therapists')
        .select('full_name')
        .eq('id', sender_id)
        .single();
      senderName = senderTherapist?.full_name || 'Terapis';
    } else {
      recipientId = conversation.therapist_id;
      recipientTable = 'therapists';

      const { data: senderUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', sender_id)
        .single();
      senderName = senderUser?.full_name || 'Pelanggan';
    }

    const { data: recipient } = await supabase
      .from(recipientTable)
      .select('push_token')
      .eq('id', recipientId)
      .maybeSingle();

    // 5. Insert in-app notification
    const notifType = 'chat_message';
    const notifPayload: any = {
      title: `Pesan baru dari ${senderName}`,
      body: content,
      type: notifType,
      data: { conversation_id, message_id: message.id, type: notifType }
    };
    if (recipientType === 'user') notifPayload.user_id = recipientId;
    else notifPayload.therapist_id = recipientId;

    await supabase.from('notifications').insert(notifPayload).maybeSingle();

    // 6. Send Expo push if token exists
    if (recipient?.push_token) {
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient.push_token,
          title: notifPayload.title,
          body: content,
          data: { type: notifType, conversation_id, message_id: message.id },
          sound: 'default',
          priority: 'high',
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('[ChatSend] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
