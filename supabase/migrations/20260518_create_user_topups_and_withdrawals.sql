-- Table to track user topups via Midtrans
CREATE TABLE IF NOT EXISTS user_topups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    fee NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, paid, failed, expired
    external_id TEXT UNIQUE,
    payment_method TEXT,
    payment_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track user withdrawals
CREATE TABLE IF NOT EXISTS user_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    admin_fee NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    external_id TEXT UNIQUE,
    bank_name TEXT,
    bank_code TEXT,
    account_number TEXT,
    account_name TEXT,
    payment_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies for user_topups
CREATE POLICY "Users can view their own topups"
ON user_topups FOR SELECT
USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE id = user_topups.user_id));

CREATE POLICY "Users can insert their own topups"
ON user_topups FOR INSERT
WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM users WHERE id = user_topups.user_id));

CREATE POLICY "Users can update their own topups"
ON user_topups FOR UPDATE
USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE id = user_topups.user_id));

-- Policies for user_withdrawals
CREATE POLICY "Users can view their own withdrawals"
ON user_withdrawals FOR SELECT
USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE id = user_withdrawals.user_id));

CREATE POLICY "Users can insert their own withdrawals"
ON user_withdrawals FOR INSERT
WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM users WHERE id = user_withdrawals.user_id));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_topups_updated_at
    BEFORE UPDATE ON user_topups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_withdrawals_updated_at
    BEFORE UPDATE ON user_withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
