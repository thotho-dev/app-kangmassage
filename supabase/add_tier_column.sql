-- ============================================================
-- MIGRATION: ADD TIER COLUMN TO THERAPISTS TABLE
-- ============================================================

-- 1. Create the enum type for therapist tier
DO $$ BEGIN
    CREATE TYPE therapist_tier AS ENUM ('bronze', 'silver', 'gold', 'diamond');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add the tier column with default 'bronze'
ALTER TABLE therapists 
ADD COLUMN IF NOT EXISTS tier therapist_tier NOT NULL DEFAULT 'bronze';

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_therapists_tier ON therapists(tier);

-- 4. Update existing records (optional, but good practice)
-- UPDATE therapists SET tier = 'bronze' WHERE tier IS NULL;
