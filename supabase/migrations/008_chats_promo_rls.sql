-- Chats INSERT: allow delivery person to create chat on accept
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'chats_insert_delivery' AND tablename = 'chats'
  ) THEN
    CREATE POLICY chats_insert_delivery ON chats
      FOR INSERT
      WITH CHECK (
        delivery_person_id = auth.uid()
      );
  END IF;
END $$;

-- Promo codes: enable RLS + allow customers to view active codes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'promo_codes_select_active' AND tablename = 'promo_codes'
  ) THEN
    ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY promo_codes_select_active ON promo_codes
      FOR SELECT
      USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
  END IF;
END $$;
