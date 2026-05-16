-- Add missing columns to therapists table for withdrawals and address
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS address TEXT;
