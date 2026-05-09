-- Update orders table to allow cascading delete when a service is deleted
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_service_id_fkey,
ADD CONSTRAINT orders_service_id_fkey 
  FOREIGN KEY (service_id) 
  REFERENCES services(id) 
  ON DELETE CASCADE;
