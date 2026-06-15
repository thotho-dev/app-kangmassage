-- Add tips column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tips DECIMAL(12,2) DEFAULT 0.00;
