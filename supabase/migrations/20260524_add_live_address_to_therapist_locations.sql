-- Add live_address column to therapist_locations table
ALTER TABLE therapist_locations ADD COLUMN IF NOT EXISTS live_address TEXT;
