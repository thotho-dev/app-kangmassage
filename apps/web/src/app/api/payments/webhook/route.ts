import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, transaction_status, fraud_status } = body;

    console.log('Midtrans Webhook Received:', order_id, transaction_status);

    const supabase = createAdminClient();

    // 1. Determine Payment Status
    let paymentStatus: 'paid' | 'failed' | 'pending';
    if (transaction_status === 'capture' && fraud_status === 'accept') {
      paymentStatus = 'paid';
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'paid';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      paymentStatus = 'failed';
    } else {
      paymentStatus = 'pending';
    }

    // 2. Handle TOPUP Logic
    if (order_id.startsWith('TOPUP-')) {
      const { data: topup, error: fetchError } = await supabase
        .from('therapist_topups')
        .select('*')
        .eq('external_id', order_id)
        .single();

      if (fetchError || !topup) {
        return NextResponse.json({ error: 'Topup record not found' }, { status: 404 });
      }

      // Update Topup Status
      await supabase.from('therapist_topups').update({ 
        status: paymentStatus === 'paid' ? 'paid' : paymentStatus === 'failed' ? 'failed' : 'pending' 
      }).eq('id', topup.id);

      // If Paid, Update Balance & Create Transaction
      if (paymentStatus === 'paid' && topup.status !== 'paid') {
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
      
      return NextResponse.json({ status: 'ok', type: 'topup' });
    } 

    // 3. Handle NORMAL ORDER Logic
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .or(`order_number.eq.${order_id}`)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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
        balance_after: (user?.wallet_balance || 0),
        description: `Payment for order ${order.order_number}`,
        reference_id: body.transaction_id,
      });
    }

    return NextResponse.json({ status: 'ok', type: 'order' });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
