import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  let debugStep = 'INIT';
  try {
    debugStep = 'PARSE_JSON';
    const { therapist_id, amount } = await req.json();
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
    const WITHDRAW_FEE = Number(settings.withdraw_admin_fee);
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

    debugStep = 'PREPARE_XENDIT_PAYLOAD';
    const secretKey = settings.xendit_secret_key || process.env.XENDIT_SECRET_KEY || 'xnd_development_dummykey';
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const bankMapping: Record<string, string> = {
      'bca': 'BCA',
      'mandiri': 'MANDIRI',
      'bni': 'BNI',
      'bri': 'BRI',
      'cimb': 'CIMB',
      'permata': 'PERMATA',
      'danamon': 'DANAMON',
      'dana': 'DANA',
      'dana wallet': 'DANA',
    };
    const bankCode = bankMapping[therapist.bank_name.toLowerCase()] || therapist.bank_name.toUpperCase();

    // INTERCEPT FOR XENDIT DIRECT SANDBOX DISBURSEMENT / LOCAL TESTING
    if (secretKey === 'xnd_development_dummykey' || secretKey.includes('dummy')) {
      const mockXenditDisbursement = {
        id: `disb-sb-${withdrawal.id.slice(0, 8)}`,
        external_id: external_id,
        amount: payoutAmount,
        status: 'COMPLETED',
        bank_code: bankCode,
        account_holder_name: therapist.bank_account_name || therapist.full_name,
        account_number: therapist.bank_account_number,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      await supabase
        .from('therapist_withdrawals')
        .update({ 
          status: 'completed', 
          payment_data: mockXenditDisbursement
        })
        .eq('id', withdrawal.id);

      // Send push notification instantly since sandbox is immediate
      if (therapist.push_token) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: therapist.push_token,
              title: 'Penarikan Dana Berhasil! 💸',
              body: `Dana Rp ${payoutAmount.toLocaleString('id-ID')} telah dikirim ke rekening Anda.`,
              data: { type: 'withdrawal_success' },
              sound: 'default',
            }),
          });
        } catch (e) {
          console.error('Failed to send push notification:', e);
        }
      }

      // Add success notification
      await supabase.from('notifications').insert({
        therapist_id: therapist.id,
        title: 'Penarikan Dana Berhasil!',
        body: `Dana Rp ${payoutAmount.toLocaleString('id-ID')} telah berhasil dicairkan ke rekening Anda.`,
        type: 'withdrawal_success',
      });

      return NextResponse.json({
        status: 'success',
        message: 'Penarikan berhasil diproses!',
        data: mockXenditDisbursement
      });
    }

    const payload = {
      external_id: external_id,
      amount: payoutAmount,
      bank_code: bankCode,
      account_holder_name: therapist.bank_account_name || therapist.full_name,
      account_number: therapist.bank_account_number,
      description: `Penarikan Saldo Mitra Kang Massage - ${therapist.full_name}`
    };

    debugStep = 'CALL_XENDIT_DISBURSEMENTS';
    const response = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'x-idempotency-key': external_id
      },
      body: JSON.stringify(payload),
    });

    const xenditData = await response.json();

    if (response.status >= 300) {
      console.error('[Withdraw Debug] Xendit Payout Error:', xenditData);
      
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
        error: `Xendit Error (${response.status}): ${xenditData.message || 'Gagal memproses penarikan'}`,
        debug_step: debugStep,
        details: xenditData
      }, { status: 400 });
    }

    debugStep = 'FINAL_UPDATE_WITH_XENDIT_DATA';
    await supabase
      .from('therapist_withdrawals')
      .update({ payment_data: xenditData })
      .eq('id', withdrawal.id);

    return NextResponse.json({ 
      status: 'success',
      message: 'Penarikan sedang diproses',
      data: xenditData 
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
