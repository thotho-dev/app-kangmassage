-- Add columns for therapist registration
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS nik VARCHAR(16) UNIQUE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ktp_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS selfie_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS registration_step VARCHAR(20) DEFAULT 'pending'; -- pending, otp_sent, completed
