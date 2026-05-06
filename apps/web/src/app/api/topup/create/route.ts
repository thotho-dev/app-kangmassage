import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const API_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

export async function POST(req: NextRequest) {
  try {
    const { therapist_id, amount, payment_method } = await req.json();
    const supabase = createAdminClient();

    // 1. Get Therapist Info
    const { data: therapist, error: tError } = await supabase
      .from('therapists')
      .select('full_name, email, phone')
      .eq('id', therapist_id)
      .single();

    if (tError || !therapist) {
      return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });
    }

    const order_id = `TOPUP-${Date.now()}-${therapist_id.slice(0, 8)}`;

    // 2. Create Topup record
    const { data: topup, error: topupError } = await supabase
      .from('therapist_topups')
      .insert([{
        therapist_id,
        amount,
        status: 'pending',
        external_id: order_id,
      }])
      .select()
      .single();

    if (topupError) {
      return NextResponse.json({ error: 'Failed to create topup record' }, { status: 500 });
    }

    // 3. Call Midtrans API
    const authString = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    
    // Map UI payment method to Midtrans enabled_payments
    let enabled_payments: string[] | undefined = undefined;
    if (payment_method && payment_method !== 'other') {
      if (payment_method === 'gopay') enabled_payments = ['gopay', 'qris'];
      else enabled_payments = [payment_method];
    }

    const payload = {
      transaction_details: {
        order_id: order_id,
        gross_amount: amount,
      },
      customer_details: {
        first_name: therapist.full_name,
        email: therapist.email || `${therapist.phone}@pijat.com`,
        phone: therapist.phone,
      },
      item_details: [
        {
          id: 'TOPUP',
          price: amount,
          quantity: 1,
          name: 'Top Up Saldo Mitra Pijat',
        },
      ],
      enabled_payments: enabled_payments,
    };

    // If no real server key, return mock
    if (!MIDTRANS_SERVER_KEY || MIDTRANS_SERVER_KEY === 'your_midtrans_server_key') {
      const mockToken = `mock_${Date.now()}`;
      const mockUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockToken}`;
      return NextResponse.json({
        data: {
          token: mockToken,
          redirect_url: mockUrl,
          order_id: order_id,
        }
      });
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    const midtransData = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: midtransData.error_messages || 'Midtrans Error' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        token: midtransData.token,
        redirect_url: midtransData.redirect_url,
        order_id: order_id,
      }
    });

  } catch (error: any) {
    console.error('Topup Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
