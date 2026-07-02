-- Allow vendors to see customer profiles for their orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_vendor_sees_customers' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY profiles_vendor_sees_customers ON profiles
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.customer_id = profiles.id
          AND EXISTS (
            SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Allow customers to see delivery person profiles for their orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_customer_sees_delivery' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY profiles_customer_sees_delivery ON profiles
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.delivery_person_id = profiles.id
          AND orders.customer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow delivery persons to see customer profiles for their assigned orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_delivery_sees_customers' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY profiles_delivery_sees_customers ON profiles
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.customer_id = profiles.id
          AND orders.delivery_person_id = auth.uid()
        )
      );
  END IF;
END $$;
