import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_BASE_URL = MIDTRANS_IS_PRODUCTION 
  ? 'https://api.midtrans.com/v2' 
  : 'https://api.sandbox.midtrans.com/v2';

export async function POST(req: NextRequest) {
  try {
    const { therapist_id, amount, payment_method } = await req.json();

    if (!therapist_id || !amount || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Get Therapist Data
    const { data: therapist, error: tError } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', therapist_id)
      .single();

    if (tError || !therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

    const order_id = `TOPUP-${Date.now()}-${therapist.id.slice(0, 8)}`;

    // 2. Create Topup Record
    const { data: topup, error: topupError } = await supabase
      .from('therapist_topups')
      .insert([{
        therapist_id,
        amount,
        status: 'pending',
        external_id: order_id,
        payment_method,
      }])
      .select()
      .single();

    if (topupError) throw topupError;

    // 3. Call Midtrans Core API (Charge)
    const authString = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    
    let payload: any = {
      payment_type: '',
      transaction_details: {
        order_id: order_id,
        gross_amount: amount,
      },
      customer_details: {
        first_name: therapist.full_name,
        email: therapist.email || `${therapist.phone}@pijat.com`,
        phone: therapist.phone,
      },
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

    return NextResponse.json({ 
      status: 'success',
      data: midtransData 
    });

  } catch (error: any) {
    console.error('Topup API Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
