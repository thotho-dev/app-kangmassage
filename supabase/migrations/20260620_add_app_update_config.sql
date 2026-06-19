-- Add Play Store update configuration to app_settings
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS min_app_version VARCHAR(10) NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS playstore_url TEXT NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.kangmassage.customer';
