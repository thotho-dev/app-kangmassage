import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const { user_id, amount, payment_method } = await req.json();

    if (!user_id || !amount || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: user, error: uError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (uError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const settings = await getAppSettings();
    if (amount < Number(settings.topup_min_amount)) {
      return NextResponse.json({ error: `Minimal topup adalah Rp ${Number(settings.topup_min_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }
    if (amount > Number(settings.topup_max_amount)) {
      return NextResponse.json({ error: `Maksimal topup adalah Rp ${Number(settings.topup_max_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }

    const order_id = `UTOPUP-${Date.now()}-${user.id.slice(0, 8)}`;
    const ADMIN_FEE = Number(settings.topup_admin_fee);
    const netAmount = amount - ADMIN_FEE;

    const serverKey = settings.midtrans_server_key;
    if (!serverKey) {
      return NextResponse.json({ error: 'Midtrans server key not configured' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    const { data: topup, error: topupError } = await supabase
      .from('user_topups')
      .insert([{
        user_id,
        amount: netAmount,
        fee: ADMIN_FEE,
        status: 'pending',
        external_id: order_id,
        payment_method,
      }])
      .select()
      .single();

    if (topupError) throw topupError;

    const isProduction = settings.midtrans_is_production;
    const MIDTRANS_BASE_URL = isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';

    let midtransBody: any = {
      payment_type: '',
      transaction_details: {
        order_id: order_id,
        gross_amount: amount,
      },
      customer_details: {
        first_name: user.full_name,
        phone: user.phone,
        email: user.email || `${user.phone}@pijat.com`,
      },
    };

    // Map payment methods to Midtrans payment types
    const ewalletMethods = ['shopeepay'];
    const qrisMethods = ['dana', 'ovo', 'linkaja'];
    const vaMethods = ['bca_va', 'bni_va', 'bri_va', 'permata_va', 'bsi_va', 'cimb_va'];
    const retailMethods = ['alfamart', 'indomaret'];

    if (payment_method === 'gopay') {
      midtransBody.payment_type = 'gopay';
      midtransBody.gopay = {
        enable_callback: true,
        callback_url: 'kang-massage-user://topup-history',
      };
    } else if (payment_method === 'qris') {
      midtransBody.payment_type = 'qris';
    } else if (payment_method === 'shopeepay') {
      midtransBody.payment_type = 'shopeepay';
    } else if (qrisMethods.includes(payment_method)) {
      midtransBody.payment_type = 'qris';
    } else if (payment_method === 'mandiri_va') {
      midtransBody.payment_type = 'echannel';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.echannel = {
        bill_info1: 'Topup Saldo',
        bill_info2: user.full_name.slice(0, 30),
      };
    } else if (payment_method === 'bca_va') {
      midtransBody.payment_type = 'bank_transfer';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.bank_transfer = { bank: 'bca' };
    } else if (payment_method === 'bni_va') {
      midtransBody.payment_type = 'bank_transfer';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.bank_transfer = { bank: 'bni' };
    } else if (payment_method === 'bri_va') {
      midtransBody.payment_type = 'bank_transfer';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.bank_transfer = { bank: 'bri' };
    } else if (payment_method === 'permata_va') {
      midtransBody.payment_type = 'bank_transfer';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.bank_transfer = { bank: 'permata' };
    } else if (payment_method === 'bsi_va') {
      midtransBody.payment_type = 'bank_transfer';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.bank_transfer = { bank: 'bsi' };
    } else if (payment_method === 'cimb_va') {
      midtransBody.payment_type = 'bank_transfer';
      if (midtransBody.customer_details) {
        delete midtransBody.customer_details.first_name;
        delete midtransBody.customer_details.last_name;
      }
      midtransBody.bank_transfer = { bank: 'cimb' };
    } else if (retailMethods.includes(payment_method)) {
      midtransBody.payment_type = 'cstore';
      midtransBody.cstore = {
        store: payment_method === 'alfamart' ? 'alfamart' : 'indomaret',
        message: 'Pembayaran Topup Saldo',
      };
    } else {
      return NextResponse.json({ error: `Metode pembayaran ${payment_method} tidak didukung` }, { status: 400 });
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

    await supabase
      .from('user_topups')
      .update({ payment_data: midtransData })
      .eq('id', topup.id);

    // Format response to match payment-details expectations
    let formattedData: any = {
      amount,
      external_id: order_id,
      topup_id: topup.id,
      payment_method,
    };

    if (payment_method === 'gopay') {
      const actions = midtransData.actions || [];
      const deeplinkAction = actions.find((a: any) => a.name === 'deeplink-redirect');
      const qrCodeAction = actions.find((a: any) => a.name === 'generate-qr-code');
      formattedData.type = 'ewallet';
      formattedData.qr_string = midtransData.qr_string || qrCodeAction?.url;
      formattedData.actions = {
        mobile_web_checkout_url: deeplinkAction?.url,
        deeplink_checkout_url: deeplinkAction?.url,
      };
    } else if (payment_method === 'qris') {
      const actions = midtransData.actions || [];
      const qrCodeAction = actions.find((a: any) => a.name === 'generate-qr-code');
      formattedData.type = 'qris';
      formattedData.qr_string = midtransData.qr_string || qrCodeAction?.url;
    } else if (payment_method === 'shopeepay') {
      const actions = midtransData.actions || [];
      const deeplinkAction = actions.find((a: any) => a.name === 'deeplink-redirect');
      formattedData.type = 'ewallet';
      formattedData.actions = {
        mobile_web_checkout_url: deeplinkAction?.url,
        deeplink_checkout_url: deeplinkAction?.url,
      };
    } else if (qrisMethods.includes(payment_method)) {
      const actions = midtransData.actions || [];
      const qrCodeAction = actions.find((a: any) => a.name === 'generate-qr-code');
      formattedData.type = 'qris';
      formattedData.qr_string = midtransData.qr_string || qrCodeAction?.url;
    } else if (payment_method === 'mandiri_va') {
      formattedData.type = 'va';
      formattedData.bank_code = 'MANDIRI';
      formattedData.va_number = `${midtransData.biller_code} - ${midtransData.bill_key}`;
    } else if (retailMethods.includes(payment_method)) {
      formattedData.type = 'retail';
      formattedData.retail_outlet_name = payment_method === 'alfamart' ? 'ALFAMART' : 'INDOMARET';
      formattedData.payment_code = midtransData.payment_code;
    } else {
      formattedData.type = 'va';
      let bankCode = '';
      if (payment_method === 'bca_va') bankCode = 'BCA';
      else if (payment_method === 'bni_va') bankCode = 'BNI';
      else if (payment_method === 'bri_va') bankCode = 'BRI';
      else if (payment_method === 'permata_va') bankCode = 'PERMATA';
      else if (payment_method === 'bsi_va') bankCode = 'BSI';
      else if (payment_method === 'cimb_va') bankCode = 'CIMB';

      formattedData.bank_code = bankCode;
      if (payment_method === 'permata_va') {
        formattedData.va_number = midtransData.permata_va_number;
      } else {
        formattedData.va_number = midtransData.va_numbers?.[0]?.va_number;
      }
    }

    return NextResponse.json({
      status: 'success',
      data: formattedData,
    });

  } catch (error: any) {
    console.error('User Topup API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
