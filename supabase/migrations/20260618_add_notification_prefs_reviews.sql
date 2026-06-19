-- Notification preferences for users
CREATE TABLE IF NOT EXISTS user_notification_prefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  wa_enabled   BOOLEAN NOT NULL DEFAULT true,
  promo_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notification_prefs_manage"
  ON user_notification_prefs FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

CREATE TRIGGER update_user_notification_prefs_updated_at
  BEFORE UPDATE ON user_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- App reviews (generic app rating, not order-specific)
CREATE TABLE IF NOT EXISTS user_app_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_app_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_app_reviews_insert"
  ON user_app_reviews FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

CREATE POLICY "user_app_reviews_select"
  ON user_app_reviews FOR SELECT
  USING (true);
