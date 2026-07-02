-- =============================================
-- FIX CATEGORIES + CREATE STORES & PRODUCTS
-- for vendor1@test.com and vendor2@test.com
-- =============================================

-- 1. Ensure categories exist (insert if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories LIMIT 1) THEN
    INSERT INTO categories (name, name_ar, name_fr, icon, image_url, sort_order) VALUES
      ('Food', 'طعام', 'Nourriture', 'utensils', '/images/categories/food.jpg', 1),
      ('Groceries', 'بقالة', 'Épicerie', 'shopping-cart', '/images/categories/groceries.jpg', 2),
      ('Pharmacy', 'صيدلية', 'Pharmacie', 'pill', '/images/categories/pharmacy.jpg', 3),
      ('Flowers', 'ورود', 'Fleurs', 'flower-2', '/images/categories/flowers.jpg', 4),
      ('Pets', 'حيوانات أليفة', 'Animaux', 'paw-print', '/images/categories/pets.jpg', 5),
      ('Electronics', 'إلكترونيات', 'Électronique', 'laptop', '/images/categories/electronics.jpg', 6),
      ('Fashion', 'أزياء', 'Mode', 'shirt', '/images/categories/fashion.jpg', 7),
      ('Sports', 'رياضة', 'Sport', 'dumbbell', '/images/categories/sports.jpg', 8),
      ('Baby', 'أطفال', 'Bébé', 'baby', '/images/categories/baby.jpg', 9),
      ('Stationery', 'قرطاسية', 'Papeterie', 'pen-tool', '/images/categories/stationery.jpg', 10);
  END IF;
END $$;

-- 2. Get vendor IDs
DO $$
DECLARE
  v1_id UUID;
  v2_id UUID;
  food_cat UUID;
  grocery_cat UUID;
  store1_id UUID;
  store2_id UUID;
  store3_id UUID;
BEGIN
  SELECT id INTO v1_id FROM profiles WHERE email = 'vendor1@test.com';
  SELECT id INTO v2_id FROM profiles WHERE email = 'vendor2@test.com';
  SELECT id INTO food_cat FROM categories WHERE name = 'Food';
  SELECT id INTO grocery_cat FROM categories WHERE name = 'Groceries';

  -- Delete any existing stores for these vendors (fresh start)
  DELETE FROM products WHERE store_id IN (
    SELECT id FROM stores WHERE owner_id IN (v1_id, v2_id)
  );
  DELETE FROM stores WHERE owner_id IN (v1_id, v2_id);

  -- =============================================
  -- VENDOR 1: Tunis Kitchen (Food)
  -- =============================================
  INSERT INTO stores (
    owner_id, name, description, category_id, address, latitude, longitude,
    image_url, logo_url, is_open, is_approved, rating, total_orders,
    delivery_fee, estimated_delivery_time, min_order
  ) VALUES (
    v1_id,
    'Tunis Kitchen',
    'Authentic Tunisian cuisine with a modern twist. Fresh ingredients, traditional recipes.',
    food_cat,
    'Avenue Habib Bourguiba, Tunis',
    36.8065,
    10.1815,
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    true,
    true,
    4.5,
    150,
    5.00,
    30,
    10.00
  ) RETURNING id INTO store1_id;

  -- =============================================
  -- VENDOR 2: Fresh Market (Groceries)
  -- =============================================
  INSERT INTO stores (
    owner_id, name, description, category_id, address, latitude, longitude,
    image_url, logo_url, is_open, is_approved, rating, total_orders,
    delivery_fee, estimated_delivery_time, min_order
  ) VALUES (
    v2_id,
    'Fresh Market',
    'Fresh groceries delivered to your door. Fruits, vegetables, dairy, and more.',
    grocery_cat,
    'Rue de la Liberte, Ariana',
    36.8625,
    10.1656,
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    true,
    true,
    4.3,
    85,
    3.00,
    25,
    15.00
  ) RETURNING id INTO store2_id;

  -- Vendor 2 second store: Pizza Place (Food)
  INSERT INTO stores (
    owner_id, name, description, category_id, address, latitude, longitude,
    image_url, logo_url, is_open, is_approved, rating, total_orders,
    delivery_fee, estimated_delivery_time, min_order
  ) VALUES (
    v2_id,
    'Pizza Napoli',
    'Best pizza in town. Wood-fired oven, fresh dough, premium toppings.',
    food_cat,
    'Centre Ville, Sfax',
    34.7406,
    10.7603,
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200',
    true,
    true,
    4.7,
    200,
    4.00,
    35,
    8.00
  ) RETURNING id INTO store3_id;

  -- =============================================
  -- PRODUCTS FOR STORE 1: Tunis Kitchen
  -- =============================================
  INSERT INTO products (store_id, category_id, name, description, price, image_url, stock, is_available, is_featured, preparation_time) VALUES
    (store1_id, food_cat, 'Couscous Royal', 'Traditional Tunisian couscous with lamb, chickpeas, and vegetables', 22.00, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400', 50, true, true, 25),
    (store1_id, food_cat, 'Brik a l''Oeuf', 'Crispy pastry filled with egg, tuna, capers, and parsley', 8.50, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400', 30, true, true, 10),
    (store1_id, food_cat, 'Lablabi', 'Chickpea soup with garlic, cumin, and olive oil served with bread', 6.00, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', 40, true, false, 15),
    (store1_id, food_cat, 'Mechouia Salad', 'Grilled pepper and tomato salad with olive oil and garlic', 7.50, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400', 25, true, false, 10),
    (store1_id, food_cat, 'Ojja Merguez', 'Spicy tomato and egg dish with merguez sausage', 15.00, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400', 20, true, true, 20),
    (store1_id, food_cat, 'Tajine Jelbana', 'Slow-cooked lamb with peas, carrots, and potatoes', 18.00, 'https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=400', 15, true, false, 30),
    (store1_id, food_cat, 'Makroudh (6 pcs)', 'Semolina pastry filled with dates and honey', 10.00, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', 35, true, true, 5),
    (store1_id, food_cat, 'Orange Juice Fresh', 'Freshly squeezed Tunisian orange juice', 5.00, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', 100, true, false, 5);

  -- =============================================
  -- PRODUCTS FOR STORE 2: Fresh Market
  -- =============================================
  INSERT INTO products (store_id, category_id, name, description, price, image_url, stock, is_available, is_featured, preparation_time) VALUES
    (store2_id, grocery_cat, 'Bananas (1 kg)', 'Fresh ripe bananas, sourced locally', 4.50, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', 100, true, true, 5),
    (store2_id, grocery_cat, 'Tomatoes (1 kg)', 'Vine-ripened fresh tomatoes', 5.00, 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400', 80, true, true, 5),
    (store2_id, grocery_cat, 'Olive Oil (500ml)', 'Extra virgin olive oil from Kairouan', 18.00, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 40, true, true, 5),
    (store2_id, grocery_cat, 'Milk (1L)', 'Fresh whole milk', 3.50, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', 60, true, false, 5),
    (store2_id, grocery_cat, 'Bread (Loaf)', 'Freshly baked French bread', 2.00, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 100, true, false, 5),
    (store2_id, grocery_cat, 'Chicken Breast (1 kg)', 'Fresh boneless chicken breast', 14.00, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400', 30, true, true, 5),
    (store2_id, grocery_cat, 'Eggs (12 pack)', 'Free-range large eggs', 7.50, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', 50, true, false, 5),
    (store2_id, grocery_cat, 'Apples (1 kg)', 'Crisp red apples', 6.00, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', 70, true, false, 5),
    (store2_id, grocery_cat, 'Rice (1 kg)', 'Premium long grain basmati rice', 8.00, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 60, true, false, 5),
    (store2_id, grocery_cat, 'Yogurt (500g)', 'Greek-style natural yogurt', 5.50, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 45, true, false, 5);

  -- =============================================
  -- PRODUCTS FOR STORE 3: Pizza Napoli
  -- =============================================
  INSERT INTO products (store_id, category_id, name, description, price, image_url, stock, is_available, is_featured, preparation_time) VALUES
    (store3_id, food_cat, 'Margherita', 'Classic tomato sauce, mozzarella, and fresh basil', 14.00, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', 50, true, true, 20),
    (store3_id, food_cat, 'Pepperoni', 'Tomato sauce, mozzarella, and spicy pepperoni', 16.00, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', 40, true, true, 20),
    (store3_id, food_cat, 'Four Cheese', 'Mozzarella, gorgonzola, parmesan, and emmental', 18.00, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', 30, true, false, 20),
    (store3_id, food_cat, 'Veggie Supreme', 'Bell peppers, mushrooms, olives, onions, and tomatoes', 15.00, 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400', 35, true, false, 20),
    (store3_id, food_cat, 'Tuna Pizza', 'Tomato sauce, mozzarella, canned tuna, and capers', 16.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', 25, true, false, 20),
    (store3_id, food_cat, 'Garlic Bread (4 pcs)', 'Toasted bread with garlic butter and herbs', 6.00, 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400', 40, true, false, 10),
    (store3_id, food_cat, 'Caesar Salad', 'Romaine lettuce, croutons, parmesan, and caesar dressing', 12.00, 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400', 30, true, false, 10),
    (store3_id, food_cat, 'Coca-Cola (330ml)', 'Classic Coca-Cola can', 3.00, 'https://images.unsplash.com/photo-1629203851122-3710db9e2e80?w=400', 200, true, false, 1);

END $$;
