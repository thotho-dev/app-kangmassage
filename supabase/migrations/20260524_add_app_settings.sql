-- ============================================================
-- MIGRATION: APP SETTINGS TABLE + therapist_preference column
-- ============================================================

-- Add therapist_preference column to orders (gender preference: 'any', 'male', 'female')
ALTER TABLE orders ADD COLUMN IF NOT EXISTS therapist_preference VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_gender VARCHAR(10);

-- Check if therapist_tier enum exists (from prior migration), if not create it
DO $$ BEGIN
  CREATE TYPE therapist_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- App Settings table — single row, contains all platform configuration
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- === Matching Configuration ===
  matching_radius_km      NUMERIC(5,2) NOT NULL DEFAULT 3.00,
  min_rating              NUMERIC(3,2) NOT NULL DEFAULT 4.50,
  min_wallet_balance      NUMERIC(12,2) NOT NULL DEFAULT 15000.00,

  -- === Commission Rates (platform cut %) ===
  bronze_platform_cut     NUMERIC(5,2) NOT NULL DEFAULT 27.00,
  silver_platform_cut     NUMERIC(5,2) NOT NULL DEFAULT 25.00,
  gold_platform_cut       NUMERIC(5,2) NOT NULL DEFAULT 23.00,
  platinum_platform_cut   NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  diamond_platform_cut    NUMERIC(5,2) NOT NULL DEFAULT 20.00,

  -- === Topup Configuration ===
  topup_admin_fee         NUMERIC(12,2) NOT NULL DEFAULT 2500.00,
  topup_min_amount        NUMERIC(12,2) NOT NULL DEFAULT 10000.00,
  topup_max_amount        NUMERIC(12,2) NOT NULL DEFAULT 2000000.00,

  -- === Withdrawal Configuration ===
  withdraw_admin_fee      NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
  withdraw_min_amount     NUMERIC(12,2) NOT NULL DEFAULT 50000.00,
  withdraw_max_amount     NUMERIC(12,2) NOT NULL DEFAULT 5000000.00,

  -- === Platform Info ===
  platform_name           VARCHAR(100) NOT NULL DEFAULT 'Kang Massage',
  support_email           VARCHAR(255) NOT NULL DEFAULT 'support@kangmassage.app',

  -- === Contact Support ===
  support_whatsapp        TEXT NOT NULL DEFAULT '',
  chat_link               TEXT NOT NULL DEFAULT '',

  -- Metadata
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by              UUID REFERENCES users(id)
);

-- Insert default row (will be a no-op if row already exists from manual insert)
INSERT INTO app_settings (id) VALUES (gen_random_uuid())
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "app_settings_public_read"
  ON app_settings FOR SELECT
  USING (true);

-- Only admin can insert/update/delete
CREATE POLICY "app_settings_admin_write"
  ON app_settings FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin')
  );

CREATE POLICY "app_settings_admin_update"
  ON app_settings FOR UPDATE
  USING (
    auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin')
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
