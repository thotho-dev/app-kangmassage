import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { user_id, therapist_id, title, body, type, data } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing required fields: title, body' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Insert in-app notification (always)
    const notifPayload: any = { title, body, type: type || 'order_update', data: data || {} };
    if (user_id) notifPayload.user_id = user_id;
    if (therapist_id) notifPayload.therapist_id = therapist_id;
    const { error: notifError } = await supabase.from('notifications').insert(notifPayload);
    if (notifError) console.warn('[PushNotif] Failed to insert notification record:', notifError.message);

    // 2. Send Expo push notification
    let pushToken: string | null = null;

    if (user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', user_id)
        .maybeSingle();
      pushToken = user?.push_token || null;
    } else if (therapist_id) {
      const { data: therapist } = await supabase
        .from('therapists')
        .select('push_token')
        .eq('id', therapist_id)
        .maybeSingle();
      pushToken = therapist?.push_token || null;
    }

    if (!pushToken) {
      console.log('[PushNotif] No push_token found for', user_id ? `user:${user_id}` : `therapist:${therapist_id}`);
      return NextResponse.json({ status: 'ok', push_sent: false, reason: 'no_token' });
    }

    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data: { type: type || 'order_update', ...(data || {}) },
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }),
    });

    const pushResult = await pushRes.json();
    if (!pushRes.ok) {
      console.warn('[PushNotif] Expo push failed:', pushResult);
    } else {
      console.log('[PushNotif] Expo push sent:', pushResult?.data?.id || 'ok');
    }

    return NextResponse.json({ status: 'ok', push_sent: pushRes.ok });
  } catch (error: any) {
    console.error('[PushNotif] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
