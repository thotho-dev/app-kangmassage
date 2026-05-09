import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_BASE_URL = MIDTRANS_IS_PRODUCTION 
  ? 'https://api.midtrans.com/v2' 
  : 'https://api.sandbox.midtrans.com/v2';

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

    const authString = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    
    let payload: any = {
      transaction_details: {
        order_id: order.order_number,
        gross_amount: order.total_price,
      },
      customer_details: {
        first_name: order.user?.full_name || 'Guest',
        email: order.user?.email || `${order.user?.phone}@pijat.com`,
        phone: order.user?.phone,
      },
      item_details: [{
        id: order.service_id,
        price: order.total_price,
        quantity: 1,
        name: order.service?.name || 'Layanan Pijat',
      }],
    };

    // Configure payload based on method
    if (payment_method.includes('_va')) {
      payload.payment_type = 'bank_transfer';
      const bank = payment_method.split('_')[0];
      payload.bank_transfer = { bank: bank };
    } else if (payment_method === 'gopay') {
      payload.payment_type = 'gopay';
    } else if (payment_method === 'shopeepay') {
      payload.payment_type = 'shopeepay';
    } else if (payment_method === 'qris') {
      payload.payment_type = 'qris';
    } else {
      // Default fallback
      payload.payment_type = 'qris';
    }

    const response = await fetch(`${MIDTRANS_BASE_URL}/charge`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    const midtransData = await response.json();

    if (midtransData.status_code !== '201') {
      console.error('Midtrans Charge Error:', midtransData);
      return NextResponse.json({ error: midtransData.status_message || 'Midtrans error' }, { status: 400 });
    }

    // Update order with payment info
    await supabase.from('orders').update({
      payment_method,
      payment_status: 'pending',
      payment_data: midtransData,
    }).eq('id', order_id);

    return NextResponse.json({
      status: 'success',
      data: midtransData,
    });
  } catch (error: any) {
    console.error('Midtrans Create Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
