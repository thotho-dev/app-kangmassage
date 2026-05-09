-- Tables for Chat System
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    user_unread_count INTEGER DEFAULT 0,
    therapist_unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, therapist_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- Can be user_id or therapist_id
    sender_type TEXT NOT NULL, -- 'user' or 'therapist'
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversations access" ON conversations
FOR ALL USING (
    auth.uid() IN (SELECT supabase_uid FROM users WHERE id = user_id)
    OR auth.uid() IN (SELECT supabase_uid FROM therapists WHERE id = therapist_id)
);

CREATE POLICY "Messages access" ON messages
FOR ALL USING (
    conversation_id IN (
        SELECT id FROM conversations WHERE 
        user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
        OR therapist_id IN (SELECT id FROM therapists WHERE supabase_uid = auth.uid())
    )
);

-- Indexing
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_therapist_id ON conversations(therapist_id);
