import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/payments/create - Create Midtrans payment (mock)
export async function POST(req: NextRequest) {
  try {
    const { order_id, payment_method } = await req.json();
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, service:services(name), user:users(full_name, phone)')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Mock Midtrans payment token
    const mockToken = `mock_${Date.now()}_${order.order_number}`;
    const mockPaymentUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockToken}`;

    // Update order with payment info
    await supabase.from('orders').update({
      payment_method,
      payment_status: 'pending',
    }).eq('id', order_id);

    return NextResponse.json({
      data: {
        token: mockToken,
        redirect_url: mockPaymentUrl,
        order_number: order.order_number,
        amount: order.total_price,
        // Mock for dev purposes
        mock_payment: true,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
