-- Change order number prefix from PJT/KMS to KMSG
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'KMSG' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update existing order numbers to new prefix (run only once)
-- UPDATE orders SET order_number = 'KMSG' || SUBSTRING(order_number FROM 4) WHERE order_number LIKE 'KMS%';
