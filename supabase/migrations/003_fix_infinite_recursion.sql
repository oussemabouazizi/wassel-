-- Fix infinite recursion in profiles RLS policies
-- The admin policies referenced profiles table itself, causing infinite loop

-- Drop the problematic admin policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Add INSERT policy (missing)
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
