import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/analytics/dashboard - Dashboard stats
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: totalOrders },
      { count: totalUsers },
      { count: totalTherapists },
      { count: activeOrders },
      { count: onlineTherapists },
      { count: todayOrders },
      revenueResult,
      todayRevenueResult,
      ordersByStatusResult,
      revenueByDayResult,
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('therapists').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'accepted', 'on_the_way', 'in_progress']),
      supabase.from('therapists').select('*', { count: 'exact', head: true }).eq('status', 'online'),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase.from('orders').select('total_price').eq('payment_status', 'paid'),
      supabase.from('orders').select('total_price')
        .eq('payment_status', 'paid')
        .gte('created_at', today.toISOString()),
      supabase.from('orders').select('status'),
      supabase.from('orders').select('created_at, total_price')
        .eq('payment_status', 'paid')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),
    ]);

    // Calculate revenues
    const totalRevenue = (revenueResult.data || []).reduce((sum, o) => sum + (o.total_price || 0), 0);
    const todayRevenue = (todayRevenueResult.data || []).reduce((sum, o) => sum + (o.total_price || 0), 0);

    // Orders by status
    const statusCounts: Record<string, number> = {};
    (ordersByStatusResult.data || []).forEach((o) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // Revenue by day (last 30 days)
    const dayMap: Record<string, { revenue: number; orders: number }> = {};
    (revenueByDayResult.data || []).forEach((o) => {
      const day = new Date(o.created_at).toISOString().split('T')[0];
      if (!dayMap[day]) dayMap[day] = { revenue: 0, orders: 0 };
      dayMap[day].revenue += o.total_price || 0;
      dayMap[day].orders += 1;
    });
    const revenueByDay = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));

    return NextResponse.json({
      data: {
        totalOrders: totalOrders || 0,
        totalRevenue,
        totalUsers: totalUsers || 0,
        totalTherapists: totalTherapists || 0,
        activeOrders: activeOrders || 0,
        onlineTherapists: onlineTherapists || 0,
        todayOrders: todayOrders || 0,
        todayRevenue,
        ordersByStatus,
        revenueByDay,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
