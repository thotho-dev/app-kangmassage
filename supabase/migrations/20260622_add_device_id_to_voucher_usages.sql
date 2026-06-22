-- Add device_id to voucher_usages for new_user voucher device tracking
ALTER TABLE voucher_usages ADD COLUMN IF NOT EXISTS device_id TEXT;
CREATE INDEX IF NOT EXISTS idx_voucher_usages_device_id ON voucher_usages(device_id);
