-- ============================================================
-- Minimum Initial Topup for New Therapists
-- ============================================================

-- 1. Add setting to app_settings
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS therapist_min_initial_topup DECIMAL(12,2) NOT NULL DEFAULT 0;

-- 2. Update trigger to check min initial topup before going online
CREATE OR REPLACE FUNCTION enforce_therapist_verified_for_online()
RETURNS TRIGGER AS $$
DECLARE
  v_min_topup DECIMAL(12,2);
  v_total_topup DECIMAL(12,2);
BEGIN
  IF NEW.status = 'online' THEN
    -- Check is_verified
    IF OLD.is_verified = false OR NEW.is_verified = false THEN
      NEW.status := 'offline';
      RETURN NEW;
    END IF;

    -- Check registration fee paid
    IF NEW.is_verified = true AND NEW.registration_fee_paid = false THEN
      NEW.status := 'offline';
      RETURN NEW;
    END IF;

    -- Check min initial topup (only if setting > 0)
    SELECT COALESCE(therapist_min_initial_topup, 0) INTO v_min_topup FROM app_settings LIMIT 1;
    IF v_min_topup > 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_total_topup
      FROM therapist_topups
      WHERE therapist_id = NEW.id AND status = 'completed';

      IF v_total_topup < v_min_topup THEN
        NEW.status := 'offline';
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Comment
COMMENT ON COLUMN app_settings.therapist_min_initial_topup IS 'Minimal total topup yang harus dipenuhi akun baru sebelum bisa online. 0 = nonaktif.';
