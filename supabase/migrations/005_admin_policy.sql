-- Allow admins to view all profiles (using JWT role, safe from recursion)
DROP POLICY IF EXISTS admin_view_all_profiles ON profiles;
CREATE POLICY admin_view_all_profiles ON profiles
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
