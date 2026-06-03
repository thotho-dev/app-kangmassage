import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const { user_id, amount, bank_name, bank_code, account_number, account_name } = await req.json();

    if (!user_id || !amount || !bank_name || !account_number || !account_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (amount < Number(settings.withdraw_min_amount)) {
      return NextResponse.json({ error: `Minimal penarikan adalah Rp ${Number(settings.withdraw_min_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }
    if (amount > Number(settings.withdraw_max_amount)) {
      return NextResponse.json({ error: `Maksimal penarikan adalah Rp ${Number(settings.withdraw_max_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: user, error: uError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (uError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const WITHDRAW_FEE = Number(settings.withdraw_admin_fee);
    const totalDeduction = amount + WITHDRAW_FEE;

    if (user.wallet_balance < totalDeduction) {
      return NextResponse.json({ error: 'Saldo tidak mencukupi' }, { status: 400 });
    }

    const external_id = `UWD-${Date.now()}-${user.id.slice(0, 8)}`;
    const payoutAmount = amount;

    // Insert withdrawal record
    const { data: withdrawal, error: wdError } = await supabase
      .from('user_withdrawals')
      .insert([{
        user_id,
        amount: payoutAmount,
        admin_fee: WITHDRAW_FEE,
        status: 'pending',
        external_id,
        bank_name,
        bank_code,
        account_number,
        account_name,
      }])
      .select()
      .single();

    if (wdError) {
      throw new Error(`Gagal mencatat data penarikan: ${wdError.message}`);
    }

    // Deduct balance immediately
    const { error: balanceError } = await supabase
      .from('users')
      .update({ wallet_balance: user.wallet_balance - totalDeduction })
      .eq('id', user_id);

    if (balanceError) throw new Error(`Gagal update saldo: ${balanceError.message}`);

    // Log transaction
    await supabase.from('transactions').insert([{
      user_id,
      type: 'debit',
      amount: totalDeduction,
      balance_before: user.wallet_balance,
      balance_after: user.wallet_balance - totalDeduction,
      description: `Penarikan Saldo (${bank_name})`,
      reference_id: external_id,
      metadata: { withdrawal_id: withdrawal.id }
    }]);

    // Xendit Disbursements Integration (Production)
    const secretKey = settings.xendit_disbursement_secret_key || settings.xendit_secret_key || process.env.XENDIT_DISBURSEMENT_SECRET_KEY || process.env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Xendit secret key not configured' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

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
    };
    const bankCodeMapped = bankMapping[bank_name.toLowerCase()] || bank_code || bank_name.toUpperCase();

    const payload = {
      external_id,
      amount: payoutAmount,
      bank_code: bankCodeMapped,
      account_holder_name: account_name,
      account_number,
      description: `Penarikan Saldo Kang Massage - ${user.full_name}`
    };

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
      console.error('Xendit Payout Error:', xenditData);

      // Revert balance on failure
      await supabase.from('users').update({ wallet_balance: user.wallet_balance }).eq('id', user_id);
      await supabase.from('user_withdrawals').update({ status: 'failed', payment_data: xenditData }).eq('id', withdrawal.id);

      return NextResponse.json({
        error: `Xendit Error: ${xenditData.message || 'Gagal memproses penarikan'}`,
        details: xenditData
      }, { status: 400 });
    }

    await supabase.from('user_withdrawals').update({ payment_data: xenditData }).eq('id', withdrawal.id);

    return NextResponse.json({
      status: 'success',
      message: 'Penarikan sedang diproses',
      data: xenditData
    });

  } catch (error: any) {
    console.error('User Withdraw API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
