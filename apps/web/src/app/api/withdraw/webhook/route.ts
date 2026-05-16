import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Iris webhooks can be an array of payouts
    const payouts = Array.isArray(body) ? body : [body];
    
    console.log('Iris Webhook Received:', JSON.stringify(payouts, null, 2));

    const supabase = createAdminClient();

    for (const payout of payouts) {
      const { payout_id, status, errorMessage } = payout;

      if (!payout_id) continue;

      // Update Withdrawal Status
      // Iris statuses: 'completed', 'failed', 'rejected'
      let finalStatus = 'pending';
      if (status === 'completed') finalStatus = 'completed';
      else if (status === 'failed' || status === 'rejected') finalStatus = 'failed';

      const { data: withdrawal, error: fetchError } = await supabase
        .from('therapist_withdrawals')
        .update({ 
          status: finalStatus,
          payment_data: payout
        })
        .eq('external_id', payout_id)
        .select()
        .single();

      if (fetchError || !withdrawal) {
        console.warn(`[Iris Webhook] Withdrawal record not found for ID: ${payout_id}`);
        continue;
      }

      // If Failed, Revert Balance & Create Reversal Transaction
      if (finalStatus === 'failed') {
        const { data: therapist } = await supabase
          .from('therapists')
          .select('wallet_balance, full_name, push_token')
          .eq('id', withdrawal.therapist_id)
          .single();

        if (therapist) {
          const totalAmount = withdrawal.amount + withdrawal.fee;
          const newBalance = (therapist.wallet_balance || 0) + totalAmount;

          await supabase
            .from('therapists')
            .update({ wallet_balance: newBalance })
            .eq('id', withdrawal.therapist_id);

          await supabase.from('transactions').insert({
            therapist_id: withdrawal.therapist_id,
            type: 'credit',
            amount: totalAmount,
            balance_before: therapist.wallet_balance,
            balance_after: newBalance,
            description: `Refund: Penarikan Gagal (${payout_id})`,
            metadata: { withdrawal_id: withdrawal.id, reason: errorMessage }
          });

          // Notify therapist about failure
          if (therapist.push_token) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: therapist.push_token,
                title: 'Penarikan Dana Gagal ⚠️',
                body: `Maaf, penarikan dana Rp ${totalAmount.toLocaleString('id-ID')} gagal. Saldo telah dikembalikan.`,
                data: { type: 'withdrawal_failed' },
                sound: 'default',
              }),
            });
          }
        }
      } 
      else if (finalStatus === 'completed') {
        // Notify therapist about success
        const { data: therapist } = await supabase
          .from('therapists')
          .select('push_token')
          .eq('id', withdrawal.therapist_id)
          .single();

        if (therapist?.push_token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: therapist.push_token,
              title: 'Penarikan Dana Berhasil! 💸',
              body: `Dana Rp ${withdrawal.amount.toLocaleString('id-ID')} telah dikirim ke rekening Anda.`,
              data: { type: 'withdrawal_success' },
              sound: 'default',
            }),
          });
        }
      }
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error('Iris Webhook Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
