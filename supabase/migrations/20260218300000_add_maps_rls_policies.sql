-- Migration: Add RLS policies for maps table
-- Users can only access their own maps (user_id = auth.uid())

-- Policy: Users can SELECT their own maps
CREATE POLICY "Users can select own maps"
  ON maps FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can INSERT maps with their own user_id
CREATE POLICY "Users can insert own maps"
  ON maps FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can UPDATE their own maps
CREATE POLICY "Users can update own maps"
  ON maps FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can DELETE their own maps
CREATE POLICY "Users can delete own maps"
  ON maps FOR DELETE
  USING (user_id = auth.uid());
