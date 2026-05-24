-- Support Chat (Therapist ↔ Admin) Tables
-- Run in Supabase SQL Editor alongside schema.sql

CREATE TABLE IF NOT EXISTS support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  admin_unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('therapist', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_chats_therapist_access"
  ON support_chats FOR ALL
  USING (therapist_id IN (SELECT id FROM therapists WHERE supabase_uid = auth.uid()));

CREATE POLICY "support_chats_admin_access"
  ON support_chats FOR ALL
  USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin'));

CREATE POLICY "support_messages_access"
  ON support_messages FOR ALL
  USING (chat_id IN (SELECT id FROM support_chats WHERE
    therapist_id IN (SELECT id FROM therapists WHERE supabase_uid = auth.uid())
    OR auth.uid() IN (SELECT supabase_uid FROM users WHERE role = 'admin')
  ));

CREATE INDEX idx_support_chats_therapist ON support_chats(therapist_id);
CREATE INDEX idx_support_chats_status ON support_chats(status);
CREATE INDEX idx_support_messages_chat ON support_messages(chat_id);

CREATE TRIGGER update_support_chats_updated_at BEFORE UPDATE ON support_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_chats;

-- Trigger: auto-notify therapist / increment admin unread
CREATE OR REPLACE FUNCTION notify_support_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'admin' THEN
    INSERT INTO notifications (therapist_id, title, body, type, data)
    SELECT
      therapist_id,
      'Pesan baru dari Admin',
      NEW.message,
      'support_chat',
      jsonb_build_object('chat_id', NEW.chat_id)
    FROM support_chats
    WHERE id = NEW.chat_id;
  ELSIF NEW.sender_type = 'therapist' THEN
    UPDATE support_chats SET admin_unread_count = admin_unread_count + 1
    WHERE id = NEW.chat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_support_message_insert ON support_messages;
CREATE TRIGGER on_support_message_insert
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_support_message();
