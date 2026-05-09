-- Add is_deleted column for Soft Delete support
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Revert the cascade delete if it was applied, changing it back to RESTRICT 
-- to protect historical data, now that we use Soft Delete.
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_service_id_fkey,
ADD CONSTRAINT orders_service_id_fkey 
  FOREIGN KEY (service_id) 
  REFERENCES services(id) 
  ON DELETE RESTRICT;
