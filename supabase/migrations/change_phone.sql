-- ============================================================
-- Ganti Nomor Telepon di Supabase Auth + Profile Table
-- ============================================================
-- Jalankan di Supabase Dashboard -> SQL Editor
-- Ganti nilai VARIABEL di bawah sesuai kebutuhan

DO $$
DECLARE
  -- >>> VARIABEL - ganti sesuai kebutuhan <<<
  v_old_phone  TEXT := '+62812xxxxxxx';   -- Nomor LAMA
  v_new_phone  TEXT := '+62813xxxxxxx';   -- Nomor BARU (lengkap dengan +62)
  v_role       TEXT := 'user';            -- 'user' atau 'therapist'
  v_target_id  UUID;

BEGIN
  -- 1. Cari user di profile table
  IF v_role = 'therapist' THEN
    SELECT id INTO v_target_id FROM therapists WHERE phone = v_old_phone;
  ELSE
    SELECT id INTO v_target_id FROM users WHERE phone = v_old_phone;
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'User dengan nomor % tidak ditemukan di tabel %s', v_old_phone, v_role;
  END IF;

  -- 2. Update phone di profile table
  IF v_role = 'therapist' THEN
    UPDATE therapists SET phone = v_new_phone, updated_at = NOW() WHERE id = v_target_id;
  ELSE
    UPDATE users SET phone = v_new_phone, updated_at = NOW() WHERE id = v_target_id;
  END IF;

  RAISE NOTICE 'Profile updated: % -> %', v_old_phone, v_new_phone;

  -- 3. Update phone di Supabase Auth (auth.users)
  UPDATE auth.users
  SET phone = v_new_phone,
      updated_at = NOW()
  WHERE phone = v_old_phone;

  IF NOT FOUND THEN
    RAISE WARNING 'Nomor % tidak ditemukan di auth.users (mungkin beda format)', v_old_phone;
  ELSE
    RAISE NOTICE 'Auth users updated: % -> %', v_old_phone, v_new_phone;
  END IF;

END $$;


-- ============================================================
-- Verifikasi hasil
-- ============================================================
-- SELECT id, phone, full_name FROM users WHERE phone LIKE '+62813%';
-- SELECT id, phone, email FROM auth.users WHERE phone LIKE '+62813%';
