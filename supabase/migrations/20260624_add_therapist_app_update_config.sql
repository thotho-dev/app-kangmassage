ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS therapist_min_app_version VARCHAR(10) NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS therapist_playstore_url TEXT NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.rmhbgr.kangmassagetherapist';
