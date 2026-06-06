import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const { order_id, therapist_id } = await req.json();
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, service:services(name), user:users(full_name, phone, email)')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.therapist_id !== therapist_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const settings = await getAppSettings();
    const serverKey = settings.midtrans_server_key;
    if (!serverKey) {
      return NextResponse.json({ error: 'Midtrans server key not configured' }, { status: 500 });
    }

    const isProduction = settings.midtrans_is_production;
    const MIDTRANS_BASE_URL = isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    const orderNumber = order.order_number;

    const midtransBody = {
      payment_type: 'qris',
      transaction_details: {
        order_id: orderNumber,
        gross_amount: order.total_price,
      },
      customer_details: {
        first_name: order.user?.full_name || 'Guest',
        phone: order.user?.phone,
        email: order.user?.email || `${order.user?.phone}@pijat.com`,
      },
    };

    const midtransRes = await fetch(`${MIDTRANS_BASE_URL}/charge`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(midtransBody),
    });

    const midtransData = await midtransRes.json();

    if (!midtransRes.ok) {
      console.error('Midtrans QRIS Order Error:', midtransData);
      return NextResponse.json({ error: midtransData.status_message || 'Midtrans charge error' }, { status: 400 });
    }

    await supabase.from('orders').update({
      payment_data: midtransData,
      payment_method: 'midtrans',
    }).eq('id', order_id);

    const qrString = midtransData.qr_string || midtransData.actions?.find((a: any) => a.name === 'generate-qr-code')?.url;

    return NextResponse.json({
      status: 'success',
      data: {
        qr_code_url: qrString
          ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`
          : null,
        external_id: orderNumber,
        amount: order.total_price,
      }
    });
  } catch (error: any) {
    console.error('QRIS Order Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
