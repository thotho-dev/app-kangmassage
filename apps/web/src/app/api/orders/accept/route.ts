import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { orderId, therapistId } = await req.json();

    if (!orderId || !therapistId) {
      return NextResponse.json({ error: 'orderId and therapistId are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'accepted',
        therapist_id: therapistId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .or(`therapist_id.is.null,therapist_id.eq.${therapistId}`)
      .select(`*, user:users(id, full_name, push_token), therapist:therapists(id, full_name, avatar_url)`)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Order already taken or cancelled' }, { status: 409 });
    }

    // Send push notification to customer
    const customerToken = data.user?.push_token;
    if (customerToken) {
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerToken,
          title: 'Pesanan Diterima',
          body: `Terapis ${data.therapist?.full_name || 'Kang Massage'} telah menerima pesanan Anda dan akan segera menuju lokasi.`,
          data: { type: 'order_accepted', order_id: orderId },
          sound: 'default',
          priority: 'high',
        }),
      }).catch(() => {});
    }

    // In-app notification
    try {
      await supabase.from('notifications').insert({
        user_id: data.user_id,
        title: 'Pesanan Diterima',
        body: `Terapis ${data.therapist?.full_name || 'Kang Massage'} telah menerima pesanan Anda.`,
        type: 'order_accepted',
        data: { order_id: orderId },
      });
    } catch {}

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
