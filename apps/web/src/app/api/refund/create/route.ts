import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const { order_id } = await req.json();
    const supabase = createAdminClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, users (wallet_balance, cashback_balance)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow refund for cancellable statuses
    if (!['pending', 'accepted'].includes(order.status)) {
      return NextResponse.json({ error: 'Order cannot be refunded in current status' }, { status: 400 });
    }

    const userId = order.user_id;
    const totalPrice = Number(order.total_price) || 0;
    const usedCashback = Number(order.used_cashback) || 0;
    const earnedCashback = Number(order.earned_cashback) || 0;

    // 1. Call Midtrans cancel/refund if payment gateway method
    const gatewayMethods = ['gopay', 'qris', 'dana', 'shopeepay', 'ovo', 'linkaja',
      'bca_va', 'bni_va', 'bri_va', 'bsi_va', 'cimb_va', 'mandiri_va', 'permata_va'];

    if (gatewayMethods.includes(order.payment_method)) {
      const settings = await getAppSettings();
      const serverKey = settings.midtrans_server_key;
      if (serverKey) {
        const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
        const isProduction = settings.midtrans_is_production;
        const MIDTRANS_BASE_URL = isProduction
          ? 'https://api.midtrans.com/v2'
          : 'https://api.sandbox.midtrans.com/v2';

        try {
          await fetch(`${MIDTRANS_BASE_URL}/${order.order_number}/cancel`, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          });
        } catch (e) {
          console.warn('Midtrans cancel warning (non-blocking):', e);
        }
      }
    }

    // 2. Credit wallet balance
    const currentBalance = Number(order.users?.wallet_balance) || 0;
    const newBalance = currentBalance + totalPrice;

    const { error: walletError } = await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (walletError) throw walletError;

    // 3. Handle cashback
    if (usedCashback > 0 || earnedCashback > 0) {
      const currentCashback = Number(order.users?.cashback_balance) || 0;
      await supabase
        .from('users')
        .update({ cashback_balance: currentCashback + usedCashback - earnedCashback })
        .eq('id', userId);
    }

    // 4. Mark order as cancelled
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order_id);

    // 5. Create transaction record
    await supabase.from('transactions').insert({
      user_id: userId,
      order_id: order_id,
      type: 'refund',
      amount: totalPrice,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: `Refund pembatalan pesanan ${order.order_number} ke saldo`,
    });

    return NextResponse.json({
      status: 'success',
      data: { refunded_amount: totalPrice, new_balance: newBalance },
    });

  } catch (error: any) {
    console.error('Refund Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
