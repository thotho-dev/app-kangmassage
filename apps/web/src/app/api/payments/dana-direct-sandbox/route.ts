import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { topup_id } = await req.json();

    if (!topup_id) {
      return NextResponse.json({ error: 'Missing topup_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch Topup Record (try user_topups first, then therapist_topups)
    let topup: any = null;
    let isUser = true;

    const { data: userTopup } = await supabase
      .from('user_topups')
      .select('*')
      .eq('id', topup_id)
      .maybeSingle();

    if (userTopup) {
      topup = userTopup;
      isUser = true;
    } else {
      const { data: therapistTopup } = await supabase
        .from('therapist_topups')
        .select('*')
        .eq('id', topup_id)
        .maybeSingle();
      
      if (therapistTopup) {
        topup = therapistTopup;
        isUser = false;
      }
    }

    if (!topup) {
      return NextResponse.json({ error: 'Top-up record not found' }, { status: 404 });
    }

    if (topup.status === 'paid') {
      return NextResponse.json({ status: 'already_paid', message: 'This transaction is already paid.' });
    }

    const topupAmount = topup.amount;
    const referenceId = `DANA-DIR-SB-${Date.now()}`;
    let newBalance = 0;

    // 2. Perform Balance & Transaction Updates based on User Type
    if (isUser) {
      // Fetch User Profile
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('wallet_balance, full_name, push_token')
        .eq('id', topup.user_id)
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const oldBalance = user.wallet_balance || 0;
      newBalance = oldBalance + topupAmount;

      // Update User Wallet Balance
      const { error: balanceError } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', topup.user_id);

      if (balanceError) throw balanceError;

      // Create Wallet Credit Transaction Record
      await supabase
        .from('transactions')
        .insert({
          user_id: topup.user_id,
          type: 'credit',
          amount: topupAmount,
          balance_before: oldBalance,
          balance_after: newBalance,
          description: 'Topup Saldo via DANA Direct API Sandbox',
          reference_id: referenceId,
        });

      // Update Topup Status to Paid
      await supabase
        .from('user_topups')
        .update({ status: 'paid' })
        .eq('id', topup_id);

      // Create In-App Notification
      await supabase.from('notifications').insert({
        user_id: topup.user_id,
        title: 'Top Up Berhasil! ⚡',
        body: `Saldo Rp ${topupAmount.toLocaleString('id-ID')} berhasil ditambahkan via DANA Direct API Sandbox.`,
        type: 'topup_success',
      });

      // Send Push Notification if Push Token Available
      if (user.push_token) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: user.push_token,
              title: 'Top Up Berhasil! 🎉',
              body: `Saldo Rp ${topupAmount.toLocaleString('id-ID')} sudah masuk ke dompet Anda via DANA Sandbox.`,
              data: { type: 'topup_success' },
              sound: 'default',
              priority: 'high',
            }),
          });
        } catch (err) {
          console.error('Failed to send push notification:', err);
        }
      }
    } else {
      // Fetch Therapist Profile
      const { data: therapist, error: therapistError } = await supabase
        .from('therapists')
        .select('wallet_balance, full_name, push_token')
        .eq('id', topup.therapist_id)
        .single();

      if (therapistError || !therapist) {
        return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });
      }

      const oldBalance = therapist.wallet_balance || 0;
      newBalance = oldBalance + topupAmount;

      // Update Therapist Wallet Balance
      const { error: balanceError } = await supabase
        .from('therapists')
        .update({ wallet_balance: newBalance })
        .eq('id', topup.therapist_id);

      if (balanceError) throw balanceError;

      // Create Wallet Credit Transaction Record
      await supabase
        .from('transactions')
        .insert({
          therapist_id: topup.therapist_id,
          type: 'credit',
          amount: topupAmount,
          balance_before: oldBalance,
          balance_after: newBalance,
          description: 'Topup Saldo via DANA Direct API Sandbox',
          reference_id: referenceId,
        });

      // Update Topup Status to Paid
      await supabase
        .from('therapist_topups')
        .update({ status: 'paid' })
        .eq('id', topup_id);

      // Create In-App Notification
      await supabase.from('notifications').insert({
        therapist_id: topup.therapist_id,
        title: 'Top Up Berhasil! ⚡',
        body: `Saldo Rp ${topupAmount.toLocaleString('id-ID')} berhasil ditambahkan via DANA Direct API Sandbox.`,
        type: 'topup_success',
      });

      // Send Push Notification if Push Token Available
      if (therapist.push_token) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: therapist.push_token,
              title: 'Top Up Berhasil! 🎉',
              body: `Saldo Rp ${topupAmount.toLocaleString('id-ID')} sudah masuk ke dompet Anda via DANA Sandbox.`,
              data: { type: 'topup_success' },
              sound: 'default',
              priority: 'high',
            }),
          });
        } catch (err) {
          console.error('Failed to send push notification:', err);
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Transaction successfully processed and wallet credited via DANA Sandbox Simulation!',
      data: {
        topup_id,
        amount: topupAmount,
        new_balance: newBalance,
        reference_id: referenceId
      }
    });

  } catch (error: any) {
    console.error('DANA Sandbox API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
