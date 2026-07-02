-- ============================================
-- COMPLETE CLEANUP + ADMIN USER
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- 1. Nuke ALL stores and products for test vendors (clean slate)
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE store_id IN (
    SELECT id FROM stores WHERE owner_id IN (
      SELECT id FROM profiles WHERE email IN ('vendor1@test.com', 'vendor2@test.com')
    )
  )
);
DELETE FROM orders WHERE store_id IN (
  SELECT id FROM stores WHERE owner_id IN (
    SELECT id FROM profiles WHERE email IN ('vendor1@test.com', 'vendor2@test.com')
  )
);
DELETE FROM products WHERE store_id IN (
  SELECT id FROM stores WHERE owner_id IN (
    SELECT id FROM profiles WHERE email IN ('vendor1@test.com', 'vendor2@test.com')
  )
);
DELETE FROM stores WHERE owner_id IN (
  SELECT id FROM profiles WHERE email IN ('vendor1@test.com', 'vendor2@test.com')
);

-- 2. Create admin user via Supabase Auth Admin API (password: admin123)
-- First check if admin exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@test.com') THEN
    -- Create the auth user (this bypasses the trigger since we use SECURITY DEFINER)
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      is_super_admin, confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@test.com',
      crypt('admin123', gen_salt('bf')),
      now(), now(), now(),
      '{"role": "admin", "full_name": "Admin User"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false, '', ''
    );

    -- The handle_new_user trigger should create the profile, but let's make sure
    INSERT INTO profiles (id, email, full_name, role, phone, is_active)
    SELECT id, 'admin@test.com', 'Admin User', 'admin', '+216 00 000 000', true
    FROM auth.users WHERE email = 'admin@test.com'
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  END IF;
END $$;

-- 3. Make sure vendor test users exist and have proper roles
UPDATE profiles SET role = 'vendor' WHERE email = 'vendor1@test.com';
UPDATE profiles SET role = 'vendor' WHERE email = 'vendor2@test.com';

-- 4. Set role in user_metadata for all test vendors (so middleware works)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "vendor"}'::jsonb
WHERE email IN ('vendor1@test.com', 'vendor2@test.com');

-- 5. Set role in user_metadata for admin (so middleware works)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@test.com';

-- 6. Verify - show all users
SELECT p.email, p.role, au.raw_user_meta_data->>'role' as jwt_role
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.email IN ('admin@test.com', 'vendor1@test.com', 'vendor2@test.com', 'customer1@test.com');
