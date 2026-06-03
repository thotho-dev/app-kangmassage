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

    const external_id = `UTOPUP-${Date.now()}-${user.id.slice(0, 8)}`;
    const ADMIN_FEE = Number(settings.topup_admin_fee);
    const netAmount = amount - ADMIN_FEE;

    const { data: topup, error: topupError } = await supabase
      .from('user_topups')
      .insert([{
        user_id,
        amount: netAmount,
        fee: ADMIN_FEE,
        status: 'pending',
        external_id,
        payment_method,
      }])
      .select()
      .single();

    if (topupError) throw topupError;

    // Xendit Invoice Integration (Production)
    const secretKey = settings.xendit_secret_key || process.env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Xendit secret key not configured' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const paymentMethodsMap: Record<string, string[]> = {
      'dana': ['DANA'],
      'ovo': ['OVO'],
      'linkaja': ['LINKAJA'],
      'shopeepay': ['SHOPEEPAY'],
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
      external_id,
      amount,
      description: `Top Up Saldo Kang Massage - ${user.full_name}`,
      customer: {
        given_names: user.full_name,
        mobile_number: user.phone,
        email: user.email || `${user.phone}@pijat.com`
      },
      success_redirect_url: 'kangmassage://wallet',
      failure_redirect_url: 'kangmassage://topup',
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

    await supabase
      .from('user_topups')
      .update({ payment_data: xenditData })
      .eq('id', topup.id);

    return NextResponse.json({
      status: 'success',
      data: { ...xenditData, topup_id: topup.id }
    });

  } catch (error: any) {
    console.error('User Topup API Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
