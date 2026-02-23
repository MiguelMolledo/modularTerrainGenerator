-- RLS policies for profiles table
-- Users can SELECT their own profile, admins can SELECT/UPDATE all profiles

-- Policy: Users can read their own profile
CREATE POLICY "Users can select own profile"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy: Admins can read all profiles
CREATE POLICY "Admins can select all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy: Admins can update all profiles (e.g., ban/unban, change roles)
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
