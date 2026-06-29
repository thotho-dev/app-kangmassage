ALTER TABLE registration_equipment
  ADD COLUMN IF NOT EXISTS discount_price DECIMAL(12,2) NOT NULL DEFAULT 0;
