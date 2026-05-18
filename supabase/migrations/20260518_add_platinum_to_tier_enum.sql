-- ============================================================
-- MIGRATION: ADD 'platinum' TO THERAPIST_TIER ENUM
-- ============================================================

-- PostgreSQL enums cannot be modified inside a transaction block in some versions,
-- so this statement should be run individually.
ALTER TYPE therapist_tier ADD VALUE IF NOT EXISTS 'platinum' AFTER 'gold';
