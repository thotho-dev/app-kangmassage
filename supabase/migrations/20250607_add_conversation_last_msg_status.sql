ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_sender TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_is_read BOOLEAN DEFAULT false;
