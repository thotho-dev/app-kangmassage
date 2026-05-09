-- Table to track therapist withdrawals
CREATE TABLE IF NOT EXISTS therapist_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    fee NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    external_id TEXT UNIQUE,
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    payment_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE therapist_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can view their own withdrawals" 
ON therapist_withdrawals FOR SELECT 
USING (auth.uid() IN (SELECT supabase_uid FROM therapists WHERE id = therapist_withdrawals.therapist_id));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_therapist_withdrawals_updated_at
    BEFORE UPDATE ON therapist_withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
