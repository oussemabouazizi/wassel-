-- Fix 1: Delivery persons can SEE available (unassigned, ready) orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delivery can view available orders' AND tablename = 'orders') THEN
    CREATE POLICY "Delivery can view available orders" ON orders
      FOR SELECT
      USING (status = 'ready' AND delivery_person_id IS NULL);
  END IF;
END $$;

-- Fix 2: Delivery persons can ACCEPT and UPDATE orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delivery can update orders' AND tablename = 'orders') THEN
    CREATE POLICY "Delivery can update orders" ON orders
      FOR UPDATE
      USING (
        delivery_person_id = auth.uid()
        OR (status = 'ready' AND delivery_person_id IS NULL)
      );
  END IF;
END $$;

-- Fix 3: Vendors can UPDATE their store orders (was missing!)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can update store orders' AND tablename = 'orders') THEN
    CREATE POLICY "Vendors can update store orders" ON orders
      FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid())
      );
  END IF;
END $$;

-- Fix 4: Delivery persons can SEE order_items for their assigned orders AND for available orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'order_items_select_delivery' AND tablename = 'order_items') THEN
    CREATE POLICY order_items_select_delivery ON order_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND (
            orders.delivery_person_id = auth.uid()
            OR (orders.status = 'ready' AND orders.delivery_person_id IS NULL)
          )
        )
      );
  END IF;
END $$;

-- Fix 5: Ensure all vendor stores have status = 'approved'
UPDATE stores SET status = 'approved'
WHERE owner_id IN (
  SELECT id FROM profiles WHERE email IN ('vendor1@test.com', 'vendor2@test.com')
);

-- Fix 6: Clean up extra/duplicate stores for test vendors
DELETE FROM stores
WHERE owner_id IN (SELECT id FROM profiles WHERE email IN ('vendor1@test.com', 'vendor2@test.com'))
AND name NOT IN ('Tunis Kitchen', 'Fresh Market', 'Pizza Napoli');
