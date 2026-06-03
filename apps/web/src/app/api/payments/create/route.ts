import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';
import { createXenditPayment } from '@/lib/xendit-core';

export async function POST(req: NextRequest) {
  try {
    const { order_id, payment_method } = await req.json();
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, service:services(name), user:users(full_name, phone, email)')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const external_id = order.order_number;

    const settings = await getAppSettings();
    const secretKey = settings.xendit_secret_key || process.env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Xendit secret key not configured' }, { status: 500 });
    }

    const payment = await createXenditPayment(payment_method, {
      external_id,
      amount: order.total_price,
      customer_name: order.user?.full_name || 'Guest',
      customer_phone: order.user?.phone,
      customer_email: order.user?.email || `${order.user?.phone}@pijat.com`,
      secret_key: secretKey,
    });

    await supabase.from('orders').update({
      payment_method,
      payment_status: 'pending',
      payment_data: payment,
    }).eq('id', order_id);

    return NextResponse.json({
      status: 'success',
      data: { ...payment, order_id },
    });
  } catch (error: any) {
    console.error('Payment Create Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
