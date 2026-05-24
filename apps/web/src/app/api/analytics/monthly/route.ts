import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

function getMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start: start.toISOString(), end: end.toISOString() };
}

function getPrevMonthRange(year: number, month: number) {
  if (month === 1) {
    return getMonthRange(year - 1, 12);
  }
  return getMonthRange(year, month - 1);
}

// GET /api/analytics/monthly?month=5&year=2026
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const cur = getMonthRange(year, month);
    const prev = getPrevMonthRange(year, month);

    const [curOrders, curCompleted, curStatus, curRevenueByDay, curUsers,
           prevOrders, prevCompleted, prevStatus, prevRevenueByDay, prevUsers] = await Promise.all([
      // Current month
      supabase.from('orders').select('id', { count: 'exact', head: false })
        .gte('created_at', cur.start).lte('created_at', cur.end),
      supabase.from('orders').select('total_price')
        .eq('status', 'completed')
        .gte('completed_at', cur.start).lte('completed_at', cur.end),
      supabase.from('orders').select('status')
        .gte('created_at', cur.start).lte('created_at', cur.end),
      supabase.from('orders').select('created_at, total_price')
        .eq('status', 'completed')
        .gte('created_at', cur.start).lte('created_at', cur.end)
        .order('created_at', { ascending: true }),
      supabase.from('users').select('id', { count: 'exact', head: false })
        .eq('role', 'user')
        .gte('created_at', cur.start).lte('created_at', cur.end),

      // Previous month
      supabase.from('orders').select('id', { count: 'exact', head: false })
        .gte('created_at', prev.start).lte('created_at', prev.end),
      supabase.from('orders').select('total_price')
        .eq('status', 'completed')
        .gte('completed_at', prev.start).lte('completed_at', prev.end),
      supabase.from('orders').select('status')
        .gte('created_at', prev.start).lte('created_at', prev.end),
      supabase.from('orders').select('created_at, total_price')
        .eq('status', 'completed')
        .gte('created_at', prev.start).lte('created_at', prev.end)
        .order('created_at', { ascending: true }),
      supabase.from('users').select('id', { count: 'exact', head: false })
        .eq('role', 'user')
        .gte('created_at', prev.start).lte('created_at', prev.end),
    ]);

    const compute = (
      ordersRes: typeof curOrders,
      completedRes: typeof curCompleted,
      statusRes: typeof curStatus,
      revenueRes: typeof curRevenueByDay,
      usersRes: typeof curUsers
    ) => {
      const totalOrders = ordersRes.count || 0;
      const totalRevenue = (completedRes.data || []).reduce((s, o) => s + (o.total_price || 0), 0);

      const statusCounts: Record<string, number> = {};
      (statusRes.data || []).forEach((o: any) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      const ordersByStatus = Object.entries(statusCounts).map(([s, c]) => ({ status: s, count: c }));

      const dayMap: Record<string, { revenue: number; orders: number }> = {};
      (revenueRes.data || []).forEach((o: any) => {
        const day = new Date(o.created_at).toISOString().split('T')[0];
        if (!dayMap[day]) dayMap[day] = { revenue: 0, orders: 0 };
        dayMap[day].revenue += o.total_price || 0;
        dayMap[day].orders += 1;
      });
      const revenueByDay = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));

      return {
        totalOrders,
        totalRevenue,
        completedOrders: completedRes.count || 0,
        newUsers: usersRes.count || 0,
        ordersByStatus,
        revenueByDay,
      };
    };

    return NextResponse.json({
      current: compute(curOrders, curCompleted, curStatus, curRevenueByDay, curUsers),
      previous: compute(prevOrders, prevCompleted, prevStatus, prevRevenueByDay, prevUsers),
      month,
      year,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
