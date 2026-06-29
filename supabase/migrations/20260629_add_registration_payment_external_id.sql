-- Add external_id column for Midtrans transaction tracking
ALTER TABLE therapist_registration_payments
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
