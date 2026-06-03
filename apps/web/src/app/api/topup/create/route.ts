import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';
import { createXenditPayment } from '@/lib/xendit-core';

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

    const payment = await createXenditPayment(payment_method, {
      external_id: order_id,
      amount,
      customer_name: therapist.full_name,
      customer_phone: therapist.phone,
      customer_email: therapist.email || `${therapist.phone}@pijat.com`,
      secret_key: secretKey,
    });

    await supabase
      .from('therapist_topups')
      .update({ payment_data: payment })
      .eq('id', topup.id);

    return NextResponse.json({
      status: 'success',
      data: { ...payment, topup_id: topup.id },
    });

  } catch (error: any) {
    console.error('Topup API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
