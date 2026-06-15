-- Add additional_services column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS additional_services JSONB DEFAULT '[]';
