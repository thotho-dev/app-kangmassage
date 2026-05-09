-- Add duration_options column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_options JSONB DEFAULT '[]';

-- Optional: Migrate existing data to duration_options if needed
-- UPDATE services SET duration_options = jsonb_build_array(jsonb_build_object('duration', duration_min, 'price', base_price))
-- WHERE duration_options = '[]' OR duration_options IS NULL;
