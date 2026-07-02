-- Create a function to send notifications (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data, is_read)
  VALUES (p_user_id, p_title, p_message, p_type, p_data, false);
END;
$$;

-- Allow any authenticated user to call it
GRANT EXECUTE ON FUNCTION send_notification TO authenticated;
