-- ============================================================
-- Therapist Registration Payment System
-- ============================================================

-- 1. App Settings: registration fee config
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS therapist_registration_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registration_payment_required BOOLEAN NOT NULL DEFAULT false;

-- 2. Registration Equipment table (admin-managed)
CREATE TABLE IF NOT EXISTS registration_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE registration_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registration_equipment_public_read" ON registration_equipment
  FOR SELECT USING (is_active = true OR auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin'));

CREATE POLICY "registration_equipment_admin_write" ON registration_equipment
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin'));

CREATE POLICY "registration_equipment_admin_update" ON registration_equipment
  FOR UPDATE USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin'));

CREATE POLICY "registration_equipment_admin_delete" ON registration_equipment
  FOR DELETE USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin'));

CREATE TRIGGER update_registration_equipment_updated_at BEFORE UPDATE ON registration_equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Therapist Registration Payments table
CREATE TABLE IF NOT EXISTS therapist_registration_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  registration_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  equipment_items JSONB DEFAULT '[]',
  equipment_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_data JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE therapist_registration_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registration_payments_own" ON therapist_registration_payments
  FOR ALL USING (therapist_id IN (SELECT id FROM therapists WHERE supabase_uid = auth.uid()));

CREATE POLICY "registration_payments_admin_read" ON therapist_registration_payments
  FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin'));

CREATE POLICY "registration_payments_admin_update" ON therapist_registration_payments
  FOR UPDATE USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin'));

CREATE TRIGGER update_therapist_registration_payments_updated_at BEFORE UPDATE ON therapist_registration_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Add registration payment columns to therapists
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_payment_id UUID REFERENCES therapist_registration_payments(id);

-- 5. Update trigger to block online if registration not paid
CREATE OR REPLACE FUNCTION enforce_therapist_verified_for_online()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'online' AND (OLD.is_verified = false OR NEW.is_verified = false OR (NEW.registration_fee_paid = false AND NEW.is_verified = true)) THEN
    NEW.status := 'offline';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_therapists_registration_fee_paid ON therapists(registration_fee_paid);
CREATE INDEX IF NOT EXISTS idx_registration_payments_therapist ON therapist_registration_payments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_status ON therapist_registration_payments(payment_status);

-- 7. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE registration_equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE therapist_registration_payments;
