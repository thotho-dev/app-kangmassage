import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Xendit Webhook Received:', JSON.stringify(body, null, 2));

    const callbackToken = req.headers.get('x-callback-token');
    const settings = await getAppSettings();
    const expectedToken = settings.xendit_webhook_verification_token || process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN;
    const isSandbox = (settings.xendit_secret_key || process.env.XENDIT_SECRET_KEY || '').includes('dummy');
    if (expectedToken && callbackToken !== expectedToken) {
      if (!(isSandbox && callbackToken === 'dummytoken')) {
        console.warn('[Xendit Webhook] Unauthorized callback token attempt.');
        return NextResponse.json({ error: 'Unauthorized callback token' }, { status: 401 });
      }
    }

    const { external_id, status, id: invoice_id, amount, paid_amount, payment_channel } = body;

    if (!external_id) {
      return NextResponse.json({ error: 'Missing external_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let paymentStatus: 'paid' | 'failed' | 'pending' = 'pending';
    if (status === 'PAID' || status === 'SETTLED') {
      paymentStatus = 'paid';
    } else if (status === 'EXPIRED') {
      paymentStatus = 'failed';
    }

    // 1. THERAPIST TOPUP (TOPUP- prefix)
    if (external_id.startsWith('TOPUP-')) {
      const { data: topup, error: fetchError } = await supabase
        .from('therapist_topups')
        .select('*')
        .eq('external_id', external_id)
        .single();

      if (fetchError || !topup) {
        console.warn(`[Xendit Webhook] Therapist topup not found for: ${external_id}`);
        return NextResponse.json({ status: 'ignored', message: 'Topup record not found' }, { status: 200 });
      }

      if (topup.status === 'paid') {
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }

      await supabase.from('therapist_topups').update({
        status: paymentStatus,
        payment_data: body
      }).eq('id', topup.id);

      if (paymentStatus === 'paid') {
        const { data: therapist } = await supabase
          .from('therapists')
          .select('wallet_balance, push_token')
          .eq('id', topup.therapist_id)
          .single();

        if (therapist) {
          const newBalance = (therapist.wallet_balance || 0) + topup.amount;

          await supabase.from('therapists').update({ wallet_balance: newBalance }).eq('id', topup.therapist_id);

          await supabase.from('transactions').insert({
            therapist_id: topup.therapist_id,
            type: 'credit',
            amount: topup.amount,
            balance_before: therapist.wallet_balance || 0,
            balance_after: newBalance,
            description: `Top Up Saldo (${payment_channel || 'Transfer'})`,
            reference_id: invoice_id,
          });

          if (therapist.push_token) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: therapist.push_token,
                title: 'Top Up Berhasil!',
                body: `Saldo Rp ${topup.amount.toLocaleString('id-ID')} sudah masuk ke dompet Anda.`,
                data: { type: 'topup_success' },
                sound: 'default',
                priority: 'high',
              }),
            });
          }

          await supabase.from('notifications').insert({
            therapist_id: topup.therapist_id,
            title: 'Top Up Berhasil!',
            body: `Saldo Anda telah bertambah Rp ${topup.amount.toLocaleString('id-ID')}.`,
            type: 'topup_success',
          });
        }
      }

      return NextResponse.json({ status: 'ok', type: 'therapist_topup' });
    }

    // 2. USER TOPUP (UTOPUP- prefix)
    if (external_id.startsWith('UTOPUP-')) {
      const { data: topup, error: fetchError } = await supabase
        .from('user_topups')
        .select('*')
        .eq('external_id', external_id)
        .single();

      if (fetchError || !topup) {
        console.warn(`[Xendit Webhook] User topup not found for: ${external_id}`);
        return NextResponse.json({ status: 'ignored', message: 'Topup record not found' }, { status: 200 });
      }

      if (topup.status === 'paid') {
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }

      await supabase.from('user_topups').update({
        status: paymentStatus,
        payment_data: body
      }).eq('id', topup.id);

      if (paymentStatus === 'paid') {
        const { data: user } = await supabase
          .from('users')
          .select('wallet_balance, push_token')
          .eq('id', topup.user_id)
          .single();

        if (user) {
          const newBalance = (user.wallet_balance || 0) + topup.amount;

          await supabase.from('users').update({ wallet_balance: newBalance }).eq('id', topup.user_id);

          await supabase.from('transactions').insert({
            user_id: topup.user_id,
            type: 'credit',
            amount: topup.amount,
            balance_before: user.wallet_balance || 0,
            balance_after: newBalance,
            description: `Top Up Saldo via ${payment_channel || 'Xendit'}`,
            reference_id: invoice_id,
          });

          if (user.push_token) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: user.push_token,
                title: 'Top Up Berhasil!',
                body: `Saldo Rp ${topup.amount.toLocaleString('id-ID')} sudah masuk ke dompet Anda.`,
                data: { type: 'topup_success' },
                sound: 'default',
                priority: 'high',
              }),
            });
          }

          await supabase.from('notifications').insert({
            user_id: topup.user_id,
            title: 'Top Up Berhasil!',
            body: `Saldo Anda telah bertambah Rp ${topup.amount.toLocaleString('id-ID')}.`,
            type: 'topup_success',
          });
        }
      }

      return NextResponse.json({ status: 'ok', type: 'user_topup' });
    }

    // 3. ORDER PAYMENT (no prefix — order_number based)
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', external_id)
      .single();

    if (!order) {
      console.warn(`[Xendit Webhook] Order not found for external_id: ${external_id}`);
      return NextResponse.json({ status: 'ignored', message: 'Order not found' }, { status: 200 });
    }

    const updateData: any = { payment_status: paymentStatus };
    if (paymentStatus === 'failed') updateData.status = 'cancelled';

    await supabase.from('orders').update(updateData).eq('id', order.id);

    if (paymentStatus === 'paid') {
      const { data: user } = await supabase.from('users').select('wallet_balance').eq('id', order.user_id).single();
      await supabase.from('transactions').insert({
        user_id: order.user_id,
        order_id: order.id,
        type: 'debit',
        amount: order.total_price,
        balance_before: user?.wallet_balance || 0,
        balance_after: user?.wallet_balance || 0,
        description: `Payment for order ${order.order_number}`,
        reference_id: invoice_id,
      });
    }

    return NextResponse.json({ status: 'ok', type: 'order' });

  } catch (error: any) {
    console.error('Xendit Webhook Error:', error.message);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
