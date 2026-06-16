import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  let debugStep = 'INIT';
  try {
    const { withdrawal_id, action, admin_id, admin_notes } = await req.json();
    if (!withdrawal_id || !action || !admin_id) {
      return NextResponse.json({ error: 'Withdrawal ID, action, dan admin ID diperlukan' }, { status: 400 });
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action harus "approve" atau "reject"' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify admin role
    debugStep = 'VERIFY_ADMIN';
    const { data: admin, error: aError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', admin_id)
      .single();
    if (aError || !admin) {
      return NextResponse.json({ error: 'Admin tidak ditemukan' }, { status: 404 });
    }
    if (admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    debugStep = 'FETCH_WITHDRAWAL';
    const { data: withdrawal, error: wError } = await supabase
      .from('user_withdrawals')
      .select('*, users!inner(*)')
      .eq('id', withdrawal_id)
      .eq('status', 'pending')
      .single();

    if (wError || !withdrawal) {
      return NextResponse.json({ error: 'Penarikan tidak ditemukan atau sudah diproses' }, { status: 404 });
    }

    const user = withdrawal.users;
    const settings = await getAppSettings();
    const userPrevBalance = user.wallet_balance;
    const WITHDRAW_FEE = Number(withdrawal.admin_fee);
    const totalDeduction = Number(withdrawal.amount) + WITHDRAW_FEE;

    if (action === 'reject') {
      debugStep = 'REJECT';
      await supabase.from('user_withdrawals').update({
        status: 'rejected',
        admin_id,
        admin_notes: admin_notes || 'Ditolak oleh admin',
        approved_at: new Date().toISOString(),
      }).eq('id', withdrawal_id);

      return NextResponse.json({
        status: 'rejected',
        message: 'Penarikan ditolak',
      });
    }

    // Approve — process Xendit disbursement
    debugStep = 'APPROVE';
    await supabase.from('user_withdrawals').update({
      admin_id,
      admin_notes: admin_notes || '',
      approved_at: new Date().toISOString(),
    }).eq('id', withdrawal_id);

    // Deduct balance
    debugStep = 'UPDATE_BALANCE';
    const { error: balanceError } = await supabase
      .from('users')
      .update({ wallet_balance: user.wallet_balance - totalDeduction })
      .eq('id', user.id);
    if (balanceError) throw new Error(`Gagal update saldo: ${balanceError.message}`);

    debugStep = 'CREATE_TRANSACTION';
    await supabase.from('transactions').insert([{
      user_id: user.id,
      type: 'debit',
      amount: totalDeduction,
      balance_before: user.wallet_balance,
      balance_after: user.wallet_balance - totalDeduction,
      description: `Penarikan Saldo (${withdrawal.bank_name})`,
      reference_id: withdrawal.external_id,
      metadata: { withdrawal_id: withdrawal.id, approved_by: admin_id }
    }]);

    debugStep = 'CALL_XENDIT';
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
      console.error('[Admin Withdraw] Xendit Error:', xenditData);
      await supabase.from('users').update({ wallet_balance: userPrevBalance }).eq('id', user.id);
      await supabase.from('user_withdrawals').update({ status: 'failed', payment_data: xenditData }).eq('id', withdrawal_id);
      return NextResponse.json({
        error: `Gagal memproses penarikan: ${xenditData.message || 'Coba lagi nanti'}`,
      }, { status: 400 });
    }

    await supabase.from('user_withdrawals').update({ status: 'completed', payment_data: xenditData }).eq('id', withdrawal_id);

    return NextResponse.json({
      status: 'approved',
      message: 'Penarikan berhasil disetujui dan diproses',
    });
  } catch (error: any) {
    console.error(`[Admin Withdraw Error at ${debugStep}]`, error.message);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
