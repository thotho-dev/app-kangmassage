import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { target, title, body } = await req.json();

    if (!title || !body || !target) {
      return NextResponse.json({ error: 'Title, body, and target are required' }, { status: 400 });
    }

    if (!['users', 'therapists', 'all'].includes(target)) {
      return NextResponse.json({ error: 'Invalid target. Must be users, therapists, or all' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const notifications: { user_id?: string; therapist_id?: string; title: string; body: string; type: string; data: any }[] = [];

    if (target === 'users' || target === 'all') {
      const { data: users } = await supabase.from('users').select('id').eq('is_active', true);
      if (users) {
        users.forEach(u => notifications.push({ user_id: u.id, title, body, type: 'broadcast', data: { target } }));
      }
    }

    if (target === 'therapists' || target === 'all') {
      const { data: therapists } = await supabase.from('therapists').select('id').eq('is_active', true);
      if (therapists) {
        therapists.forEach(t => notifications.push({ therapist_id: t.id, title, body, type: 'broadcast', data: { target } }));
      }
    }

    if (notifications.length === 0) {
      return NextResponse.json({ error: 'No active recipients found' }, { status: 404 });
    }

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) throw error;

    return NextResponse.json({ success: true, count: notifications.length });
  } catch (err) {
    console.error('Broadcast error:', err);
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('title, body, data, created_at')
      .eq('type', 'broadcast')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const seen = new Set<string>();
    const history = data?.filter(item => {
      const key = `${item.title}|${item.body}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) ?? [];

    return NextResponse.json(history);
  } catch (err) {
    console.error('Broadcast history error:', err);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { title, body } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'broadcast')
      .eq('title', title)
      .eq('body', body);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Broadcast delete error:', err);
    return NextResponse.json({ error: 'Failed to delete broadcast' }, { status: 500 });
  }
}
