import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

// GET /api/analytics/dashboard - Dashboard stats
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const settings = await getAppSettings();

    const tierCutMap: Record<string, number> = {
      bronze: Number(settings.bronze_platform_cut),
      silver: Number(settings.silver_platform_cut),
      gold: Number(settings.gold_platform_cut),
      platinum: Number(settings.platinum_platform_cut),
      diamond: Number(settings.diamond_platform_cut),
    };

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
      { count: completedOrders },
      { count: todayNewUsers },
      { count: verifiedTherapists },
      ratingResult,
      therapistTopupResult,
      therapistTopupTodayResult,
      therapistWithdrawResult,
      therapistWithdrawTodayResult,
      userTopupResult,
      userTopupTodayResult,
      userWithdrawResult,
      userWithdrawTodayResult,
      completedOrdersWithTier,
      therapistBalanceResult,
      userBalanceResult,
      recentOrdersResult,
      recentActivityResult,
      therapistTopupsRecentResult,
      userTopupsRecentResult,
      therapistWithdrawalsRecentResult,
      userWithdrawalsRecentResult,
    ] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: false }),
      supabase.from('users').select('id', { count: 'exact', head: false }).eq('role', 'user'),
      supabase.from('therapists').select('id', { count: 'exact', head: false }).eq('is_active', true),
      supabase.from('orders').select('id', { count: 'exact', head: false })
        .in('status', ['pending', 'accepted', 'on_the_way', 'in_progress']),
      supabase.from('therapists').select('id', { count: 'exact', head: false }).eq('status', 'online'),
      supabase.from('orders').select('id', { count: 'exact', head: false })
        .gte('created_at', today.toISOString()),
      supabase.from('orders').select('total_price').eq('status', 'completed'),
      supabase.from('orders').select('total_price')
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString()),
      supabase.from('orders').select('status'),
      supabase.from('orders').select('created_at, total_price')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),
      supabase.from('orders').select('id', { count: 'exact', head: false }).eq('status', 'completed'),
      supabase.from('users').select('id', { count: 'exact', head: false })
        .eq('role', 'user')
        .gte('created_at', today.toISOString()),
      supabase.from('therapists').select('id', { count: 'exact', head: false }).eq('is_verified', true),
      supabase.from('therapists').select('rating').eq('is_active', true),
      // Therapist topups (all time + today)
      // Use payment_data IS NOT NULL as fallback for sandbox (status stays 'pending')
      supabase.from('therapist_topups').select('amount, fee')
        .or('status.eq.paid,payment_data.not.is.null'),
      supabase.from('therapist_topups').select('amount, fee')
        .or('status.eq.paid,payment_data.not.is.null')
        .gte('created_at', today.toISOString()),
      // Therapist withdrawals (all time + today)
      supabase.from('therapist_withdrawals').select('amount, fee').eq('status', 'completed'),
      supabase.from('therapist_withdrawals').select('amount, fee')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString()),
      // User topups (all time + today)
      supabase.from('user_topups').select('amount, fee')
        .or('status.eq.paid,payment_data.not.is.null'),
      supabase.from('user_topups').select('amount, fee')
        .or('status.eq.paid,payment_data.not.is.null')
        .gte('created_at', today.toISOString()),
      // User withdrawals (all time + today)
      supabase.from('user_withdrawals').select('amount, admin_fee').eq('status', 'completed'),
      supabase.from('user_withdrawals').select('amount, admin_fee')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString()),
      // Completed orders with therapist tier for platform fee calculation
      supabase.from('orders').select('total_price, therapist:therapists(tier)')
        .eq('status', 'completed')
        .not('therapist_id', 'is', null),
      // Total therapist wallet balance
      supabase.from('therapists').select('wallet_balance'),
      // Total user wallet balance
      supabase.from('users').select('wallet_balance'),
      // Recent orders
      supabase.from('orders')
        .select('id, order_number, status, total_price, created_at, user:users(full_name), therapist:therapists(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
      // Recent activity (order logs)
      supabase.from('order_logs')
        .select('id, status, note, created_at, order:orders(order_number)')
        .order('created_at', { ascending: false })
        .limit(20),
      // Therapist topups (recent)
      supabase.from('therapist_topups')
        .select('id, amount, status, created_at, therapist:therapists(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
      // User topups (recent)
      supabase.from('user_topups')
        .select('id, amount, status, created_at, user:users(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
      // Therapist withdrawals (recent)
      supabase.from('therapist_withdrawals')
        .select('id, amount, status, created_at, therapist:therapists(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
      // User withdrawals (recent)
      supabase.from('user_withdrawals')
        .select('id, amount, status, created_at, user:users(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Calculate revenues
    const totalRevenue = (revenueResult.data || []).reduce((sum, o) => sum + (o.total_price || 0), 0);
    const todayRevenue = (todayRevenueResult.data || []).reduce((sum, o) => sum + (o.total_price || 0), 0);

    // Calculate platform fee from completed orders (based on therapist tier)
    let totalPlatformFee = 0;
    let totalTherapistEarnings = 0;
    (completedOrdersWithTier.data || []).forEach((o: any) => {
      const tier = o.therapist?.tier || 'bronze';
      const cutPercent = tierCutMap[tier.toLowerCase()] || Number(settings.bronze_platform_cut);
      const fee = (o.total_price || 0) * (cutPercent / 100);
      totalPlatformFee += fee;
      totalTherapistEarnings += (o.total_price || 0) - fee;
    });

    // Today's completed orders for platform fee (use completed_at)
    const { data: todayCompletedOrders } = await supabase
      .from('orders')
      .select('total_price, therapist:therapists(tier)')
      .eq('status', 'completed')
      .not('therapist_id', 'is', null)
      .gte('completed_at', today.toISOString());

    let todayPlatformFee = 0;
    (todayCompletedOrders || []).forEach((o: any) => {
      const tier = o.therapist?.tier || 'bronze';
      const cutPercent = tierCutMap[tier.toLowerCase()] || Number(settings.bronze_platform_cut);
      todayPlatformFee += (o.total_price || 0) * (cutPercent / 100);
    });

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

    // Average rating
    const ratings = (ratingResult.data || []).map((r: any) => Number(r.rating)).filter(r => r > 0);
    const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;

    // Aggregate topup totals
    const sumField = (arr: any[], field: string) => arr.reduce((s: number, o: any) => s + (Number(o[field]) || 0), 0);

    const therapistTopupTotal = sumField(therapistTopupResult.data || [], 'amount');
    const therapistTopupToday = sumField(therapistTopupTodayResult.data || [], 'amount');
    const therapistTopupFeeTotal = sumField(therapistTopupResult.data || [], 'fee');
    const therapistTopupFeeToday = sumField(therapistTopupTodayResult.data || [], 'fee');

    const therapistWithdrawTotal = sumField(therapistWithdrawResult.data || [], 'amount');
    const therapistWithdrawToday = sumField(therapistWithdrawTodayResult.data || [], 'amount');
    const therapistWithdrawFeeTotal = sumField(therapistWithdrawResult.data || [], 'fee');
    const therapistWithdrawFeeToday = sumField(therapistWithdrawTodayResult.data || [], 'fee');

    const userTopupTotal = sumField(userTopupResult.data || [], 'amount');
    const userTopupToday = sumField(userTopupTodayResult.data || [], 'amount');
    const userTopupFeeTotal = sumField(userTopupResult.data || [], 'fee');
    const userTopupFeeToday = sumField(userTopupTodayResult.data || [], 'fee');

    const userWithdrawTotal = sumField(userWithdrawResult.data || [], 'amount');
    const userWithdrawToday = sumField(userWithdrawTodayResult.data || [], 'amount');
    const userWithdrawFeeTotal = sumField(userWithdrawResult.data || [], 'admin_fee');
    const userWithdrawFeeToday = sumField(userWithdrawTodayResult.data || [], 'admin_fee');

    // Total wallet balances
    const totalTherapistBalance = sumField(therapistBalanceResult.data || [], 'wallet_balance');
    const totalUserBalance = sumField(userBalanceResult.data || [], 'wallet_balance');

    return NextResponse.json({
      data: {
        // Orders
        totalOrders: totalOrders || 0,
        activeOrders: activeOrders || 0,
        todayOrders: todayOrders || 0,
        completedOrders: completedOrders || 0,

        // Revenue
        totalRevenue,
        todayRevenue,
        totalPlatformFee,
        todayPlatformFee,
        totalTherapistEarnings,

        // Users
        totalUsers: totalUsers || 0,
        newUsersToday: todayNewUsers || 0,

        // Therapists
        totalTherapists: totalTherapists || 0,
        onlineTherapists: onlineTherapists || 0,
        verifiedTherapists: verifiedTherapists || 0,
        avgRating: Math.round(avgRating * 100) / 100,

        // Wallet Balances
        totalTherapistBalance,
        totalUserBalance,

        // Topup
        totalTopup: therapistTopupTotal + userTopupTotal,
        todayTopup: therapistTopupToday + userTopupToday,
        totalTopupFee: therapistTopupFeeTotal + userTopupFeeTotal,
        todayTopupFee: therapistTopupFeeToday + userTopupFeeToday,

        // Withdrawal
        totalWithdrawal: therapistWithdrawTotal + userWithdrawTotal,
        todayWithdrawal: therapistWithdrawToday + userWithdrawToday,
        totalWithdrawalFee: therapistWithdrawFeeTotal + userWithdrawFeeTotal,
        todayWithdrawalFee: therapistWithdrawFeeToday + userWithdrawFeeToday,

        // Charts
        ordersByStatus,
        revenueByDay,
        recentActivity: [
          ...(recentActivityResult.data || []).map((l: any) => ({
            id: `log_${l.id}`,
            order_number: l.order?.order_number || '-',
            status: l.status,
            note: l.note,
            created_at: l.created_at,
          })),
          ...(therapistTopupsRecentResult.data || []).map((t: any) => ({
            id: `ttopup_${t.id}`,
            order_number: 'Topup',
            status: t.status === 'paid' ? 'completed' : t.status,
            note: `Terapis ${t.therapist?.full_name || '-'}: Rp${(t.amount || 0).toLocaleString('id-ID')}`,
            created_at: t.created_at,
          })),
          ...(userTopupsRecentResult.data || []).map((u: any) => ({
            id: `utopup_${u.id}`,
            order_number: 'Topup',
            status: u.status === 'paid' ? 'completed' : u.status,
            note: `User ${u.user?.full_name || '-'}: Rp${(u.amount || 0).toLocaleString('id-ID')}`,
            created_at: u.created_at,
          })),
          ...(therapistWithdrawalsRecentResult.data || []).map((t: any) => ({
            id: `twd_${t.id}`,
            order_number: 'Withdrawal',
            status: t.status === 'completed' ? 'completed' : t.status,
            note: `Terapis ${t.therapist?.full_name || '-'}: Rp${(t.amount || 0).toLocaleString('id-ID')}`,
            created_at: t.created_at,
          })),
          ...(userWithdrawalsRecentResult.data || []).map((u: any) => ({
            id: `uwd_${u.id}`,
            order_number: 'Withdrawal',
            status: u.status === 'completed' ? 'completed' : u.status,
            note: `User ${u.user?.full_name || '-'}: Rp${(u.amount || 0).toLocaleString('id-ID')}`,
            created_at: u.created_at,
          })),
        ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20),
        recentOrders: (recentOrdersResult.data || []).map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total_price: o.total_price,
          created_at: o.created_at,
          user_name: o.user?.full_name || '-',
          therapist_name: o.therapist?.full_name || '-',
        })),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
