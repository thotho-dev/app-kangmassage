import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/settings — public read
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({
        matching_radius_km: 3,
        min_rating: 4.5,
        min_wallet_balance: 15000,
        bronze_platform_cut: 27,
        silver_platform_cut: 25,
        gold_platform_cut: 23,
        platinum_platform_cut: 21,
        diamond_platform_cut: 20,
        topup_admin_fee: 2500,
        topup_min_amount: 10000,
        topup_max_amount: 2000000,
        withdraw_admin_fee: 5000,
        withdraw_min_amount: 50000,
        withdraw_max_amount: 5000000,
        order_service_fee: 2000,
        order_admin_fee: 0,
        platform_name: 'Kang Massage',
        support_email: 'support@kangmassage.app',
        logo_url: null,
      });
    }

    return NextResponse.json({
      matching_radius_km: Number(data.matching_radius_km) ?? 3,
      min_rating: Number(data.min_rating) ?? 4.5,
      min_wallet_balance: Number(data.min_wallet_balance) ?? 15000,
      bronze_platform_cut: Number(data.bronze_platform_cut) ?? 27,
      silver_platform_cut: Number(data.silver_platform_cut) ?? 25,
      gold_platform_cut: Number(data.gold_platform_cut) ?? 23,
      platinum_platform_cut: Number(data.platinum_platform_cut) ?? 21,
      diamond_platform_cut: Number(data.diamond_platform_cut) ?? 20,
      topup_admin_fee: Number(data.topup_admin_fee) ?? 2500,
      topup_min_amount: Number(data.topup_min_amount) ?? 10000,
      topup_max_amount: Number(data.topup_max_amount) ?? 2000000,
      withdraw_admin_fee: Number(data.withdraw_admin_fee) ?? 5000,
      withdraw_min_amount: Number(data.withdraw_min_amount) ?? 50000,
      withdraw_max_amount: Number(data.withdraw_max_amount) ?? 5000000,
      order_service_fee: Number(data.order_service_fee) ?? 2000,
      order_admin_fee: Number(data.order_admin_fee) ?? 0,
      platform_name: data.platform_name ?? 'Kang Massage',
      support_email: data.support_email ?? 'support@kangmassage.app',
      logo_url: data.logo_url ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/settings — admin update
export async function PUT(req: NextRequest) {
  try {
    const userClient = createClient();

    // Verify admin session using cookie-based client
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: admin } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', user.id)
      .eq('role', 'admin')
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const allowedFields = [
      'matching_radius_km', 'min_rating', 'min_wallet_balance',
      'bronze_platform_cut', 'silver_platform_cut', 'gold_platform_cut',
      'platinum_platform_cut', 'diamond_platform_cut',
      'topup_admin_fee', 'topup_min_amount', 'topup_max_amount',
      'withdraw_admin_fee', 'withdraw_min_amount', 'withdraw_max_amount',
      'order_service_fee', 'order_admin_fee',
      'platform_name', 'support_email', 'logo_url',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updateData.updated_by = admin.id;

    // Get the first row
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Settings row not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('app_settings')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      matching_radius_km: Number(data.matching_radius_km) ?? 3,
      min_rating: Number(data.min_rating) ?? 4.5,
      min_wallet_balance: Number(data.min_wallet_balance) ?? 15000,
      bronze_platform_cut: Number(data.bronze_platform_cut) ?? 27,
      silver_platform_cut: Number(data.silver_platform_cut) ?? 25,
      gold_platform_cut: Number(data.gold_platform_cut) ?? 23,
      platinum_platform_cut: Number(data.platinum_platform_cut) ?? 21,
      diamond_platform_cut: Number(data.diamond_platform_cut) ?? 20,
      topup_admin_fee: Number(data.topup_admin_fee) ?? 2500,
      topup_min_amount: Number(data.topup_min_amount) ?? 10000,
      topup_max_amount: Number(data.topup_max_amount) ?? 2000000,
      withdraw_admin_fee: Number(data.withdraw_admin_fee) ?? 5000,
      withdraw_min_amount: Number(data.withdraw_min_amount) ?? 50000,
      withdraw_max_amount: Number(data.withdraw_max_amount) ?? 5000000,
      order_service_fee: Number(data.order_service_fee) ?? 2000,
      order_admin_fee: Number(data.order_admin_fee) ?? 0,
      platform_name: data.platform_name ?? 'Kang Massage',
      support_email: data.support_email ?? 'support@kangmassage.app',
      logo_url: data.logo_url ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
