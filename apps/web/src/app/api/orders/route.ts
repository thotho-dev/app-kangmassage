import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/orders - List orders
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');
    const therapistId = searchParams.get('therapist_id');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select(`
        *,
        user:users(id, full_name, phone, avatar_url),
        therapist:therapists(id, full_name, phone, avatar_url, rating),
        service:services(id, name, duration_min, base_price, image_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (userId) query = query.eq('user_id', userId);
    if (therapistId) query = query.eq('therapist_id', therapistId);

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/orders - Create new order
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const {
      user_id,
      service_id,
      address,
      latitude,
      longitude,
      voucher_code,
      user_notes,
      payment_method,
      therapist_preference,
      user_gender,
    } = body;

    // Get service price
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    let discount_amount = 0;
    let voucher_id = null;

    // Apply voucher if provided
    if (voucher_code) {
      const { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucher_code.toUpperCase())
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .lte('valid_from', new Date().toISOString())
        .single();

      if (voucher && service.base_price >= voucher.min_order_amount) {
        voucher_id = voucher.id;
        if (voucher.type === 'percentage') {
          discount_amount = (service.base_price * voucher.value) / 100;
          if (voucher.max_discount) {
            discount_amount = Math.min(discount_amount, voucher.max_discount);
          }
        } else {
          discount_amount = voucher.value;
        }
      }
    }

    const total_price = service.base_price - discount_amount;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id,
        service_id,
        voucher_id,
        address,
        latitude,
        longitude,
        service_price: service.base_price,
        discount_amount,
        total_price,
        status: 'pending',
        payment_status: 'pending',
        payment_method,
      therapist_preference,
      user_gender,
      user_notes,
      })
      .select(`
        *,
        service:services(id, name, duration_min, base_price, image_url)
      `)
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Log initial status
    await supabase.from('order_logs').insert({
      order_id: order.id,
      status: 'pending',
      note: 'Order created, searching for therapist',
    });

    // Create notification
    await supabase.from('notifications').insert({
      user_id,
      title: 'Order Created',
      body: `Your order for ${service.name} has been placed. Finding a therapist...`,
      type: 'order_new',
      data: { order_id: order.id },
    });

    // Push notification to eligible therapists
    try {
      const serviceCategory = service.category_slug || [];
      let therapistQuery = supabase
        .from('therapists')
        .select('id, push_token, specializations, gender')
        .eq('is_verified', true)
        .eq('is_active', true)
        .eq('status', 'online')
        .not('push_token', 'is', null);

      if (therapist_preference && therapist_preference !== 'any') {
        therapistQuery = therapistQuery.eq('gender', therapist_preference);
      }

      const { data: therapists } = await therapistQuery;

      if (therapists && therapists.length > 0) {
        const eligible = therapists.filter((t: any) => {
          const skills: string[] = t.specializations || [];
          const hasSkill = serviceCategory.length === 0 || 
            serviceCategory.some((s: string) => 
              skills.some((ts: string) => ts.toLowerCase() === s.toLowerCase())
            );
          return hasSkill;
        });

        const userData = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', user_id)
          .single();

        const userName = userData.data?.full_name || 'Pelanggan';

        // Build order data with full relations for IncomingOrderModal (expects `users` and `services` keys)
        const orderWithRelations = {
          ...order,
          users: userData.data || { full_name: 'Pelanggan' },
          services: { id: service.id, name: service.name, duration_min: service.duration_min, price_type: service.price_type },
        };

        for (const therapist of eligible) {
          if (!therapist.push_token) continue;

          fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: therapist.push_token,
              title: 'Pesanan Baru Masuk!',
              body: `Pelanggan ${userName} sedang mencari therapist. Ketuk untuk detail.`,
              data: {
                type: 'order_new',
                orderId: order.id,
                orderData: JSON.stringify(orderWithRelations),
              },
              sound: 'default',
              priority: 'high',
              channelId: 'orders_high_priority',
            }),
          }).catch(err => console.warn('[Push] Gagal kirim ke therapist:', therapist.id, err.message));

          await supabase.from('notifications').insert({
            therapist_id: therapist.id,
            title: 'Pesanan Baru',
            body: `Pelanggan ${userName} mencari therapist untuk layanan ${service.name}`,
            type: 'order_new',
            data: { order_id: order.id },
          });
        }

        console.log(`[Push] Notifikasi dikirim ke ${eligible.length} therapist`);
      }
    } catch (pushErr) {
      console.warn('[Push] Error mengirim notifikasi ke therapist:', pushErr);
    }

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
