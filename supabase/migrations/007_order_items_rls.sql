-- Allow authenticated users to insert order items for their own orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'order_items_insert_own' AND tablename = 'order_items'
  ) THEN
    CREATE POLICY order_items_insert_own ON order_items
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.customer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow users to view order items for their own orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'order_items_select_own' AND tablename = 'order_items'
  ) THEN
    CREATE POLICY order_items_select_own ON order_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND orders.customer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow vendors to view order items for their store's orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'order_items_select_vendor' AND tablename = 'order_items'
  ) THEN
    CREATE POLICY order_items_select_vendor ON order_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM orders
          JOIN stores ON stores.id = orders.store_id
          WHERE orders.id = order_items.order_id
          AND stores.owner_id = auth.uid()
        )
      );
  END IF;
END $$;
