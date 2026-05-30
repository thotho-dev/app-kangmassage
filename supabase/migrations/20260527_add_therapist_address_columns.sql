-- Add detailed address columns to therapists table for OCR parsing
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS rt_rw TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS kelurahan TEXT;
