import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  let debugStep = 'INIT';
  try {
    const { withdrawal_id, otp } = await req.json();
    if (!withdrawal_id || !otp) {
      return NextResponse.json({ error: 'Withdrawal ID dan OTP diperlukan' }, { status: 400 });
    }

    const supabase = createAdminClient();

    debugStep = 'FETCH_WITHDRAWAL';
    const { data: withdrawal, error: wError } = await supabase
      .from('user_withdrawals')
      .select('*, users!inner(*)')
      .eq('id', withdrawal_id)
      .eq('status', 'awaiting_otp')
      .single();

    if (wError || !withdrawal) {
      return NextResponse.json({ error: 'Data penarikan tidak ditemukan atau sudah diproses' }, { status: 404 });
    }

    // Verify OTP
    debugStep = 'VERIFY_OTP';
    if (withdrawal.otp_code !== otp) {
      return NextResponse.json({ error: 'Kode OTP salah' }, { status: 401 });
    }

    const now = new Date();
    const expiresAt = new Date(withdrawal.otp_expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Kode OTP sudah kedaluwarsa' }, { status: 410 });
    }

    const user = withdrawal.users;
    const settings = await getAppSettings();

    // Check admin approval requirement
    const approvalThreshold = Number(settings.withdrawal_admin_approval_threshold) || 0;
    const requireAdminApproval = settings.withdrawal_admin_approval === true || (approvalThreshold > 0 && Number(withdrawal.amount) > approvalThreshold);
    if (requireAdminApproval) {
      await supabase.from('user_withdrawals').update({
        status: 'pending',
        otp_verified: true,
        otp_code: null,
        otp_expires_at: null,
      }).eq('id', withdrawal_id);

      return NextResponse.json({
        status: 'pending_approval',
        message: 'Penarikan menunggu persetujuan admin',
      });
    }

    // Process withdrawal now
    debugStep = 'PROCESS_WITHDRAWAL';
    const WITHDRAW_FEE = Number(withdrawal.admin_fee);
    const totalDeduction = Number(withdrawal.amount) + WITHDRAW_FEE;
    const userPrevBalance = user.wallet_balance;

    // Update status + clear OTP
    await supabase.from('user_withdrawals').update({
      otp_verified: true,
      otp_code: null,
      otp_expires_at: null,
    }).eq('id', withdrawal_id);

    // Deduct balance
    debugStep = 'UPDATE_BALANCE';
    const { error: balanceError } = await supabase
      .from('users')
      .update({ wallet_balance: user.wallet_balance - totalDeduction })
      .eq('id', user.id);
    if (balanceError) throw new Error(`Gagal update saldo: ${balanceError.message}`);

    // Create transaction
    debugStep = 'CREATE_TRANSACTION';
    await supabase.from('transactions').insert([{
      user_id: user.id,
      type: 'debit',
      amount: totalDeduction,
      balance_before: user.wallet_balance,
      balance_after: user.wallet_balance - totalDeduction,
      description: `Penarikan Saldo (${withdrawal.bank_name})`,
      reference_id: withdrawal.external_id,
      metadata: { withdrawal_id: withdrawal.id }
    }]);

    // Call Xendit
    debugStep = 'VALIDATE_BANK_ACCOUNT';
    const secretKey = settings.xendit_disbursement_secret_key || settings.xendit_secret_key || process.env.XENDIT_DISBURSEMENT_SECRET_KEY || process.env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Konfigurasi pembayaran belum lengkap' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const bankMapping: Record<string, string> = {
      'bca': 'BCA', 'mandiri': 'MANDIRI', 'bni': 'BNI', 'bri': 'BRI',
      'cimb': 'CIMB', 'permata': 'PERMATA', 'danamon': 'DANAMON', 'bsi': 'BSI',
      'dana': 'DANA',
    };
    const bankCodeMapped = bankMapping[withdrawal.bank_name.toLowerCase()] || withdrawal.bank_code || withdrawal.bank_name.toUpperCase();

    // Validate bank account before disbursement
    const valRes = await fetch('https://api.xendit.co/bank_account_data_requests', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ bank_code: bankCodeMapped, account_number: withdrawal.account_number }),
    });
    const valData = await valRes.json();
    if (!valRes.ok) {
      const xenditMsg = valData.message || valData.error || '';
      const msgMap: Record<string, string> = {
        'is not a valid bank account': 'Nomor rekening tidak valid',
        'account number': 'Nomor rekening tidak valid',
        'is not supported': 'Bank belum didukung',
        'bank code': 'Kode bank tidak dikenal',
        'resource was not found': 'Konfigurasi pembayaran belum lengkap, hubungi admin',
        'not found': 'Konfigurasi pembayaran belum lengkap, hubungi admin',
        'internal error': 'Terjadi kesalahan sistem, coba lagi nanti',
      };
      let message = 'Nomor rekening tidak valid';
      for (const [key, val] of Object.entries(msgMap)) {
        if (xenditMsg.toLowerCase().includes(key)) { message = val; break; }
      }
      debugStep = 'REVERT_ON_INVALID_ACCOUNT';
      await supabase.from('users').update({ wallet_balance: userPrevBalance }).eq('id', user.id);
      await supabase.from('user_withdrawals').update({ status: 'failed', payment_data: { reason: message } }).eq('id', withdrawal_id);
      return NextResponse.json({ error: message, details: valData }, { status: 400 });
    }

    debugStep = 'CALL_XENDIT';
    const xenditRes = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'x-idempotency-key': withdrawal.external_id,
      },
      body: JSON.stringify({
        external_id: withdrawal.external_id,
        amount: Number(withdrawal.amount),
        bank_code: bankCodeMapped,
        account_holder_name: withdrawal.account_name,
        account_number: withdrawal.account_number,
        description: `Penarikan Saldo Kang Massage - ${user.full_name}`,
      }),
    });

    const xenditData = await xenditRes.json();
    if (xenditRes.status >= 300) {
      console.error('[Withdraw Confirm] Xendit Error:', xenditData);
      await supabase.from('users').update({ wallet_balance: userPrevBalance }).eq('id', user.id);
      await supabase.from('user_withdrawals').update({ status: 'failed', payment_data: xenditData }).eq('id', withdrawal_id);
      return NextResponse.json({
        error: `Gagal memproses penarikan: ${xenditData.message || 'Coba lagi nanti'}`,
      }, { status: 400 });
    }

    await supabase.from('user_withdrawals').update({ payment_data: xenditData, status: 'completed' }).eq('id', withdrawal_id);

    return NextResponse.json({
      status: 'success',
      message: 'Penarikan berhasil diproses',
    });
  } catch (error: any) {
    console.error(`[Withdraw Confirm Error at ${debugStep}]`, error.message);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
