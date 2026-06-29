import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('payment_id');
    if (!paymentId) {
      return NextResponse.json({ error: 'payment_id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: payment, error: pError } = await supabase
      .from('therapist_registration_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (pError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Already paid
    if (payment.payment_status === 'paid') {
      return NextResponse.json({ status: 'paid', paid_at: payment.paid_at });
    }

    // Failed
    if (payment.payment_status === 'failed') {
      return NextResponse.json({ status: 'failed' });
    }

    // Pending — check Midtrans if we have external_id
    if (payment.payment_status === 'pending' && payment.external_id) {
      const settings = await getAppSettings();
      const serverKey = settings.midtrans_server_key;
      if (serverKey) {
        const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
        const isProduction = settings.midtrans_is_production;
        const MIDTRANS_BASE_URL = isProduction
          ? 'https://api.midtrans.com/v2'
          : 'https://api.sandbox.midtrans.com/v2';

        const statusRes = await fetch(`${MIDTRANS_BASE_URL}/${payment.external_id}/status`, {
          headers: { Authorization: authHeader, Accept: 'application/json' },
        });

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const txStatus = statusData.transaction_status;
          const fraudStatus = statusData.fraud_status;

          if ((txStatus === 'settlement' || txStatus === 'capture') && fraudStatus === 'accept') {
            // Mark as paid
            const now = new Date().toISOString();
            await supabase
              .from('therapist_registration_payments')
              .update({ payment_status: 'paid', paid_at: now, payment_data: { ...payment.payment_data, midtrans_status: statusData } })
              .eq('id', payment.id);

            await supabase
              .from('therapists')
              .update({ registration_fee_paid: true, registration_paid_at: now, registration_payment_id: payment.id })
              .eq('id', payment.therapist_id);

            return NextResponse.json({ status: 'paid', paid_at: now });
          }

          if (txStatus === 'deny' || txStatus === 'cancel' || txStatus === 'expire' || fraudStatus === 'deny') {
            await supabase
              .from('therapist_registration_payments')
              .update({ payment_status: 'failed', payment_data: { ...payment.payment_data, midtrans_status: statusData } })
              .eq('id', payment.id);

            return NextResponse.json({ status: 'failed', reason: statusData.status_message || txStatus });
          }

          // Still pending / challenge
          return NextResponse.json({ status: 'pending', midtrans_status: txStatus });
        }
      }
    }

    return NextResponse.json({ status: payment.payment_status });
  } catch (err: any) {
    console.error('[Registration Payment Check Status]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
