import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Xendit Topup Webhook Received:', JSON.stringify(body, null, 2));

    // Optional Verification Token check
    const callbackToken = req.headers.get('x-callback-token');
    const expectedToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN;
    if (expectedToken && callbackToken !== expectedToken) {
      console.warn('[Xendit Webhook] Unauthorized callback token attempt.');
      return NextResponse.json({ error: 'Unauthorized callback token' }, { status: 401 });
    }

    const { external_id, status, id: invoice_id, amount, paid_amount, payment_channel } = body;

    if (!external_id) {
      return NextResponse.json({ error: 'Missing external_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Determine Status: PAID / SETTLED -> success, EXPIRED -> failed
    let paymentStatus: 'paid' | 'failed' | 'pending' = 'pending';
    if (status === 'PAID' || status === 'SETTLED') {
      paymentStatus = 'paid';
    } else if (status === 'EXPIRED') {
      paymentStatus = 'failed';
    }

    // Process Therapist Top-Up
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

      // Prevent processing duplicate webhooks
      if (topup.status === 'paid') {
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }

      // Update status
      const { error: updateTopupError } = await supabase
        .from('therapist_topups')
        .update({ 
          status: paymentStatus,
          payment_data: body
        })
        .eq('id', topup.id);

      if (updateTopupError) console.error('Xendit Webhook Error: Failed to update topup status', updateTopupError);

      // If PAID, Credit Balance, Transaction, Notification & Push Notifications
      if (paymentStatus === 'paid') {
        const { data: therapist, error: therapistError } = await supabase
          .from('therapists')
          .select('wallet_balance, push_token')
          .eq('id', topup.therapist_id)
          .single();

        if (therapistError || !therapist) {
          console.error('Xendit Webhook Error: Failed to fetch therapist details', therapistError);
        } else {
          const newBalance = (therapist.wallet_balance || 0) + topup.amount;

          // Update therapist balance
          const { error: balanceError } = await supabase
            .from('therapists')
            .update({ wallet_balance: newBalance })
            .eq('id', topup.therapist_id);

          if (balanceError) console.error('Xendit Webhook Error: Failed to update therapist balance', balanceError);

          // Add transaction credit entry
          const { error: transError } = await supabase.from('transactions').insert({
            therapist_id: topup.therapist_id,
            type: 'credit',
            amount: topup.amount,
            balance_before: therapist.wallet_balance || 0,
            balance_after: newBalance,
            description: `Topup Saldo via Xendit (${payment_channel || 'Invoice'})`,
            reference_id: invoice_id,
          });

          if (transError) console.error('Xendit Webhook Error: Failed to insert transaction record', transError);

          // Send Expo Push Notification
          if (therapist.push_token) {
            try {
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: therapist.push_token,
                  title: 'Top Up Berhasil! 🎉',
                  body: `Saldo Rp ${topup.amount.toLocaleString('id-ID')} sudah masuk ke dompet Anda.`,
                  data: { type: 'topup_success' },
                  sound: 'default',
                  priority: 'high',
                }),
              });
            } catch (err) {
              console.error('Failed to send push notification:', err);
            }
          }

          // Create notification record
          await supabase.from('notifications').insert({
            therapist_id: topup.therapist_id,
            title: 'Top Up Berhasil!',
            body: `Saldo Anda telah bertambah Rp ${topup.amount.toLocaleString('id-ID')}.`,
            type: 'topup_success',
          });
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Xendit Webhook Parsing Error:', error.message);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
