import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  let debugStep = 'INIT';
  let therapist_id: string | null = null;
  let amount = 0;
  try {
    debugStep = 'PARSE_JSON';
    const body = await req.json();
    therapist_id = body.therapist_id;
    amount = body.amount;
    console.log(`[Withdraw Debug] therapist_id: ${therapist_id}, amount: ${amount}`);

    if (!therapist_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (amount < Number(settings.withdraw_min_amount)) {
      return NextResponse.json({ error: `Minimal penarikan adalah Rp ${Number(settings.withdraw_min_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }
    if (amount > Number(settings.withdraw_max_amount)) {
      return NextResponse.json({ error: `Maksimal penarikan adalah Rp ${Number(settings.withdraw_max_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }

    debugStep = 'DAILY_LIMIT_CHECK';
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const supabase = createAdminClient();

    const { data: todayWithdrawals } = await supabase
      .from('therapist_withdrawals')
      .select('amount')
      .eq('therapist_id', therapist_id)
      .in('status', ['pending', 'completed'])
      .gte('created_at', todayStart.toISOString());

    const todayTotal = (todayWithdrawals || []).reduce((sum: number, w: any) => sum + Number(w.amount), 0);
    const dailyLimit = Number(settings.withdrawal_daily_limit) || 3000000;
    if (todayTotal + amount > dailyLimit) {
      return NextResponse.json({
        error: `Batas penarikan harian Rp ${dailyLimit.toLocaleString('id-ID')}. Sisa hari ini: Rp ${Math.max(0, dailyLimit - todayTotal).toLocaleString('id-ID')}`
      }, { status: 400 });
    }

    const maxPerDay = Number(settings.withdrawal_max_count_per_day) || 3;
    const todayCount = (todayWithdrawals || []).length;
    if (todayCount >= maxPerDay) {
      return NextResponse.json({
        error: `Anda sudah mencapai batas maksimal ${maxPerDay}x penarikan per hari`
      }, { status: 400 });
    }

    debugStep = 'FETCH_THERAPIST';
    const { data: therapist, error: tError } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', therapist_id)
      .single();

    if (tError) {
      console.error('[Withdraw Debug] Therapist Fetch Error:', tError);
      return NextResponse.json({ error: `Therapist not found: ${tError.message}`, debug_step: debugStep }, { status: 404 });
    }
    
    if (!therapist) return NextResponse.json({ error: 'Therapist not found', debug_step: debugStep }, { status: 404 });

    debugStep = 'VALIDATE_BALANCE';
    if (therapist.wallet_balance < amount) {
      return NextResponse.json({ error: 'Saldo tidak mencukupi', debug_step: debugStep }, { status: 400 });
    }

    debugStep = 'VALIDATE_BANK';
    if (!therapist.bank_name || !therapist.bank_account_number) {
      return NextResponse.json({ error: 'Informasi bank belum lengkap', debug_step: debugStep }, { status: 400 });
    }

    const external_id = `WD-${Date.now()}-${therapist.id.slice(0, 8)}`;
    const WITHDRAW_FEE = Number(settings.withdraw_admin_fee);
    const totalDeduction = amount;
    const payoutAmount = amount - WITHDRAW_FEE;

    if (payoutAmount <= 0) {
      return NextResponse.json({ error: 'Nominal terlalu kecil setelah dipotong biaya admin', debug_step: debugStep }, { status: 400 });
    }

    debugStep = 'CHECK_XENDIT_BALANCE';
    const secretKey = settings.xendit_disbursement_secret_key || settings.xendit_secret_key || process.env.XENDIT_DISBURSEMENT_SECRET_KEY || process.env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Konfigurasi pembayaran belum lengkap' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const balanceRes = await fetch('https://api.xendit.co/balance', {
      headers: { Authorization: authHeader },
    });
    const balanceData = await balanceRes.json();

    if (!balanceRes.ok || (balanceData.balance !== undefined && balanceData.balance < payoutAmount)) {
      console.error('[Withdraw Debug] Insufficient Xendit balance:', balanceData);
      return NextResponse.json({
        error: 'Saldo tidak mencukupi. Silakan hubungi admin.',
        debug_step: debugStep,
      }, { status: 400 });
    }

    debugStep = 'INSERT_WITHDRAWAL_RECORD';
    const { data: withdrawal, error: wdError } = await supabase
      .from('therapist_withdrawals')
      .insert([{
        therapist_id,
        amount: payoutAmount,
        fee: WITHDRAW_FEE,
        status: 'pending',
        external_id: external_id,
        bank_name: therapist.bank_name,
        account_number: therapist.bank_account_number,
        account_name: therapist.bank_account_name || therapist.full_name,
      }])
      .select()
      .single();

    if (wdError) {
      console.error('[Withdraw Debug] Withdrawal Insert Error:', wdError);
      throw new Error(`Gagal mencatat data penarikan: ${wdError.message}`);
    }

    debugStep = 'UPDATE_BALANCE';
    const { error: updateError } = await supabase
      .from('therapists')
      .update({ wallet_balance: therapist.wallet_balance - totalDeduction })
      .eq('id', therapist_id);

    if (updateError) {
      console.error('[Withdraw Debug] Balance Update Error:', updateError);
      throw new Error(`Gagal update saldo: ${updateError.message}`);
    }
    
    debugStep = 'CREATE_TRANSACTION';
    const { error: transError } = await supabase
      .from('transactions')
      .insert([{
        therapist_id,
        type: 'debit',
        amount: totalDeduction,
        balance_before: therapist.wallet_balance,
        balance_after: therapist.wallet_balance - totalDeduction,
        description: `Penarikan Saldo (${therapist.bank_name})`,
        reference_id: external_id,
        metadata: { withdrawal_id: withdrawal.id }
      }]);

    if (transError) console.error('[Withdraw Debug] Transaction Log Error:', transError);

    debugStep = 'PREPARE_XENDIT_DISBURSEMENT';
    const bankMapping: Record<string, string> = {
      'bca': 'BCA',
      'mandiri': 'MANDIRI',
      'bni': 'BNI',
      'bri': 'BRI',
      'cimb': 'CIMB',
      'permata': 'PERMATA',
      'danamon': 'DANAMON',
      'bsi': 'BSI',
      'dana': 'DANA',
      'dana wallet': 'DANA',
    };
    const bankCode = bankMapping[therapist.bank_name.toLowerCase()] || therapist.bank_name.toUpperCase();

    const payload = {
      external_id,
      amount: payoutAmount,
      bank_code: bankCode,
      account_holder_name: therapist.bank_account_name || therapist.full_name,
      account_number: therapist.bank_account_number,
      description: `Penarikan Saldo Mitra Kang Massage - ${therapist.full_name}`,
    };

    debugStep = 'CALL_XENDIT_DISBURSEMENT';
    const response = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'x-idempotency-key': external_id,
      },
      body: JSON.stringify(payload),
    });

    const xenditData = await response.json();

    if (response.status >= 300) {
      console.error('[Withdraw Debug] Xendit Disbursement Error:', xenditData);

      debugStep = 'REVERT_BALANCE_ON_XENDIT_FAILURE';
      await supabase
        .from('therapists')
        .update({ wallet_balance: therapist.wallet_balance })
        .eq('id', therapist_id);

      await supabase
        .from('therapist_withdrawals')
        .update({ status: 'failed', payment_data: xenditData })
        .eq('id', withdrawal.id);

      return NextResponse.json({
        error: `Gagal memproses penarikan (${response.status}): ${xenditData.message || 'Coba lagi nanti'}`,
        debug_step: debugStep,
        details: xenditData,
      }, { status: 400 });
    }

    debugStep = 'UPDATE_WITH_XENDIT_DATA';
    await supabase
      .from('therapist_withdrawals')
      .update({
        payment_data: xenditData,
      })
      .eq('id', withdrawal.id);

    return NextResponse.json({
      status: 'success',
      message: 'Penarikan sedang diproses',
      data: xenditData,
    });

  } catch (error: any) {
    console.error(`[Withdraw Debug Error at ${debugStep}]`, error);

    if ((debugStep === 'CALL_XENDIT_DISBURSEMENT' || debugStep === 'UPDATE_WITH_XENDIT_DATA') && therapist_id && amount) {
      try {
        const supabase = createAdminClient();
        const { data: th } = await supabase.from('therapists').select('wallet_balance').eq('id', therapist_id).single();
        if (th) {
          await supabase.from('therapists').update({ wallet_balance: th.wallet_balance + amount }).eq('id', therapist_id);
        }
      } catch (e) {
        console.error('[Withdraw Debug] Failed to revert balance in catch block:', e);
      }
    }

    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      debug_step: debugStep,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
