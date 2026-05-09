-- Add price_type to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT 'duration';

-- Update schema.sql reference
-- (I will do this in the next step using replace_file_content)
