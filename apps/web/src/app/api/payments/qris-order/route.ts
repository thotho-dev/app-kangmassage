import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const { order_id, therapist_id } = await req.json();
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, service:services(name)')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.therapist_id !== therapist_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const settings = await getAppSettings();
    const secretKey = settings.xendit_secret_key || process.env.XENDIT_SECRET_KEY || 'xnd_development_dummykey';
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const external_id = order.order_number;
    const isSandbox = secretKey.includes('dummy');

    if (isSandbox) {
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = `${protocol}://${host}`;
      return NextResponse.json({
        status: 'success',
        data: {
          invoice_url: `${baseUrl}/xendit-sandbox?id=${order_id}&order_id=${external_id}&amount=${order.total_price}&external_id=${external_id}&type=order`,
          qr_code_url: null,
          external_id,
          amount: order.total_price,
        }
      });
    }

    const xenditPayload = {
      external_id,
      amount: order.total_price,
      description: `Pembayaran QRIS ${order.service?.name || 'Layanan Pijat'} - Kang Massage`,
      payment_methods: ['QRIS'],
      success_redirect_url: 'kangmassage://tracking',
      failure_redirect_url: 'kangmassage://order',
    };

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
      console.error('Xendit QRIS Invoice Error:', xenditData);
      return NextResponse.json({ error: xenditData.message || 'Xendit error' }, { status: 400 });
    }

    const qrCodeUrl = xenditData.actions?.find((a: any) => a.name === 'generate-qr-code')?.url || null;

    await supabase.from('orders').update({
      payment_data: xenditData,
    }).eq('id', order_id);

    return NextResponse.json({
      status: 'success',
      data: {
        invoice_url: xenditData.invoice_url,
        qr_code_url: qrCodeUrl,
        external_id,
        amount: order.total_price,
        invoice_id: xenditData.id,
      }
    });
  } catch (error: any) {
    console.error('QRIS Order Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
