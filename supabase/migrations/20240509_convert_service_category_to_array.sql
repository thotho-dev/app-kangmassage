-- Combined migration to safely add and convert category_slug to array
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_slug TEXT;

DO $$ 
BEGIN
    -- Check if it's NOT an array yet
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'category_slug') != 'ARRAY' 
    THEN
        ALTER TABLE services 
        ALTER COLUMN category_slug TYPE TEXT[] 
        USING CASE 
            WHEN category_slug IS NULL THEN '{}'::TEXT[]
            ELSE ARRAY[category_slug]
        END;
    END IF;
END $$;

ALTER TABLE services ALTER COLUMN category_slug SET DEFAULT '{}';

-- Index for array searches
CREATE INDEX IF NOT EXISTS idx_services_category_slug_array ON services USING GIN (category_slug);
