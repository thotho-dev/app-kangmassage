import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_BASE_URL = MIDTRANS_IS_PRODUCTION 
  ? 'https://api.midtrans.com/v2' 
  : 'https://api.sandbox.midtrans.com/v2';

export async function POST(req: NextRequest) {
  try {
    const { user_id, amount, payment_method } = await req.json();

    if (!user_id || !amount || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Get User Data
    const { data: user, error: uError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (uError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const order_id = `UTOPUP-${Date.now()}-${user.id.slice(0, 8)}`;
    const ADMIN_FEE = 2500;
    const netAmount = amount - ADMIN_FEE;

    // 2. Create User Topup Record
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

    // INTERCEPT FOR DANA DIRECT SANDBOX
    if (process.env.USE_DANA_DIRECT === 'true' && payment_method === 'dana') {
      const url = new URL(req.url);
      const origin = url.origin;
      const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
      const redirectUrl = `${baseAppUrl}/dana-sandbox?id=${topup.id}&amount=${amount}&order_id=${order_id}`;

      const directDanaData = {
        status_code: '201',
        status_message: 'Success, DANA Direct Sandbox transaction created',
        payment_type: 'dana',
        order_id: order_id,
        gross_amount: amount.toString(),
        actions: [
          {
            name: 'deeplink-redirect',
            method: 'GET',
            url: redirectUrl,
          }
        ],
      };

      // Update Topup Record with Payment Data
      await supabase
        .from('user_topups')
        .update({ payment_data: directDanaData })
        .eq('id', topup.id);

      return NextResponse.json({
        status: 'success',
        data: {
          ...directDanaData,
          topup_id: topup.id,
        }
      });
    }

    // 3. Call Midtrans Core API (Charge)
    const authString = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    
    let payload: any = {
      payment_type: '',
      transaction_details: {
        order_id: order_id,
        gross_amount: amount,
      },
      customer_details: {
        first_name: user.full_name,
        email: user.email || `${user.phone}@pijat.com`,
        phone: user.phone,
      },
    };

    // Configure payload based on method
    if (payment_method.includes('_va')) {
      payload.payment_type = 'bank_transfer';
      const bank = payment_method.split('_')[0];
      payload.bank_transfer = { bank: bank };
    } else if (payment_method === 'dana') {
      payload.payment_type = 'dana';
    } else if (payment_method === 'gopay') {
      payload.payment_type = 'gopay';
    } else if (payment_method === 'shopeepay') {
      payload.payment_type = 'shopeepay';
    } else if (payment_method === 'alfamart' || payment_method === 'indomaret') {
      payload.payment_type = 'cstore';
      payload.cstore = { store: payment_method, message: 'Topup Saldo Pijat' };
    } else {
      // Default to QRIS if unknown
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

    // 4. Update Topup Record with Payment Data
    const { error: updateError } = await supabase
      .from('user_topups')
      .update({ payment_data: midtransData })
      .eq('id', topup.id);

    if (updateError) console.error('Failed to update topup payment_data:', updateError);

    // Return the response, including topup_id for checking status
    return NextResponse.json({ 
      status: 'success',
      data: {
        ...midtransData,
        topup_id: topup.id,
      }
    });

  } catch (error: any) {
    console.error('User Topup API Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
