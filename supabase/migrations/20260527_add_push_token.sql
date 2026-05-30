-- Add push_token column to users and therapists for Expo push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS push_token TEXT;
