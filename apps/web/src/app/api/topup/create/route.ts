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

    const secretKey = settings.xendit_secret_key || process.env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Xendit secret key not configured' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

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

    const invoiceRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_id: order_id,
        amount,
        description: `Top Up Saldo Mitra Kang Massage - ${therapist.full_name}`,
        customer: {
          given_names: therapist.full_name,
          mobile_number: therapist.phone,
          email: therapist.email || `${therapist.phone}@pijat.com`
        },
        success_redirect_url: 'kang-massage-therapist://profile/topup-history',
        failure_redirect_url: 'kang-massage-therapist://profile/topup',
      }),
    });

    const invoiceData = await invoiceRes.json();

    if (!invoiceRes.ok) {
      console.error('Xendit Invoice Error:', invoiceData);
      return NextResponse.json({ error: invoiceData.message || 'Xendit error' }, { status: 400 });
    }

    await supabase
      .from('therapist_topups')
      .update({ payment_data: invoiceData })
      .eq('id', topup.id);

    return NextResponse.json({
      status: 'success',
      data: {
        invoice_url: invoiceData.invoice_url,
        external_id: order_id,
        amount,
        topup_id: topup.id,
      },
    });

  } catch (error: any) {
    console.error('Topup API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
