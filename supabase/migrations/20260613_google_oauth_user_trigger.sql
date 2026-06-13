-- 1. Make the phone column nullable in the public.users table.
-- This is crucial because Google OAuth registrations do not provide a phone number initially.
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;

-- 2. Create the trigger function to automatically copy new auth.users records into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (supabase_uid, full_name, email, avatar_url, role, wallet_balance, total_orders)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'user',
    0.00,
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger to execute the function on auth.users inserts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
