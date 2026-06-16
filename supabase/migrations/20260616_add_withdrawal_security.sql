-- ============================================================
-- Migration: Add withdrawal security features
-- PIN, saved bank accounts, admin approval
-- ============================================================

-- 1. Add transaction_pin to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT false;

-- 2. Create saved_bank_accounts table
CREATE TABLE IF NOT EXISTS saved_bank_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_code       VARCHAR(20),
  bank_name       VARCHAR(100) NOT NULL,
  account_number  VARCHAR(100) NOT NULL,
  account_name    VARCHAR(255) NOT NULL,
  is_verified     BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add security columns to user_withdrawals
ALTER TABLE user_withdrawals ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES saved_bank_accounts(id);
ALTER TABLE user_withdrawals ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id);
ALTER TABLE user_withdrawals ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE user_withdrawals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE user_withdrawals ADD COLUMN IF NOT EXISTS pin_verified BOOLEAN DEFAULT false;
ALTER TABLE user_withdrawals ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
ALTER TABLE user_withdrawals ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE user_withdrawals ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT false;

-- 4. RLS for saved_bank_accounts
ALTER TABLE saved_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank accounts"
  ON saved_bank_accounts FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

CREATE POLICY "Users can insert own bank accounts"
  ON saved_bank_accounts FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

CREATE POLICY "Users can update own bank accounts"
  ON saved_bank_accounts FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

CREATE POLICY "Users can delete own bank accounts"
  ON saved_bank_accounts FOR DELETE
  USING (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

-- 5. Add withdrawal_otp_threshold to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS withdrawal_otp_threshold NUMERIC(12,2) NOT NULL DEFAULT 500000.00;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS withdrawal_daily_limit NUMERIC(12,2) NOT NULL DEFAULT 3000000.00;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS withdrawal_max_count_per_day INTEGER NOT NULL DEFAULT 3;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS withdrawal_admin_approval BOOLEAN NOT NULL DEFAULT false;

-- 6. Add hold_amount to users for pending withdrawals
ALTER TABLE users ADD COLUMN IF NOT EXISTS hold_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00;
