-- RPC untuk refund saldo + voucher cleanup secara atomic (SELECT FOR UPDATE)
-- Mencegah double refund via race condition

CREATE OR REPLACE FUNCTION refund_order_saldo(p_order_id UUID)
RETURNS JSONB
AS $$
DECLARE
  v_order RECORD;
  v_user RECORD;
  v_existing INTEGER;
  v_new_balance DECIMAL(12,2);
  v_voucher_usage RECORD;
BEGIN
  -- Lock + read order (FOR UPDATE prevents concurrent refund)
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  -- Status guard: pastikan order masih bisa di-refund
  -- (status sudah diupdate ke 'cancelled' oleh mobile code sebelumnya)
  IF v_order.status NOT IN ('pending', 'accepted', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order status not refundable');
  END IF;

  -- Cek sudah pernah refund belum (guard double refund)
  SELECT COUNT(*) INTO v_existing
  FROM transactions
  WHERE order_id = p_order_id AND type = 'refund';

  IF v_existing > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already refunded');
  END IF;

  -- Lock user row
  SELECT * INTO v_user
  FROM users
  WHERE id = v_order.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Refund wallet
  v_new_balance := COALESCE(v_user.wallet_balance, 0) + COALESCE(v_order.total_price, 0);
  UPDATE users
  SET wallet_balance = v_new_balance,
      cashback_balance = COALESCE(cashback_balance, 0) + COALESCE(v_order.used_cashback, 0) - COALESCE(v_order.earned_cashback, 0)
  WHERE id = v_order.user_id;

  -- Insert transaction record
  INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after, description)
  VALUES (
    v_order.user_id,
    p_order_id,
    'refund',
    COALESCE(v_order.total_price, 0),
    COALESCE(v_user.wallet_balance, 0),
    v_new_balance,
    'Refund pembatalan pesanan ' || COALESCE(v_order.order_number, '') || ' ke saldo'
  );

  -- Update order status
  UPDATE orders SET status = 'cancelled', cancelled_at = NOW()
  WHERE id = p_order_id;

  -- Cleanup voucher usage
  IF v_order.voucher_id IS NOT NULL THEN
    DELETE FROM voucher_usages WHERE order_id = p_order_id;
    UPDATE vouchers SET usage_count = GREATEST(0, COALESCE(usage_count, 1) - 1)
    WHERE id = v_order.voucher_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Refund processed',
    'data', jsonb_build_object(
      'refunded_amount', COALESCE(v_order.total_price, 0),
      'old_balance', COALESCE(v_user.wallet_balance, 0),
      'new_balance', v_new_balance
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
