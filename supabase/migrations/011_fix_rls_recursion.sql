-- Fix infinite recursion: use JWT role instead of profiles table for admin checks

-- Drop the recursive admin policies
DROP POLICY IF EXISTS "Admins can manage all stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;

-- Recreate admin policies using JWT (no subquery = no recursion)
CREATE POLICY "Admins can manage all stores" ON stores
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');
