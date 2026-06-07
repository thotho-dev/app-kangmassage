import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

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

    const orderNumber = order.order_number;
    const settings = await getAppSettings();

    const serverKey = settings.midtrans_server_key;
    if (!serverKey) {
      return NextResponse.json({ error: 'Midtrans server key not configured' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    const isProduction = settings.midtrans_is_production;
    const MIDTRANS_BASE_URL = isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';

    let midtransBody: any = {
      payment_type: '',
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

    // VA payment methods
    const vaMethods = ['bca_va', 'bni_va', 'bri_va', 'bsi_va', 'cimb_va'];

    if (payment_method === 'mandiri_va') {
      midtransBody.payment_type = 'echannel';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.echannel = {
        bill_info1: 'Pembayaran Order',
        bill_info2: order.user?.full_name?.slice(0, 30) || 'Pijat',
      };
    } else if (payment_method === 'permata_va') {
      midtransBody.payment_type = 'bank_transfer';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.bank_transfer = { bank: 'permata' };
    } else if (vaMethods.includes(payment_method)) {
      midtransBody.payment_type = 'bank_transfer';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      const bankMap: Record<string, string> = {
        bca_va: 'bca', bni_va: 'bni', bri_va: 'bri',
        bsi_va: 'bsi', cimb_va: 'cimb',
      };
      midtransBody.bank_transfer = { bank: bankMap[payment_method] || 'bca' };
    } else if (['dana', 'ovo', 'linkaja'].includes(payment_method)) {
      midtransBody.payment_type = 'qris';
    } else {
      return NextResponse.json({ error: `Unsupported payment method: ${payment_method}` }, { status: 400 });
    }

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
      console.error('Midtrans Charge Error:', midtransData);
      return NextResponse.json({ error: midtransData.status_message || 'Midtrans charge error' }, { status: 400 });
    }

    // Format response to match client's expectation
    let formattedData: any = {
      amount: order.total_price,
      external_id: orderNumber,
      payment_method,
    };

    if (['dana', 'ovo', 'linkaja'].includes(payment_method)) {
      const qrAction = (midtransData.actions || []).find((a: any) => a.name === 'generate-qr-code');
      formattedData.type = 'qris';
      formattedData.qr_string = midtransData.qr_string || qrAction?.url;
    } else if (payment_method === 'mandiri_va') {
      formattedData.type = 'va';
      formattedData.bank_code = 'MANDIRI';
      formattedData.va_number = `${midtransData.biller_code} - ${midtransData.bill_key}`;
    } else if (payment_method === 'permata_va') {
      formattedData.type = 'va';
      formattedData.bank_code = 'PERMATA';
      formattedData.va_number = midtransData.permata_va_number;
    } else {
      formattedData.type = 'va';
      const bankLabel: Record<string, string> = {
        bca_va: 'BCA', bni_va: 'BNI', bri_va: 'BRI',
        bsi_va: 'BSI', cimb_va: 'CIMB',
      };
      formattedData.bank_code = bankLabel[payment_method] || 'BANK';
      formattedData.va_number = midtransData.va_numbers?.[0]?.va_number;
    }

    await supabase.from('orders').update({
      payment_method,
      payment_status: 'pending',
      payment_data: formattedData,
    }).eq('id', order_id);

    return NextResponse.json({
      status: 'success',
      data: { ...formattedData, order_id },
    });
  } catch (error: any) {
    console.error('Payment Create Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
