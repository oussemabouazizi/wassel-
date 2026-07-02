-- Admin DELETE on products and order_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all products' AND tablename = 'products') THEN
    CREATE POLICY "Admins can manage all products" ON products
      FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all order_items' AND tablename = 'order_items') THEN
    CREATE POLICY "Admins can manage all order_items" ON order_items
      FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
  END IF;
END $$;

-- Delete ALL old orders, chats, messages, reviews, notifications
DELETE FROM order_items;
DELETE FROM chats;
DELETE FROM messages;
DELETE FROM reviews;
DELETE FROM notifications;
DELETE FROM favorites;
DELETE FROM orders;

-- Delete ALL products from old/fake stores (keep only Tunis Kitchen + TechStore)
DELETE FROM products WHERE store_id NOT IN (
  SELECT id FROM stores WHERE name IN ('Tunis Kitchen', 'TechStore Tunisia')
);

-- Delete ALL stores except the 2 seed stores
DELETE FROM stores WHERE name NOT IN ('Tunis Kitchen', 'TechStore Tunisia');
