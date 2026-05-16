import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MIDTRANS_IRIS_API_KEY = process.env.MIDTRANS_IRIS_API_KEY || process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const IRIS_BASE_URL = MIDTRANS_IS_PRODUCTION 
  ? 'https://app.midtrans.com/iris/api/v1' 
  : 'https://app.sandbox.midtrans.com/iris/api/v1';

export async function POST(req: NextRequest) {
  let debugStep = 'INIT';
  try {
    debugStep = 'PARSE_JSON';
    const { therapist_id, amount } = await req.json();
    console.log(`[Withdraw Debug] therapist_id: ${therapist_id}, amount: ${amount}`);

    if (!therapist_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (amount < 50000) {
      return NextResponse.json({ error: 'Minimal penarikan adalah Rp 50.000' }, { status: 400 });
    }

    debugStep = 'CREATE_SUPABASE_CLIENT';
    const supabase = createAdminClient();

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
    const WITHDRAW_FEE = 5000;
    const totalDeduction = amount;
    const payoutAmount = amount - WITHDRAW_FEE;

    if (payoutAmount <= 0) {
      return NextResponse.json({ error: 'Nominal terlalu kecil setelah dipotong biaya admin', debug_step: debugStep }, { status: 400 });
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

    debugStep = 'PREPARE_MIDTRANS_PAYLOAD';
    const authString = Buffer.from(`${MIDTRANS_IRIS_API_KEY}:`).toString('base64');
    
    const bankMapping: Record<string, string> = {
      'bca': 'bca',
      'mandiri': 'mandiri',
      'bni': 'bni',
      'bri': 'bri',
      'cimb': 'cimb',
      'permata': 'permata',
      'danamon': 'danamon',
    };
    const bankCode = bankMapping[therapist.bank_name.toLowerCase()] || therapist.bank_name.toLowerCase();

    const payload = {
      payouts: [
        {
          beneficiary_name: therapist.bank_account_name || therapist.full_name,
          beneficiary_account: therapist.bank_account_number,
          beneficiary_bank: bankCode,
          amount: payoutAmount.toString(),
          notes: `Withdrawal PijatPro - ${therapist.full_name}`,
        }
      ]
    };

    debugStep = 'CALL_MIDTRANS_IRIS';
    const response = await fetch(`${IRIS_BASE_URL}/payouts`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
        'X-Idempotency-Key': external_id
      },
      body: JSON.stringify(payload),
    });

    let irisData;
    const responseText = await response.text();
    try {
      irisData = JSON.parse(responseText);
    } catch (e) {
      console.error('[Withdraw Debug] Midtrans non-JSON response:', responseText);
      irisData = { message: 'Failed to parse Midtrans response', raw: responseText.slice(0, 500) };
    }

    if (response.status >= 300) {
      console.error('[Withdraw Debug] Iris Payout Error:', irisData);
      
      debugStep = 'REVERT_BALANCE_ON_IRIS_FAILURE';
      await supabase
        .from('therapists')
        .update({ wallet_balance: therapist.wallet_balance })
        .eq('id', therapist_id);
      
      await supabase
        .from('therapist_withdrawals')
        .update({ status: 'failed', payment_data: irisData })
        .eq('id', withdrawal.id);

      return NextResponse.json({ 
        error: irisData.errorMessage || irisData.message || 'Gagal memproses penarikan di Midtrans',
        debug_step: debugStep,
        details: irisData
      }, { status: 400 });
    }

    debugStep = 'FINAL_UPDATE_WITH_IRIS_DATA';
    await supabase
      .from('therapist_withdrawals')
      .update({ payment_data: irisData })
      .eq('id', withdrawal.id);

    return NextResponse.json({ 
      status: 'success',
      message: 'Penarikan sedang diproses',
      data: irisData 
    });

  } catch (error: any) {
    console.error(`[Withdraw Debug Error at ${debugStep}]`, error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      debug_step: debugStep,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
