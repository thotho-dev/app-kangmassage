import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

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

    // Xendit Invoice Integration
    const secretKey = process.env.XENDIT_SECRET_KEY || 'xnd_development_dummykey';
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    // INTERCEPT FOR LOCAL SANDBOX
    if (secretKey === 'xnd_development_dummykey' || secretKey.includes('dummy')) {
      const url = new URL(req.url);
      const origin = url.origin;
      const redirectUrl = `${origin}/xendit-sandbox?id=${order_id}&amount=${order.total_price}&external_id=${external_id}&type=order`;

      const mockData = {
        invoice_url: redirectUrl,
        id: `xendit-inv-${order_id.slice(0, 8)}`,
        external_id,
        status: 'PENDING',
        amount: order.total_price,
        order_id,
      };

      await supabase.from('orders').update({
        payment_method,
        payment_status: 'pending',
        payment_data: mockData,
      }).eq('id', order_id);

      return NextResponse.json({ status: 'success', data: mockData });
    }

    const paymentMethodsMap: Record<string, string[]> = {
      'bca_va': ['BCA'],
      'mandiri_va': ['MANDIRI'],
      'bni_va': ['BNI'],
      'bri_va': ['BRI'],
      'gopay': ['QRIS'],
      'qris': ['QRIS'],
      'shopeepay': ['SHOPEEPAY'],
    };

    const preferredMethods = paymentMethodsMap[payment_method.toLowerCase()];

    const xenditPayload: any = {
      external_id,
      amount: order.total_price,
      description: `Pembayaran ${order.service?.name || 'Layanan Pijat'} - Kang Massage`,
      customer: {
        given_names: order.user?.full_name || 'Guest',
        mobile_number: order.user?.phone,
        email: order.user?.email || `${order.user?.phone}@pijat.com`,
      },
      success_redirect_url: 'kangmassage://history',
      failure_redirect_url: 'kangmassage://order',
    };

    if (preferredMethods) {
      xenditPayload.payment_methods = preferredMethods;
    }

    const response = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(xenditPayload),
    });

    const xenditData = await response.json();

    if (response.status >= 300) {
      console.error('Xendit Invoice Creation Error:', xenditData);
      return NextResponse.json({ error: xenditData.message || 'Xendit error' }, { status: 400 });
    }

    // Update order with payment info
    await supabase.from('orders').update({
      payment_method,
      payment_status: 'pending',
      payment_data: xenditData,
    }).eq('id', order_id);

    return NextResponse.json({
      status: 'success',
      data: { ...xenditData, order_id },
    });
  } catch (error: any) {
    console.error('Payment Create Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
