import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MIDTRANS_IRIS_API_KEY = process.env.MIDTRANS_IRIS_API_KEY || process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const IRIS_BASE_URL = MIDTRANS_IS_PRODUCTION 
  ? 'https://api.midtrans.com/iris/api/v1' 
  : 'https://api.sandbox.midtrans.com/iris/api/v1';

export async function POST(req: NextRequest) {
  try {
    const { therapist_id, amount } = await req.json();

    if (!therapist_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (amount < 50000) {
      return NextResponse.json({ error: 'Minimal penarikan adalah Rp 50.000' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Get Therapist Data & Validate Balance
    const { data: therapist, error: tError } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', therapist_id)
      .single();

    if (tError || !therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

    if (therapist.wallet_balance < amount) {
      return NextResponse.json({ error: 'Saldo tidak mencukupi' }, { status: 400 });
    }

    if (!therapist.bank_name || !therapist.bank_account_number) {
      return NextResponse.json({ error: 'Informasi bank belum lengkap' }, { status: 400 });
    }

    const external_id = `WD-${Date.now()}-${therapist.id.slice(0, 8)}`;
    const WITHDRAW_FEE = 5000; // Fixed fee for payout
    const totalDeduction = amount; // User input is what they want to withdraw (including fee)
    // Or user wants to get 'amount' and we add fee? Usually we deduct fee from the amount.
    const payoutAmount = amount - WITHDRAW_FEE;

    if (payoutAmount <= 0) {
      return NextResponse.json({ error: 'Nominal terlalu kecil setelah dipotong biaya admin' }, { status: 400 });
    }

    // 2. Create Withdrawal Record (Pending)
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

    if (wdError) throw wdError;

    // 3. Deduct Balance from Therapist (Pending status)
    const { error: updateError } = await supabase
      .from('therapists')
      .update({ wallet_balance: therapist.wallet_balance - totalDeduction })
      .eq('id', therapist_id);

    if (updateError) throw updateError;

    // 4. Call Midtrans Iris API (Create Payout)
    const authString = Buffer.from(`${MIDTRANS_IRIS_API_KEY}:`).toString('base64');
    
    // Bank mapping for Iris (common banks)
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

    const irisData = await response.json();

    if (response.status !== 201) {
      console.error('Iris Payout Error:', irisData);
      
      // REVERT BALANCE if failed immediately
      await supabase
        .from('therapists')
        .update({ wallet_balance: therapist.wallet_balance })
        .eq('id', therapist_id);
      
      await supabase
        .from('therapist_withdrawals')
        .update({ status: 'failed', payment_data: irisData })
        .eq('id', withdrawal.id);

      return NextResponse.json({ error: irisData.errorMessage || 'Gagal memproses penarikan' }, { status: 400 });
    }

    // 5. Update Withdrawal Record with Iris Data
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
    console.error('Withdraw API Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
