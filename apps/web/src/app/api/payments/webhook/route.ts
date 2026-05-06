import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/payments/webhook - Midtrans webhook simulation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, transaction_status, fraud_status } = body;

    const supabase = createAdminClient();

    // Find order by order_number or transaction_id
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .or(`order_number.eq.${order_id}`)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let paymentStatus: string;
    let orderStatus: string | undefined;

    if (transaction_status === 'capture' && fraud_status === 'accept') {
      paymentStatus = 'paid';
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'paid';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      paymentStatus = 'failed';
      orderStatus = 'cancelled';
    } else {
      paymentStatus = 'pending';
    }

    const updateData: Record<string, string> = { payment_status: paymentStatus };
    if (orderStatus) updateData.status = orderStatus;

    if (order_id.startsWith('TOPUP-')) {
      // 1. Update therapist_topups status
      await supabase.from('therapist_topups').update({ status: paymentStatus === 'paid' ? 'paid' : 'failed' }).eq('external_id', order_id);

      // 2. If paid, update therapist balance and create transaction
      if (paymentStatus === 'paid') {
        const { data: topup } = await supabase.from('therapist_topups').select('*').eq('external_id', order_id).single();
        if (topup) {
          const { data: therapist } = await supabase.from('therapists').select('wallet_balance').eq('id', topup.therapist_id).single();
          const newBalance = (therapist?.wallet_balance || 0) + topup.amount;
          
          await supabase.from('therapists').update({ wallet_balance: newBalance }).eq('id', topup.therapist_id);

          await supabase.from('transactions').insert({
            therapist_id: topup.therapist_id,
            type: 'credit',
            amount: topup.amount,
            balance_before: therapist?.wallet_balance || 0,
            balance_after: newBalance,
            description: `Topup Saldo via Midtrans`,
            reference_id: body.transaction_id,
          });

          await supabase.from('notifications').insert({
            therapist_id: topup.therapist_id,
            title: 'Top Up Berhasil!',
            body: `Saldo Anda telah bertambah Rp ${topup.amount.toLocaleString('id-ID')}.`,
            type: 'topup_success',
          });
        }
      }
    } else {
      // Handle normal order
      await supabase.from('orders').update(updateData).eq('id', order.id);

      // Create transaction record for user
      if (paymentStatus === 'paid') {
        const { data: user } = await supabase.from('users').select('wallet_balance').eq('id', order.user_id).single();
        await supabase.from('transactions').insert({
          user_id: order.user_id,
          order_id: order.id,
          type: 'debit',
          amount: order.total_price,
          balance_before: user?.wallet_balance || 0,
          balance_after: (user?.wallet_balance || 0),
          description: `Payment for order ${order.order_number}`,
          reference_id: body.transaction_id,
        });

        await supabase.from('notifications').insert({
          user_id: order.user_id,
          title: 'Payment Successful!',
          body: `Your payment of Rp ${order.total_price.toLocaleString()} has been confirmed.`,
          type: 'payment_success',
          data: { order_id: order.id },
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
