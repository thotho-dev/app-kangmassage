import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';
import { createHash, timingSafeEqual } from 'crypto';

function verifyPin(pin: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;

    const shaHash = createHash('sha256').update(salt + pin).digest('hex');
    if (shaHash.length === key.length) {
      const a = Buffer.from(shaHash, 'hex');
      const b = Buffer.from(key, 'hex');
      if (a.length === b.length) return timingSafeEqual(a, b);
    }

    let h = salt + pin;
    for (let i = 0; i < 1000; i++) {
      h = Buffer.from(h).toString('base64').slice(0, 48);
    }
    return h === key;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let debugStep = 'INIT';
  let user_id: string | null = null;
  let amount = 0;
  let userPrevBalance = 0;
  try {
    debugStep = 'PARSE_JSON';
    const body = await req.json();
    user_id = body.user_id;
    amount = body.amount;
    const { bank_account_id, pin } = body;

    if (!user_id || !amount || !bank_account_id || !pin) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (amount < Number(settings.withdraw_min_amount)) {
      return NextResponse.json({ error: `Minimal penarikan adalah Rp ${Number(settings.withdraw_min_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }
    if (amount > Number(settings.withdraw_max_amount)) {
      return NextResponse.json({ error: `Maksimal penarikan adalah Rp ${Number(settings.withdraw_max_amount).toLocaleString('id-ID')}` }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Verify user & PIN
    debugStep = 'VERIFY_USER';
    const { data: user, error: uError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (uError || !user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (!user.pin_enabled || !user.transaction_pin) {
      return NextResponse.json({ error: 'PIN transaksi belum diatur. Silakan atur PIN terlebih dahulu.' }, { status: 400 });
    }

    if (!verifyPin(pin, user.transaction_pin)) {
      return NextResponse.json({ error: 'PIN transaksi salah' }, { status: 401 });
    }

    // 2. Verify bank account belongs to user
    debugStep = 'VERIFY_BANK_ACCOUNT';
    const { data: bankAccount, error: baError } = await supabase
      .from('saved_bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (baError || !bankAccount) {
      return NextResponse.json({ error: 'Rekening tujuan tidak ditemukan' }, { status: 404 });
    }

    // 3. Daily limit check
    debugStep = 'DAILY_LIMIT_CHECK';
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayWithdrawals } = await supabase
      .from('user_withdrawals')
      .select('amount')
      .eq('user_id', user_id)
      .in('status', ['pending', 'completed', 'approved'])
      .gte('created_at', todayStart.toISOString());

    const todayTotal = (todayWithdrawals || []).reduce((sum: number, w: any) => sum + Number(w.amount), 0);
    const dailyLimit = Number(settings.withdrawal_daily_limit) || 3000000;
    if (todayTotal + amount > dailyLimit) {
      return NextResponse.json({
        error: `Batas penarikan harian Rp ${dailyLimit.toLocaleString('id-ID')}. Sisa hari ini: Rp ${Math.max(0, dailyLimit - todayTotal).toLocaleString('id-ID')}`
      }, { status: 400 });
    }

    // 4. Rate limit (max withdrawals per day)
    debugStep = 'RATE_LIMIT_CHECK';
    const maxPerDay = Number(settings.withdrawal_max_count_per_day) || 3;
    const todayCount = (todayWithdrawals || []).length;
    if (todayCount >= maxPerDay) {
      return NextResponse.json({
        error: `Anda sudah mencapai batas maksimal ${maxPerDay}x penarikan per hari`
      }, { status: 400 });
    }

    // 5. Balance check
    const WITHDRAW_FEE = Number(settings.withdraw_admin_fee);
    const totalDeduction = amount + WITHDRAW_FEE;
    userPrevBalance = user.wallet_balance;

    if (user.wallet_balance < totalDeduction) {
      return NextResponse.json({ error: 'Saldo tidak mencukupi' }, { status: 400 });
    }

    // 6. Check if OTP required (amount > threshold)
    debugStep = 'OTP_CHECK';
    const otpThreshold = Number(settings.withdrawal_otp_threshold) || 500000;
    const needsOtp = amount > otpThreshold;

    if (needsOtp) {
      // Generate OTP, store in withdrawal record, send via WhatsApp
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Create withdrawal record with otp_code (pending OTP verification)
      const { data: withdrawal, error: wdError } = await supabase
        .from('user_withdrawals')
        .insert([{
          user_id,
          amount,
          admin_fee: WITHDRAW_FEE,
          status: 'awaiting_otp',
          external_id: `UWD-${Date.now()}-${user.id.slice(0, 8)}`,
          bank_name: bankAccount.bank_name,
          bank_code: bankAccount.bank_code,
          account_number: bankAccount.account_number,
          account_name: bankAccount.account_name,
          bank_account_id,
          pin_verified: true,
          otp_code: otp,
          otp_expires_at: otpExpiresAt,
        }])
        .select()
        .single();

      if (wdError) {
        throw new Error(`Gagal mencatat data penarikan: ${wdError.message}`);
      }

      // Send OTP via Fonnte WhatsApp
      debugStep = 'SEND_OTP';
      const fonnteToken = process.env.FONNTE_API_KEY;
      if (fonnteToken) {
        const localNumber = user.phone.replace(/^\+62/, '').replace(/^62/, '');
        const message = `*${otp}* adalah kode verifikasi penarikan saldo Kang Massage sebesar Rp ${amount.toLocaleString('id-ID')}. Jangan bagikan kode ini kepada siapa pun.`;
        fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: localNumber, message, countryCode: '62' }),
        }).catch(e => console.error('[Withdraw OTP] Fonnte error:', e));
      }

      return NextResponse.json({
        status: 'otp_sent',
        withdrawal_id: withdrawal.id,
        message: 'Kode OTP telah dikirim ke WhatsApp Anda',
      });
    }

    // 7. Check if admin approval required
    debugStep = 'ADMIN_APPROVAL_CHECK';
    const approvalThreshold = Number(settings.withdrawal_admin_approval_threshold) || 0;
    const requireAdminApproval = settings.withdrawal_admin_approval === true || (approvalThreshold > 0 && amount > approvalThreshold);

    const external_id = `UWD-${Date.now()}-${user.id.slice(0, 8)}`;

    if (requireAdminApproval) {
      // Create withdrawal without deducting balance — wait for admin
      const { data: withdrawal, error: wdError } = await supabase
        .from('user_withdrawals')
        .insert([{
          user_id,
          amount,
          admin_fee: WITHDRAW_FEE,
          status: 'pending',
          external_id,
          bank_name: bankAccount.bank_name,
          bank_code: bankAccount.bank_code,
          account_number: bankAccount.account_number,
          account_name: bankAccount.account_name,
          bank_account_id,
          pin_verified: true,
        }])
        .select()
        .single();

      if (wdError) {
        throw new Error(`Gagal mencatat data penarikan: ${wdError.message}`);
      }

      return NextResponse.json({
        status: 'pending_approval',
        withdrawal_id: withdrawal.id,
        message: 'Penarikan menunggu persetujuan admin',
      });
    }

    // 8. No OTP needed, no admin approval — process immediately
    debugStep = 'PROCESS_WITHDRAWAL';
    const { data: withdrawal, error: wdError } = await supabase
      .from('user_withdrawals')
      .insert([{
        user_id,
        amount,
        admin_fee: WITHDRAW_FEE,
        status: 'pending',
        external_id,
        bank_name: bankAccount.bank_name,
        bank_code: bankAccount.bank_code,
        account_number: bankAccount.account_number,
        account_name: bankAccount.account_name,
        bank_account_id,
        pin_verified: true,
      }])
      .select()
      .single();

    if (wdError) {
      throw new Error(`Gagal mencatat data penarikan: ${wdError.message}`);
    }

    debugStep = 'UPDATE_BALANCE';
    const { error: balanceError } = await supabase
      .from('users')
      .update({ wallet_balance: user.wallet_balance - totalDeduction })
      .eq('id', user_id);

    if (balanceError) throw new Error(`Gagal update saldo: ${balanceError.message}`);

    debugStep = 'CREATE_TRANSACTION';
    await supabase.from('transactions').insert([{
      user_id,
      type: 'debit',
      amount: totalDeduction,
      balance_before: user.wallet_balance,
      balance_after: user.wallet_balance - totalDeduction,
      description: `Penarikan Saldo (${bankAccount.bank_name})`,
      reference_id: external_id,
      metadata: { withdrawal_id: withdrawal.id }
    }]);

    debugStep = 'VALIDATE_BANK_ACCOUNT';
    const bankMapping: Record<string, string> = {
      'bca': 'BCA', 'mandiri': 'MANDIRI', 'bni': 'BNI', 'bri': 'BRI',
      'cimb': 'CIMB', 'permata': 'PERMATA', 'danamon': 'DANAMON', 'bsi': 'BSI',
      'dana': 'DANA',
    };
    const bankCodeMapped = bankMapping[bankAccount.bank_name.toLowerCase()] || bankAccount.bank_code || bankAccount.bank_name.toUpperCase();

    const secretKey = settings.xendit_disbursement_secret_key || settings.xendit_secret_key || process.env.XENDIT_DISBURSEMENT_SECRET_KEY || process.env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Konfigurasi pembayaran belum lengkap' }, { status: 500 });
    }
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const isDana = bankAccount.bank_name.toLowerCase() === 'dana' || bankCodeMapped === 'DANA';

    // Validate bank account before disbursement (skip DANA, not supported by Xendit)
    if (!isDana) {
      const valRes = await fetch('https://api.xendit.co/bank_account_data_requests', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ bank_code: bankCodeMapped, account_number: bankAccount.account_number }),
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
      await supabase.from('users').update({ wallet_balance: userPrevBalance }).eq('id', user_id);
      await supabase.from('user_withdrawals').update({ status: 'failed', payment_data: { reason: message } }).eq('id', withdrawal.id);
      return NextResponse.json({ error: message, details: valData }, { status: 400 });
    }
    }

    debugStep = 'CALL_XENDIT_DISBURSEMENT';
    const response = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'x-idempotency-key': external_id
      },
      body: JSON.stringify({
        external_id,
        amount,
        bank_code: bankCodeMapped,
        account_holder_name: bankAccount.account_name,
        account_number: bankAccount.account_number,
        description: `Penarikan Saldo Kang Massage - ${user.full_name}`
      }),
    });

    const xenditData = await response.json();

    if (response.status >= 300) {
      console.error('[User Withdraw] Xendit Error:', xenditData);
      debugStep = 'REVERT_BALANCE_ON_XENDIT_FAILURE';
      await supabase.from('users').update({ wallet_balance: userPrevBalance }).eq('id', user_id);
      await supabase.from('user_withdrawals').update({ status: 'failed', payment_data: xenditData }).eq('id', withdrawal.id);
      return NextResponse.json({
        error: `Gagal memproses penarikan: ${xenditData.message || 'Coba lagi nanti'}`,
        details: xenditData
      }, { status: 400 });
    }

    await supabase.from('user_withdrawals').update({
      status: 'completed',
      payment_data: xenditData,
    }).eq('id', withdrawal.id);

    return NextResponse.json({
      status: 'success',
      message: 'Penarikan berhasil diproses',
      data: xenditData
    });

  } catch (error: any) {
    console.error(`[User Withdraw Error at ${debugStep}]`, error.message);
    if ((debugStep === 'CALL_XENDIT_DISBURSEMENT' || debugStep === 'UPDATE_BALANCE' || debugStep === 'CREATE_TRANSACTION') && user_id && userPrevBalance > 0) {
      try {
        const supabase = createAdminClient();
        await supabase.from('users').update({ wallet_balance: userPrevBalance }).eq('id', user_id);
      } catch (e) {
        console.error('[User Withdraw] Failed to revert:', e);
      }
    }
    return NextResponse.json({ error: error.message || 'Internal server error', debug_step: debugStep }, { status: 500 });
  }
}
