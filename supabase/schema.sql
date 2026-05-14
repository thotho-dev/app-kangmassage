-- ============================================================
-- PIJAT ON-DEMAND - SUPABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial queries (optional, fallback to lat/lng math)

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'therapist', 'admin');
CREATE TYPE order_status AS ENUM (
  'pending',       -- Order placed, searching for therapist
  'accepted',      -- Therapist accepted
  'on_the_way',    -- Therapist heading to customer
  'in_progress',   -- Session started
  'completed',     -- Session done
  'cancelled',     -- Cancelled by user or therapist
  'rejected'       -- All therapists rejected
);
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('wallet', 'midtrans', 'cash');
CREATE TYPE therapist_status AS ENUM ('online', 'offline', 'busy');
CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE voucher_type AS ENUM ('percentage', 'fixed');
CREATE TYPE voucher_category AS ENUM (
  'direct',       -- Promo umum
  'new_user',     -- Hanya untuk user baru
  'repeat_order', -- Untuk order ke-N
  'happy_hour',   -- Jam sepi
  'location',     -- Area tertentu
  'tier',         -- VIP benefit
  'therapist',    -- Promo terapis
  'event',        -- Musiman
  'topup',        -- Bonus isi saldo
  'cashback',     -- Masuk ke wallet
  'referral'      -- Ajak teman
);

-- ============================================================
-- USERS TABLE
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_uid    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(20) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'user',
  wallet_balance  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_orders    INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- THERAPISTS TABLE
-- ============================================================

CREATE TABLE therapists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_uid    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(20) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE,
  avatar_url      TEXT,
  bio             TEXT,
  gender          VARCHAR(10),
  specializations TEXT[],
  rating          DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  total_reviews   INTEGER NOT NULL DEFAULT 0,
  total_orders    INTEGER NOT NULL DEFAULT 0,
  status          therapist_status NOT NULL DEFAULT 'offline',
  wallet_balance  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 80.00, -- % of order fee goes to therapist
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- THERAPIST LOCATIONS TABLE (Real-time location updates)
-- ============================================================

CREATE TABLE therapist_locations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  therapist_id   UUID NOT NULL UNIQUE REFERENCES therapists(id) ON DELETE CASCADE,
  latitude       DECIMAL(10,8) NOT NULL,
  longitude      DECIMAL(11,8) NOT NULL,
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICES TABLE
-- ============================================================

CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  category_slug TEXT[] DEFAULT '{}',
  duration_min  INTEGER NOT NULL, -- Duration in minutes
  base_price    DECIMAL(12,2) NOT NULL,
  duration_options JSONB DEFAULT '[]',
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  price_type    VARCHAR(20) DEFAULT 'duration', -- 'duration' or 'treatment'
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VOUCHERS TABLE
-- ============================================================

CREATE TABLE vouchers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              VARCHAR(50) UNIQUE NOT NULL,
  description       TEXT,
  category          voucher_category NOT NULL DEFAULT 'direct',
  type              voucher_type NOT NULL,
  value             DECIMAL(12,2) NOT NULL, -- Nilai diskon/cashback
  
  -- Syarat & Ketentuan
  min_order_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_discount      DECIMAL(12,2),          -- Maksimal potongan (untuk %)
  min_order_count   INTEGER DEFAULT 0,      -- Minimal order user sebelumnya
  
  -- Time-based (Happy Hour)
  start_time        TIME,                   -- Jam mulai (misal 10:00)
  end_time          TIME,                   -- Jam selesai (misal 15:00)
  days_of_week      INTEGER[],              -- 0 (Minggu) s/d 6 (Sabtu)
  
  -- Location-based
  area_names        TEXT[],                 -- Daftar area promo (Multi-area)
  
  -- User-specific
  service_id        UUID REFERENCES services(id), -- Voucher spesifik layanan
  therapist_id      UUID REFERENCES therapists(id), -- Jika disubsidi terapis
  
  -- Limits
  usage_limit       INTEGER,                -- Total kuota (seluruh user)
  user_limit        INTEGER DEFAULT 1,      -- Kuota per user (default 1x pakai)
  usage_count       INTEGER NOT NULL DEFAULT 0,
  
  valid_from        TIMESTAMPTZ NOT NULL,
  valid_until       TIMESTAMPTZ NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_cashback       BOOLEAN NOT NULL DEFAULT false,
  
  metadata          JSONB DEFAULT '{}',     -- Rule tambahan
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracking pemakaian voucher oleh user
CREATE TABLE voucher_usages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id  UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id),
  used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS TABLE
-- ============================================================

CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number      VARCHAR(20) UNIQUE NOT NULL,
  user_id           UUID NOT NULL REFERENCES users(id),
  therapist_id      UUID REFERENCES therapists(id),
  service_id        UUID NOT NULL REFERENCES services(id),
  voucher_id        UUID REFERENCES vouchers(id),

  -- Location
  address           TEXT NOT NULL,
  latitude          DECIMAL(10,8) NOT NULL,
  longitude         DECIMAL(11,8) NOT NULL,

  -- Pricing
  service_price     DECIMAL(12,2) NOT NULL,
  discount_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_price       DECIMAL(12,2) NOT NULL,

  -- Status
  status            order_status NOT NULL DEFAULT 'pending',
  payment_status    payment_status NOT NULL DEFAULT 'pending',
  payment_method    payment_method,

  -- Timestamps
  scheduled_at      TIMESTAMPTZ,
  accepted_at       TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,

  -- Notes
  user_notes        TEXT,
  cancellation_reason TEXT,

  -- Rating
  rating            INTEGER CHECK (rating >= 1 AND rating <= 5),
  review            TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER LOGS TABLE (Status history)
-- ============================================================

CREATE TABLE order_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  note        TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS TABLE (Wallet transactions)
-- ============================================================

CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id),
  therapist_id    UUID REFERENCES therapists(id),
  order_id        UUID REFERENCES orders(id),
  type            transaction_type NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  balance_before  DECIMAL(12,2) NOT NULL,
  balance_after   DECIMAL(12,2) NOT NULL,
  description     TEXT NOT NULL,
  reference_id    VARCHAR(255), -- External payment ref (Midtrans)
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  therapist_id UUID REFERENCES therapists(id),
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  type        VARCHAR(50) NOT NULL, -- 'order_new', 'order_accepted', etc.
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_supabase_uid ON users(supabase_uid);

CREATE INDEX idx_therapists_phone ON therapists(phone);
CREATE INDEX idx_therapists_status ON therapists(status);
CREATE INDEX idx_therapists_supabase_uid ON therapists(supabase_uid);

CREATE INDEX idx_therapist_locations_therapist_id ON therapist_locations(therapist_id);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_therapist_id ON orders(therapist_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

CREATE INDEX idx_order_logs_order_id ON order_logs(order_id);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_therapist_id ON transactions(therapist_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_therapist_id ON notifications(therapist_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_vouchers_code ON vouchers(code);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_therapists_updated_at BEFORE UPDATE ON therapists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'PJT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Auto-log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_logs(order_id, status, note)
    VALUES (NEW.id, NEW.status, 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_order_status AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- Haversine distance function (for therapist matching)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  R CONSTANT DECIMAL := 6371; -- Earth radius in km
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  a := SIN(dlat/2) * SIN(dlat/2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon/2) * SIN(dlon/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Update user total_orders on completion
CREATE OR REPLACE FUNCTION update_user_total_orders()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
    UPDATE users SET total_orders = total_orders + 1 WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_completed
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_user_total_orders();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_usages ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "users_own_data" ON users FOR ALL USING (supabase_uid = auth.uid());
-- Therapists can read their own data
CREATE POLICY "therapists_own_data" ON therapists FOR ALL USING (supabase_uid = auth.uid());
-- Users can read/create/update their own orders
CREATE POLICY "users_own_orders" ON orders FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  OR therapist_id IN (SELECT id FROM therapists WHERE supabase_uid = auth.uid())
);
-- Services are public readable
CREATE POLICY "services_public_read" ON services FOR SELECT USING (is_active = true);
-- Vouchers are public readable
CREATE POLICY "vouchers_public_read" ON vouchers FOR SELECT USING (is_active = true);
-- Voucher usages - users can read their own
CREATE POLICY "voucher_usages_own" ON voucher_usages FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
);
-- Therapist locations - therapists can update their own
CREATE POLICY "therapist_locations_own" ON therapist_locations FOR ALL USING (
  therapist_id IN (SELECT id FROM therapists WHERE supabase_uid = auth.uid())
);
-- Notifications own
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  OR therapist_id IN (SELECT id FROM therapists WHERE supabase_uid = auth.uid())
);
-- Transactions own
CREATE POLICY "transactions_own" ON transactions FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  OR therapist_id IN (SELECT id FROM therapists WHERE supabase_uid = auth.uid())
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO services (name, description, duration_min, base_price, sort_order, image_url) VALUES
  ('Swedish Massage', 'Relaxing full-body massage with gentle, flowing strokes. Perfect for stress relief.', 60, 150000, 1, 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400'),
  ('Deep Tissue Massage', 'Intense massage targeting deeper muscle layers. Great for chronic pain and tension.', 90, 200000, 2, 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400'),
  ('Reflexology', 'Foot and hand pressure point therapy to improve energy flow and organ function.', 60, 120000, 3, 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400'),
  ('Hot Stone Massage', 'Smooth heated stones placed on key body points to release tension and improve circulation.', 90, 250000, 4, 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400'),
  ('Aromatherapy Massage', 'Soothing massage with essential oils for deep relaxation and mood enhancement.', 75, 175000, 5, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400'),
  ('Shiatsu', 'Traditional Japanese pressure-point massage to balance energy and relieve tension.', 60, 160000, 6, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400');

INSERT INTO vouchers (code, description, category, type, value, min_order_amount, max_discount, usage_limit, valid_from, valid_until) VALUES
  ('PROMO10K', 'Diskon Langsung Rp 10.000', 'direct', 'fixed', 10000, 50000, NULL, 1000, NOW(), NOW() + INTERVAL '30 days'),
  ('NEWUSER50', 'Diskon 50% untuk User Baru', 'new_user', 'percentage', 50, 0, 30000, 500, NOW(), NOW() + INTERVAL '90 days'),
  ('REPEAT10', 'Diskon Rp 10.000 untuk Order ke-2', 'repeat_order', 'fixed', 10000, 100000, NULL, NULL, NOW(), NOW() + INTERVAL '30 days'),
  ('MIN100K', 'Diskon Rp 20.000 Min Order 100rb', 'direct', 'fixed', 20000, 100000, NULL, NULL, NOW(), NOW() + INTERVAL '30 days'),
  ('HAPPYHOUR', 'Happy Hour 20% (10:00 - 15:00)', 'happy_hour', 'percentage', 20, 0, 25000, NULL, NOW(), NOW() + INTERVAL '30 days');

UPDATE vouchers SET start_time = '10:00:00', end_time = '15:00:00', days_of_week = '{1,2,3,4,5}' WHERE code = 'HAPPYHOUR';

INSERT INTO vouchers (code, description, category, type, value, is_cashback, usage_limit, valid_from, valid_until) VALUES
  ('CASHBACK20', 'Cashback Rp 20.000 ke Wallet', 'cashback', 'fixed', 20000, true, NULL, NOW(), NOW() + INTERVAL '30 days');
