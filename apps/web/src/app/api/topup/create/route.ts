import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

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
    const ADMIN_FEE = 2500;
    const netAmount = amount - ADMIN_FEE;

    // 2. Create Topup Record
    const { data: topup, error: topupError } = await supabase
      .from('therapist_topups')
      .insert([{
        therapist_id,
        amount: netAmount,
        fee: ADMIN_FEE,
        status: 'pending',
        external_id: order_id,
        payment_method,
      }])
      .select()
      .single();

    if (topupError) throw topupError;

    // 3. Integrate Xendit Invoice API
    const secretKey = process.env.XENDIT_SECRET_KEY || 'xnd_development_dummykey';
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    // INTERCEPT FOR XENDIT DIRECT SANDBOX / LOCAL TESTING
    if (secretKey === 'xnd_development_dummykey' || secretKey.includes('dummy')) {
      const url = new URL(req.url);
      const origin = url.origin;
      const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
      const redirectUrl = `${baseAppUrl}/xendit-sandbox?id=${topup.id}&amount=${amount}&order_id=${order_id}`;

      const directXenditData = {
        invoice_url: redirectUrl,
        id: `xendit-inv-${topup.id.slice(0, 8)}`,
        external_id: order_id,
        status: 'PENDING',
        amount: amount,
      };

      // Update Topup Record with Payment Data
      await supabase
        .from('therapist_topups')
        .update({ payment_data: directXenditData })
        .eq('id', topup.id);

      return NextResponse.json({
        status: 'success',
        data: {
          ...directXenditData,
          topup_id: topup.id,
        }
      });
    }

    // Map payment_method to Xendit allowed payment channels if specific method chosen
    const paymentMethodsMap: Record<string, string[]> = {
      'gopay': ['QRIS'],
      'shopeepay': ['SHOPEEPAY'],
      'dana': ['DANA'],
      'bca_va': ['BCA'],
      'mandiri_va': ['MANDIRI'],
      'bni_va': ['BNI'],
      'bri_va': ['BRI'],
      'alfamart': ['ALFAMART'],
      'indomaret': ['INDOMARET'],
    };

    const preferredMethods = paymentMethodsMap[payment_method.toLowerCase()];

    const xenditPayload: any = {
      external_id: order_id,
      amount: amount,
      description: `Top Up Saldo Mitra Kang Massage - ${therapist.full_name}`,
      customer: {
        given_names: therapist.full_name,
        mobile_number: therapist.phone,
        email: therapist.email || `${therapist.phone}@pijat.com`
      },
      success_redirect_url: 'kang-massage-therapist://profile/topup-history',
      failure_redirect_url: 'kang-massage-therapist://profile/topup',
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

    // Update Topup Record with Payment Data
    await supabase
      .from('therapist_topups')
      .update({ payment_data: xenditData })
      .eq('id', topup.id);

    return NextResponse.json({
      status: 'success',
      data: {
        ...xenditData,
        topup_id: topup.id,
      }
    });

  } catch (error: any) {
    console.error('Topup API Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
