-- ============================================================
-- Migration: Add cancel_withdrawal RPC & approval threshold
-- ============================================================

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS withdrawal_admin_approval_threshold NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION cancel_withdrawal(
  p_withdrawal_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal user_withdrawals%ROWTYPE;
  v_balance NUMERIC(12,2);
BEGIN
  -- Lock row and check status atomically
  SELECT * INTO v_withdrawal
  FROM user_withdrawals
  WHERE id = p_withdrawal_id
    AND user_id = p_user_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Penarikan tidak ditemukan atau sudah diproses'
    );
  END IF;

  -- Update status
  UPDATE user_withdrawals
  SET status = 'failed',
      payment_data = jsonb_build_object('reason', 'Cancelled by user'),
      updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- Refund balance (amount + admin_fee)
  UPDATE users
  SET wallet_balance = wallet_balance + v_withdrawal.amount + COALESCE(v_withdrawal.admin_fee, 0),
      hold_balance = GREATEST(hold_balance - v_withdrawal.amount, 0),
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_balance;

  -- Transaction record
  INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, metadata)
  VALUES (
    p_user_id,
    'credit',
    v_withdrawal.amount + COALESCE(v_withdrawal.admin_fee, 0),
    v_balance - v_withdrawal.amount - COALESCE(v_withdrawal.admin_fee, 0),
    v_balance,
    'Batal: Penarikan Saldo (' || COALESCE(v_withdrawal.bank_name, '-') || ')',
    jsonb_build_object('withdrawal_id', p_withdrawal_id, 'type', 'cancellation')
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_balance);
END;
$$;
