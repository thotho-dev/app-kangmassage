import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Xendit Disbursement Webhook Received:', JSON.stringify(body, null, 2));

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

    // 1. THERAPIST WITHDRAWAL (WD- prefix)
    if (external_id.startsWith('WD-')) {
      const { data: withdrawal, error: fetchError } = await supabase
        .from('therapist_withdrawals')
        .select('*')
        .eq('external_id', external_id)
        .single();

      if (fetchError || !withdrawal) {
        console.warn(`[Xendit Webhook] Therapist withdrawal not found for: ${external_id}`);
        return NextResponse.json({ status: 'ignored' }, { status: 200 });
      }

      if (withdrawal.status === 'completed' || withdrawal.status === 'failed') {
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }

      const { therapist_id, fee } = withdrawal;
      const totalDeduction = withdrawal.amount + fee;

      const { data: therapist } = await supabase
        .from('therapists')
        .select('wallet_balance, push_token')
        .eq('id', therapist_id)
        .single();

      if (!therapist) {
        return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });
      }

      if (status === 'COMPLETED') {
        await supabase.from('therapist_withdrawals').update({
          status: 'completed', payment_data: body
        }).eq('id', withdrawal.id);

        if (therapist.push_token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: therapist.push_token,
              title: 'Penarikan Dana Berhasil!',
              body: `Dana sebesar Rp ${amount.toLocaleString('id-ID')} telah berhasil dikirim ke rekening Anda.`,
              data: { type: 'withdrawal_success' },
              sound: 'default',
            }),
          });
        }

        await supabase.from('notifications').insert({
          therapist_id,
          title: 'Penarikan Dana Berhasil!',
          body: `Dana Rp ${amount.toLocaleString('id-ID')} telah berhasil dicairkan ke rekening Anda.`,
          type: 'withdrawal_success',
        });

      } else if (status === 'FAILED') {
        await supabase.from('therapist_withdrawals').update({
          status: 'failed', payment_data: body
        }).eq('id', withdrawal.id);

        const revertedBalance = (therapist.wallet_balance || 0) + totalDeduction;

        await supabase.from('therapists').update({ wallet_balance: revertedBalance }).eq('id', therapist_id);

        await supabase.from('transactions').insert({
          therapist_id,
          type: 'credit',
          amount: totalDeduction,
          balance_before: therapist.wallet_balance,
          balance_after: revertedBalance,
          description: `Pengembalian Penarikan Gagal (${withdrawal.bank_name})`,
          reference_id: external_id,
          metadata: { withdrawal_id: withdrawal.id, failure_code }
        });

        if (therapist.push_token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: therapist.push_token,
              title: 'Penarikan Dana Gagal',
              body: `Pencairan dana Rp ${amount.toLocaleString('id-ID')} gagal (${failure_code || 'rekening salah'}). Saldo Anda telah dikembalikan.`,
              data: { type: 'withdrawal_failed' },
              sound: 'default',
            }),
          });
        }

        await supabase.from('notifications').insert({
          therapist_id,
          title: 'Penarikan Dana Gagal',
          body: `Pencairan dana Rp ${amount.toLocaleString('id-ID')} gagal. Saldo telah dikembalikan ke dompet Anda.`,
          type: 'withdrawal_failed',
        });
      }

      return NextResponse.json({ status: 'ok', type: 'therapist_withdrawal' });
    }

    // 2. USER WITHDRAWAL (UWD- prefix)
    if (external_id.startsWith('UWD-')) {
      const { data: withdrawal, error: fetchError } = await supabase
        .from('user_withdrawals')
        .select('*')
        .eq('external_id', external_id)
        .single();

      if (fetchError || !withdrawal) {
        console.warn(`[Xendit Webhook] User withdrawal not found for: ${external_id}`);
        return NextResponse.json({ status: 'ignored' }, { status: 200 });
      }

      if (withdrawal.status === 'completed' || withdrawal.status === 'failed') {
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }

      const { user_id, admin_fee } = withdrawal;
      const totalDeduction = withdrawal.amount + admin_fee;

      const { data: user } = await supabase
        .from('users')
        .select('wallet_balance, push_token')
        .eq('id', user_id)
        .single();

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (status === 'COMPLETED') {
        await supabase.from('user_withdrawals').update({
          status: 'completed', payment_data: body
        }).eq('id', withdrawal.id);

        if (user.push_token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: user.push_token,
              title: 'Penarikan Dana Berhasil!',
              body: `Dana sebesar Rp ${amount.toLocaleString('id-ID')} telah berhasil dikirim ke rekening Anda.`,
              data: { type: 'withdrawal_success' },
              sound: 'default',
            }),
          });
        }

        await supabase.from('notifications').insert({
          user_id,
          title: 'Penarikan Dana Berhasil!',
          body: `Dana Rp ${amount.toLocaleString('id-ID')} telah berhasil dicairkan ke rekening Anda.`,
          type: 'withdrawal_success',
        });

      } else if (status === 'FAILED') {
        await supabase.from('user_withdrawals').update({
          status: 'failed', payment_data: body
        }).eq('id', withdrawal.id);

        const revertedBalance = (user.wallet_balance || 0) + totalDeduction;

        await supabase.from('users').update({ wallet_balance: revertedBalance }).eq('id', user_id);

        await supabase.from('transactions').insert({
          user_id,
          type: 'credit',
          amount: totalDeduction,
          balance_before: user.wallet_balance,
          balance_after: revertedBalance,
          description: `Pengembalian Penarikan Gagal (${withdrawal.bank_name})`,
          reference_id: external_id,
          metadata: { withdrawal_id: withdrawal.id, failure_code }
        });

        if (user.push_token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: user.push_token,
              title: 'Penarikan Dana Gagal',
              body: `Pencairan dana Rp ${amount.toLocaleString('id-ID')} gagal (${failure_code || 'rekening salah'}). Saldo Anda telah dikembalikan.`,
              data: { type: 'withdrawal_failed' },
              sound: 'default',
            }),
          });
        }

        await supabase.from('notifications').insert({
          user_id,
          title: 'Penarikan Dana Gagal',
          body: `Pencairan dana Rp ${amount.toLocaleString('id-ID')} gagal. Saldo telah dikembalikan ke dompet Anda.`,
          type: 'withdrawal_failed',
        });
      }

      return NextResponse.json({ status: 'ok', type: 'user_withdrawal' });
    }

    return NextResponse.json({ status: 'ignored', message: 'Unknown external_id prefix' });

  } catch (error: any) {
    console.error('Xendit Disbursement Webhook Error:', error.message);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
