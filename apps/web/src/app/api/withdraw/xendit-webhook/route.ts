import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Xendit Disbursement Webhook Received:', JSON.stringify(body, null, 2));

    // Optional Verification Token check
    const callbackToken = req.headers.get('x-callback-token');
    const expectedToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN;
    if (expectedToken && callbackToken !== expectedToken) {
      console.warn('[Xendit Webhook] Unauthorized callback token attempt.');
      return NextResponse.json({ error: 'Unauthorized callback token' }, { status: 401 });
    }

    const { external_id, status, id: disbursement_id, amount, failure_code } = body;

    if (!external_id) {
      return NextResponse.json({ error: 'Missing external_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch the matching withdrawal record
    const { data: withdrawal, error: fetchError } = await supabase
      .from('therapist_withdrawals')
      .select('*')
      .eq('external_id', external_id)
      .single();

    if (fetchError || !withdrawal) {
      console.warn(`[Xendit Webhook] Withdrawal record not found for: ${external_id}`);
      return NextResponse.json({ status: 'ignored', message: 'Withdrawal record not found' }, { status: 200 });
    }

    // Prevent duplicate processing
    if (withdrawal.status === 'completed' || withdrawal.status === 'failed') {
      return NextResponse.json({ status: 'success', message: 'Already processed' });
    }

    const { therapist_id, fee } = withdrawal;
    const totalDeduction = withdrawal.amount + fee; // The original balance amount that was deducted

    // Fetch therapist details for notifications/balance updates
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('wallet_balance, push_token')
      .eq('id', therapist_id)
      .single();

    if (therapistError || !therapist) {
      console.error('Xendit Webhook Error: Failed to fetch therapist details', therapistError);
      return NextResponse.json({ error: 'Therapist details not found' }, { status: 404 });
    }

    if (status === 'COMPLETED') {
      // 1. Mark withdrawal as completed
      const { error: updateError } = await supabase
        .from('therapist_withdrawals')
        .update({ 
          status: 'completed',
          payment_data: body
        })
        .eq('id', withdrawal.id);

      if (updateError) console.error('Xendit Webhook Error: Failed to update withdrawal status', updateError);

      // 2. Send Expo push notification
      if (therapist.push_token) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: therapist.push_token,
              title: 'Penarikan Dana Berhasil! 💸',
              body: `Dana sebesar Rp ${amount.toLocaleString('id-ID')} telah berhasil dikirim ke rekening Anda.`,
              data: { type: 'withdrawal_success' },
              sound: 'default',
            }),
          });
        } catch (e) {
          console.error('Failed to send push notification:', e);
        }
      }

      // 3. Add success notification record
      await supabase.from('notifications').insert({
        therapist_id,
        title: 'Penarikan Dana Berhasil!',
        body: `Dana Rp ${amount.toLocaleString('id-ID')} telah berhasil dicairkan ke rekening Anda.`,
        type: 'withdrawal_success',
      });

    } else if (status === 'FAILED') {
      // 1. Mark withdrawal as failed
      const { error: updateError } = await supabase
        .from('therapist_withdrawals')
        .update({ 
          status: 'failed',
          payment_data: body
        })
        .eq('id', withdrawal.id);

      if (updateError) console.error('Xendit Webhook Error: Failed to update withdrawal status to failed', updateError);

      // 2. Revert therapist balance
      const revertedBalance = (therapist.wallet_balance || 0) + totalDeduction;
      const { error: balanceError } = await supabase
        .from('therapists')
        .update({ wallet_balance: revertedBalance })
        .eq('id', therapist_id);

      if (balanceError) console.error('Xendit Webhook Error: Failed to revert therapist balance', balanceError);

      // 3. Insert transaction record for the refund
      const { error: transError } = await supabase.from('transactions').insert({
        therapist_id,
        type: 'credit',
        amount: totalDeduction,
        balance_before: therapist.wallet_balance,
        balance_after: revertedBalance,
        description: `Pengembalian Penarikan Gagal (${withdrawal.bank_name})`,
        reference_id: external_id,
        metadata: { withdrawal_id: withdrawal.id, failure_code: failure_code }
      });

      if (transError) console.error('Xendit Webhook Error: Failed to insert reversal transaction log', transError);

      // 4. Send failure push notification
      if (therapist.push_token) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: therapist.push_token,
              title: 'Penarikan Dana Gagal ❌',
              body: `Pencairan dana Rp ${amount.toLocaleString('id-ID')} gagal (${failure_code || 'rekening salah'}). Saldo Anda telah dikembalikan.`,
              data: { type: 'withdrawal_failed' },
              sound: 'default',
            }),
          });
        } catch (e) {
          console.error('Failed to send push notification:', e);
        }
      }

      // 5. Add failure notification record
      await supabase.from('notifications').insert({
        therapist_id,
        title: 'Penarikan Dana Gagal',
        body: `Pencairan dana Rp ${amount.toLocaleString('id-ID')} gagal. Saldo telah dikembalikan ke dompet Anda.`,
        type: 'withdrawal_failed',
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Xendit Disbursement Webhook Parsing Error:', error.message);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
