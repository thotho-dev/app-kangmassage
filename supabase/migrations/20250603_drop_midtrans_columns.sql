-- Drop Midtrans Iris columns from app_settings (migrated to Xendit Disbursements)
ALTER TABLE app_settings DROP COLUMN IF EXISTS midtrans_server_key;
ALTER TABLE app_settings DROP COLUMN IF EXISTS iris_merchant_code;

-- Add separate secret key column for Xendit Disbursements (withdrawal)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS xendit_disbursement_secret_key TEXT NOT NULL DEFAULT '';
