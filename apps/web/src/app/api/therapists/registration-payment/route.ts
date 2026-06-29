import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// GET /api/therapists/registration-payment?therapist_id=xxx - Get payment status
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const therapistId = searchParams.get('therapist_id');

    if (!therapistId) {
      return NextResponse.json({ error: 'therapist_id is required' }, { status: 400 });
    }

    // Get therapist
    const { data: therapist, error: tError } = await supabase
      .from('therapists')
      .select('id, registration_fee_paid, registration_paid_at, registration_payment_id')
      .eq('id', therapistId)
      .single();

    if (tError || !therapist) {
      return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });
    }

    // Get settings
    const settings = await getAppSettings();

    // Get payment record if exists
    let payment = null;
    if (therapist.registration_payment_id) {
      const { data: pData } = await supabase
        .from('therapist_registration_payments')
        .select('*')
        .eq('id', therapist.registration_payment_id)
        .single();
      payment = pData;
    }

    // Get available equipment
    const { data: equipment } = await supabase
      .from('registration_equipment')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    return NextResponse.json({
      registration_payment_required: settings.registration_payment_required,
      registration_fee: Number(settings.therapist_registration_fee) || 0,
      fee_paid: therapist.registration_fee_paid,
      paid_at: therapist.registration_paid_at,
      payment,
      equipment: equipment || [],
    });
  } catch (err: any) {
    console.error('[Registration Payment Status]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/therapists/registration-payment - Process registration payment (gopay/qris via Midtrans)
export async function POST(req: NextRequest) {
  try {
    const userClient = createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();

    const { data: therapist, error: tError } = await supabase
      .from('therapists')
      .select('id, full_name, phone, email, registration_fee_paid')
      .eq('supabase_uid', user.id)
      .single();

    if (tError || !therapist) {
      return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });
    }

    if (therapist.registration_fee_paid) {
      return NextResponse.json({ error: 'Biaya pendaftaran sudah dibayar' }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (!settings.registration_payment_required) {
      return NextResponse.json({ error: 'Pembayaran pendaftaran tidak diwajibkan' }, { status: 400 });
    }

    const body = await req.json();
    const paymentMethod = body.payment_method;
    const selectedEquipment = body.equipment_items || [];

    if (!paymentMethod || !['gopay', 'qris'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Metode pembayaran harus gopay atau qris' }, { status: 400 });
    }

    const registrationFee = Number(settings.therapist_registration_fee) || 0;

    let equipmentTotal = 0;
    const equipmentItems: { id: string; name: string; price: number }[] = [];

    if (selectedEquipment.length > 0) {
      const ids = selectedEquipment.map((e: any) => e.id || e);
      const { data: equipData } = await supabase
        .from('registration_equipment')
        .select('id, name, price, discount_price')
        .in('id', ids);

      if (equipData) {
        for (const item of equipData) {
          const qty = selectedEquipment.find((e: any) => (e.id || e) === item.id)?.quantity || 1;
          const effectivePrice = Number(item.discount_price) > 0 ? Number(item.discount_price) : Number(item.price);
          equipmentItems.push({ id: item.id, name: item.name, price: effectivePrice });
          equipmentTotal += effectivePrice * qty;
        }
      }
    }

    const totalAmount = registrationFee + equipmentTotal;

    if (totalAmount <= 0) {
      const { data: payment, error: pError } = await supabase
        .from('therapist_registration_payments')
        .insert({
          therapist_id: therapist.id,
          registration_fee: 0,
          equipment_items: equipmentItems,
          equipment_total: 0,
          total_amount: 0,
          payment_method: 'free',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });

      await supabase
        .from('therapists')
        .update({ registration_fee_paid: true, registration_paid_at: new Date().toISOString(), registration_payment_id: payment.id })
        .eq('id', therapist.id);

      return NextResponse.json({ success: true, message: 'Pendaftaran gratis, tidak perlu bayar', payment });
    }

    // Prepare Midtrans charge
    const serverKey = settings.midtrans_server_key;
    if (!serverKey) {
      return NextResponse.json({ error: 'Midtrans server key not configured' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

    const isProduction = settings.midtrans_is_production;
    const MIDTRANS_BASE_URL = isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';

    const order_id = `REG-${Date.now()}-${therapist.id.slice(0, 8)}`;

    // Insert pending payment
    const { data: payment, error: pError } = await supabase
      .from('therapist_registration_payments')
      .insert({
        therapist_id: therapist.id,
        registration_fee: registrationFee,
        equipment_items: equipmentItems,
        equipment_total: equipmentTotal,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: 'pending',
        external_id: order_id,
      })
      .select()
      .single();

    if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });

    // Build Midtrans payload
    const midtransBody: any = {
      transaction_details: {
        order_id: order_id,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: therapist.full_name || 'Terapis',
        phone: therapist.phone,
        email: therapist.email || `${therapist.phone}@pijat.com`,
      },
    };

    if (paymentMethod === 'gopay') {
      midtransBody.payment_type = 'gopay';
      midtransBody.gopay = {
        enable_callback: true,
        callback_url: 'kang-massage-therapist://registration-payment',
      };
    } else if (paymentMethod === 'qris') {
      midtransBody.payment_type = 'qris';
    }

    const midtransRes = await fetch(`${MIDTRANS_BASE_URL}/charge`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(midtransBody),
    });

    const midtransData = await midtransRes.json();

    if (!midtransRes.ok) {
      console.error('Midtrans Charge Error:', midtransData);
      await supabase
        .from('therapist_registration_payments')
        .update({ payment_status: 'failed', payment_data: midtransData })
        .eq('id', payment.id);
      return NextResponse.json({ error: midtransData.status_message || 'Midtrans charge error' }, { status: 400 });
    }

    await supabase
      .from('therapist_registration_payments')
      .update({ payment_data: midtransData })
      .eq('id', payment.id);

    // Format response for therapist app
    let formattedData: any = {
      total_amount: totalAmount,
      external_id: order_id,
      payment_id: payment.id,
    };

    if (paymentMethod === 'gopay') {
      const actions = midtransData.actions || [];
      const deeplinkAction = actions.find((a: any) => a.name === 'deeplink-redirect');
      formattedData.type = 'ewallet';
      formattedData.redirect_url = deeplinkAction?.url;
    } else if (paymentMethod === 'qris') {
      const actions = midtransData.actions || [];
      const qrCodeAction = actions.find((a: any) => a.name === 'generate-qr-code');
      formattedData.type = 'qris';
      formattedData.qr_string = midtransData.qr_string || qrCodeAction?.url;
    }

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (err: any) {
    console.error('[Registration Payment Process]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
