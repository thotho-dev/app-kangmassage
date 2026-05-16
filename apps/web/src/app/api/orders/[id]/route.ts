import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/orders/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(id, full_name, phone, avatar_url),
        therapist:therapists(id, full_name, phone, avatar_url, rating, bio),
        service:services(id, name, description, duration_min, base_price, image_url),
        voucher:vouchers(id, code, type, value),
        order_logs(*)
      `)
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/orders/[id] - Update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { status, therapist_id, cancellation_reason, rating, review } = body;

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      // Set timestamps based on status
      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
        updateData.therapist_id = therapist_id || currentOrder.therapist_id;
      } else if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.payment_status = 'paid';
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        if (cancellation_reason) updateData.cancellation_reason = cancellation_reason;
      }
    }

    if (therapist_id) updateData.therapist_id = therapist_id;
    if (rating) updateData.rating = rating;
    if (review) updateData.review = review;

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        user:users(id, full_name, phone, avatar_url),
        therapist:therapists(id, full_name, phone, avatar_url, rating),
        service:services(id, name, duration_min, base_price, image_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create notifications based on status change
    const notificationMap: Record<string, { title: string; body: string }> = {
      accepted: {
        title: 'Therapist Found!',
        body: `${data.therapist?.full_name} is on the way to your location.`,
      },
      on_the_way: {
        title: 'Therapist On The Way',
        body: 'Your therapist is heading to your location.',
      },
      in_progress: {
        title: 'Session Started',
        body: 'Your massage session has started. Enjoy!',
      },
      completed: {
        title: 'Session Complete!',
        body: 'Your massage session is complete. Thank you for using Pijat!',
      },
      cancelled: {
        title: 'Order Cancelled',
        body: 'Your order has been cancelled.',
      },
    };

    if (status && notificationMap[status]) {
      await supabase.from('notifications').insert({
        user_id: currentOrder.user_id,
        title: notificationMap[status].title,
        body: notificationMap[status].body,
        type: `order_${status}`,
        data: { order_id: currentOrder.id },
      });
    }

    // Update therapist earnings on completion
    if (status === 'completed' && data.therapist_id) {
      const commission = (data.total_price * data.therapist.commission_rate) / 100;
      const { data: therapist } = await supabase
        .from('therapists')
        .select('wallet_balance, total_orders')
        .eq('id', data.therapist_id)
        .single();

      if (therapist) {
        await supabase
          .from('therapists')
          .update({
            wallet_balance: therapist.wallet_balance + commission,
            total_orders: therapist.total_orders + 1,
            status: 'online',
          })
          .eq('id', data.therapist_id);

        await supabase.from('transactions').insert({
          therapist_id: data.therapist_id,
          order_id: data.id,
          type: 'credit',
          amount: commission,
          balance_before: therapist.wallet_balance,
          balance_after: therapist.wallet_balance + commission,
          description: `Earnings from order ${data.order_number}`,
        });
      }
    }

    // 3. Handle REFUND if cancelled and payment was via saldo
    if (status === 'cancelled' && currentOrder.payment_method === 'saldo') {
      const { data: user } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', currentOrder.user_id)
        .single();
      
      if (user) {
        const refundAmount = currentOrder.total_price;
        const newBalance = (user.wallet_balance || 0) + refundAmount;
        
        // Update user balance
        await supabase
          .from('users')
          .update({ wallet_balance: newBalance })
          .eq('id', currentOrder.user_id);
        
        // Log refund transaction
        await supabase.from('transactions').insert({
          user_id: currentOrder.user_id,
          order_id: currentOrder.id,
          type: 'credit',
          amount: refundAmount,
          balance_before: user.wallet_balance,
          balance_after: newBalance,
          description: `Refund pembatalan pesanan ${currentOrder.order_number}`,
        });
      }
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
