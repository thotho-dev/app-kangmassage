-- Add price_type to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT 'duration';

-- Update existing skills if any
UPDATE skills SET price_type = 'duration' WHERE price_type IS NULL;
