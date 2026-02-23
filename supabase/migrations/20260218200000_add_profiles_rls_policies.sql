-- RLS policies for profiles table
-- Users can SELECT their own profile
-- Admins manage users via Supabase Studio (service_role key)

-- Policy: Users can read their own profile
CREATE POLICY "Users can select own profile"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy: Users can update their own profile (display_name, avatar only)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Note: Admin operations (ban/unban, role changes) should be done via Supabase Studio
-- or using the service_role key to avoid RLS recursion issues
