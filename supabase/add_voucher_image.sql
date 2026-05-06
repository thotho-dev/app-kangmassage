-- ============================================================
-- MIGRATION: ADD IMAGE_URL TO VOUCHERS TABLE
-- ============================================================

ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS image_url TEXT;
