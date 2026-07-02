-- Fix delivery_persons RLS: No policies existed, so all browser queries return 406

-- 1. Enable RLS (safety net)
ALTER TABLE delivery_persons ENABLE ROW LEVEL SECURITY;

-- 2. Delivery persons can read their own row
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delivery persons read own' AND tablename = 'delivery_persons') THEN
    CREATE POLICY "Delivery persons read own" ON delivery_persons
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. Delivery persons can update their own row (online_status, location, earnings)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delivery persons update own' AND tablename = 'delivery_persons') THEN
    CREATE POLICY "Delivery persons update own" ON delivery_persons
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- 4. Delivery persons can INSERT their own row (registration)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delivery persons insert own' AND tablename = 'delivery_persons') THEN
    CREATE POLICY "Delivery persons insert own" ON delivery_persons
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 5. Admins can read ALL delivery persons
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins read all delivery persons' AND tablename = 'delivery_persons') THEN
    CREATE POLICY "Admins read all delivery persons" ON delivery_persons
      FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- 6. Admins can update ALL delivery persons
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins update all delivery persons' AND tablename = 'delivery_persons') THEN
    CREATE POLICY "Admins update all delivery persons" ON delivery_persons
      FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- 7. Any authenticated user can read delivery persons (for vendor delivery page, tracking, etc.)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users read delivery persons' AND tablename = 'delivery_persons') THEN
    CREATE POLICY "Auth users read delivery persons" ON delivery_persons
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 8. Auto-create delivery_persons row for existing users with role='delivery' who don't have one
INSERT INTO delivery_persons (user_id, vehicle_type, vehicle_plate, id_document_url, license_document_url, status, online_status)
SELECT id, 'bike', 'PENDING', 'pending', 'pending', 'approved', 'offline'
FROM profiles
WHERE role = 'delivery'
AND id NOT IN (SELECT user_id FROM delivery_persons);
