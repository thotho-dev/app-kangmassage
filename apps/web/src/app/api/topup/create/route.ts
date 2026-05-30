import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

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

    const settings = await getAppSettings();
    if (amount < Number(settings.topup_min_amount)) {
      return NextResponse.json({ error: `Minimal topup adalah Rp ${Number(settings.topup_min_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }
    if (amount > Number(settings.topup_max_amount)) {
      return NextResponse.json({ error: `Maksimal topup adalah Rp ${Number(settings.topup_max_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }

    const order_id = `TOPUP-${Date.now()}-${therapist.id.slice(0, 8)}`;
    const ADMIN_FEE = Number(settings.topup_admin_fee);
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
    const secretKey = settings.xendit_secret_key || process.env.XENDIT_SECRET_KEY || 'xnd_development_dummykey';
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    // INTERCEPT FOR XENDIT DIRECT SANDBOX / LOCAL TESTING
    if (secretKey === 'xnd_development_dummykey' || secretKey.includes('dummy')) {
      // Pakai Host header biar URL sandbox sesuai IP asli, bukan localhost dari req.url
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0] || 'http';
      const origin = `${protocol}://${host}`;
      const redirectUrl = `${origin}/xendit-sandbox?id=${topup.id}&amount=${amount}&order_id=${order_id}`;

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
      'shopeepay': ['SHOPEEPAY'],
      'dana': ['DANA'],
      'ovo': ['OVO'],
      'linkaja': ['LINKAJA'],
      'bca_va': ['BCA'],
      'mandiri_va': ['MANDIRI'],
      'bni_va': ['BNI'],
      'bri_va': ['BRI'],
      'permata_va': ['PERMATA'],
      'bsi_va': ['BSI'],
      'cimb_va': ['CIMB'],
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
