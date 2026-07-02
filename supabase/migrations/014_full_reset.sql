-- ============================================
-- COMPLETE RESET: cleanup + admin + stores + products
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- 1. CLEANUP: Delete ALL existing stores/products/orders for test vendors
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE store_id IN (
    SELECT id FROM stores WHERE owner_id IN (
      SELECT id FROM profiles WHERE email IN ('vendor1@test.com', 'vendor2@test.com')
    )
  )
);
DELETE FROM chats WHERE order_id IN (
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

-- 2. CREATE ADMIN USER
DO $$
DECLARE
  admin_uuid UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@test.com') THEN
    admin_uuid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      is_super_admin, confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uuid, 'authenticated', 'authenticated',
      'admin@test.com', crypt('admin123', gen_salt('bf')),
      now(), now(), now(),
      '{"role": "admin", "full_name": "Admin User"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false, '', ''
    );
    INSERT INTO profiles (id, email, full_name, role, phone, is_active)
    VALUES (admin_uuid, 'admin@test.com', 'Admin User', 'admin', '+216 00 000 000', true)
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  END IF;
END $$;

-- Fix vendor JWT metadata
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "vendor"}'::jsonb
WHERE email IN ('vendor1@test.com', 'vendor2@test.com');
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@test.com';

-- 3. CREATE STORES + PRODUCTS
DO $$
DECLARE
  v1_id UUID;
  v2_id UUID;
  food_cat UUID;
  grocery_cat UUID;
  store1_id UUID;
  store2_id UUID;
BEGIN
  SELECT id INTO v1_id FROM profiles WHERE email = 'vendor1@test.com';
  SELECT id INTO v2_id FROM profiles WHERE email = 'vendor2@test.com';
  SELECT id INTO food_cat FROM categories WHERE name = 'Food';
  SELECT id INTO grocery_cat FROM categories WHERE name = 'Groceries';

  IF v1_id IS NULL OR v2_id IS NULL THEN
    RAISE NOTICE 'Vendor profiles not found. Make sure vendor1@test.com and vendor2@test.com exist.';
    RETURN;
  END IF;

  IF food_cat IS NULL THEN
    RAISE NOTICE 'Categories not found. Make sure categories table has data.';
    RETURN;
  END IF;

  -- ===========================
  -- VENDOR 1: Tunis Kitchen (Food)
  -- ===========================
  INSERT INTO stores (
    owner_id, name, description, category_id, address,
    latitude, longitude, image_url, cover_url,
    is_open, status, rating, total_orders,
    delivery_fee, estimated_delivery_time, min_order
  ) VALUES (
    v1_id,
    'Tunis Kitchen',
    'Authentic Tunisian cuisine with a modern twist. Fresh ingredients, traditional recipes passed down through generations.',
    food_cat,
    'Avenue Habib Bourguiba, Tunis',
    36.8065, 10.1815,
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
    true, 'approved', 4.5, 150,
    5.00, 30, 10.00
  ) RETURNING id INTO store1_id;

  -- VENDOR 1 PRODUCTS
  INSERT INTO products (store_id, category_id, name, description, price, image_url, stock, is_available, is_featured, preparation_time) VALUES
    (store1_id, food_cat, 'Couscous Royal', 'Traditional Tunisian couscous with lamb, chickpeas, and vegetables', 22.00, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400', 50, true, true, 25),
    (store1_id, food_cat, 'Brik a l''Oeuf', 'Crispy pastry filled with egg, tuna, capers, and parsley', 8.50, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400', 30, true, true, 10),
    (store1_id, food_cat, 'Lablabi', 'Chickpea soup with garlic, cumin, and olive oil served with bread', 6.00, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', 40, true, false, 15),
    (store1_id, food_cat, 'Mechouia Salad', 'Grilled pepper and tomato salad with olive oil and garlic', 7.50, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400', 25, true, false, 10),
    (store1_id, food_cat, 'Ojja Merguez', 'Spicy tomato and egg dish with merguez sausage', 15.00, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400', 20, true, true, 20),
    (store1_id, food_cat, 'Makroudh (6 pcs)', 'Semolina pastry filled with dates and honey', 10.00, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', 35, true, true, 5),
    (store1_id, food_cat, 'Orange Juice Fresh', 'Freshly squeezed Tunisian orange juice', 5.00, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', 100, true, false, 5),
    (store1_id, food_cat, 'Tajine Jelbana', 'Slow-cooked lamb with peas, carrots, and potatoes', 18.00, 'https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=400', 15, true, false, 30);

  -- ===========================
  -- VENDOR 2: TechStore Tunisia (Electronics)
  -- ===========================
  IF grocery_cat IS NULL THEN
    grocery_cat := food_cat;
  END IF;

  INSERT INTO stores (
    owner_id, name, description, category_id, address,
    latitude, longitude, image_url, cover_url,
    is_open, status, rating, total_orders,
    delivery_fee, estimated_delivery_time, min_order
  ) VALUES (
    v2_id,
    'TechStore Tunisia',
    'Latest electronics, gadgets, and accessories. Fast delivery across Tunisia.',
    (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1),
    'Rue de la Liberte, Ariana',
    36.8625, 10.1656,
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600',
    true, 'approved', 4.3, 85,
    3.00, 25, 15.00
  ) RETURNING id INTO store2_id;

  -- VENDOR 2 PRODUCTS
  INSERT INTO products (store_id, category_id, name, description, price, image_url, stock, is_available, is_featured, preparation_time) VALUES
    (store2_id, (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Wireless Earbuds Pro', 'Noise-cancelling Bluetooth earbuds with 30h battery', 89.90, 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400', 40, true, true, 5),
    (store2_id, (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Phone Case Premium', 'Shockproof premium case for iPhone 15 Pro', 25.00, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400', 100, true, false, 5),
    (store2_id, (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'USB-C Charging Cable', 'Fast charging braided cable 2m', 15.00, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', 200, true, false, 5),
    (store2_id, (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Power Bank 20000mAh', 'Portable charger with dual USB output', 55.00, 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400', 60, true, true, 5),
    (store2_id, (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Bluetooth Speaker Mini', 'Waterproof portable speaker with deep bass', 45.00, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', 35, true, true, 5),
    (store2_id, (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Webcam HD 1080p', 'Full HD webcam with built-in microphone', 75.00, 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400', 25, true, false, 5),
    (store2_id, (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Laptop Stand Adjustable', 'Ergonomic aluminum laptop stand', 40.00, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 30, true, false, 5),
    (store2_id, (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1), 'Wireless Mouse', 'Ergonomic silent-click wireless mouse', 20.00, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400', 80, true, false, 5);

  RAISE NOTICE 'Done! Created stores: % and %', store1_id, store2_id;
END $$;

-- 4. VERIFY
SELECT s.name, s.status, p.email as owner
FROM stores s
JOIN profiles p ON p.id = s.owner_id
WHERE p.email IN ('vendor1@test.com', 'vendor2@test.com');
