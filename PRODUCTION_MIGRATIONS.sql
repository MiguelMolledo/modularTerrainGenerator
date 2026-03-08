-- =============================================
-- PRODUCTION MIGRATIONS - Modular Terrain Creator
-- =============================================
-- Execute this in Supabase Dashboard → SQL Editor
-- Project: zgvteidzhuysujeuampp
-- =============================================

-- MIGRATION 1: Create maps table
-- File: 20260124231430_create_maps_table.sql
-- =============================================

-- Create maps table for storing terrain maps
CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  map_width INTEGER NOT NULL DEFAULT 72,
  map_height INTEGER NOT NULL DEFAULT 45,
  levels INTEGER[] NOT NULL DEFAULT ARRAY[-1, 0, 1, 2],
  placed_pieces JSONB NOT NULL DEFAULT '[]',
  grid_config JSONB,
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (allowing all for local dev)
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for local development)
CREATE POLICY "Allow all operations" ON maps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create an index on updated_at for faster sorting
CREATE INDEX idx_maps_updated_at ON maps(updated_at DESC);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_maps_updated_at
  BEFORE UPDATE ON maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- MIGRATION 2: Create inventory tables
-- File: 20260124233534_create_inventory_tables.sql
-- =============================================

-- Base shapes pool (master list of piece shapes)
CREATE TABLE piece_shapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shape_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  width DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  is_diagonal BOOLEAN NOT NULL DEFAULT false,
  default_rotation INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default shapes
INSERT INTO piece_shapes (shape_key, name, width, height, is_diagonal, default_rotation, display_order) VALUES
  ('3x3', '3" x 3"', 3, 3, false, 0, 1),
  ('6x6', '6" x 6"', 6, 6, false, 0, 2),
  ('3x6', '3" x 6"', 3, 6, false, 0, 3),
  ('6x3', '6" x 3"', 6, 3, false, 0, 4),
  ('3x1.5', '3" x 1.5"', 3, 1.5, false, 0, 5),
  ('1.5x3', '1.5" x 3"', 1.5, 3, false, 0, 6),
  ('6x1.5', '6" x 1.5"', 6, 1.5, false, 0, 7),
  ('1.5x6', '1.5" x 6"', 1.5, 6, false, 0, 8),
  ('diagonal-tl', 'Triangle TL', 3, 3, true, 0, 9),
  ('diagonal-tr', 'Triangle TR', 3, 3, true, 90, 10),
  ('diagonal-br', 'Triangle BR', 3, 3, true, 180, 11),
  ('diagonal-bl', 'Triangle BL', 3, 3, true, 270, 12);

-- Custom terrain types
CREATE TABLE terrain_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#888888',
  icon TEXT NOT NULL DEFAULT '🗺️',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default terrain types
INSERT INTO terrain_types (slug, name, color, icon, is_default, display_order) VALUES
  ('desert', 'Desert', '#E5C07B', '🏜️', true, 1),
  ('forest', 'Forest', '#98C379', '🌲', true, 2),
  ('arid', 'Arid', '#D19A66', '🏔️', true, 3),
  ('water', 'Water', '#61AFEF', '🌊', true, 4),
  ('swamp', 'Swamp', '#56B6C2', '🐊', true, 5),
  ('lava', 'Lava', '#E06C75', '🌋', true, 6);

-- Terrain pieces (which shapes each terrain uses + quantity)
CREATE TABLE terrain_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terrain_type_id UUID NOT NULL REFERENCES terrain_types(id) ON DELETE CASCADE,
  shape_id UUID NOT NULL REFERENCES piece_shapes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(terrain_type_id, shape_id)
);

-- 3D objects per terrain
CREATE TABLE terrain_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terrain_type_id UUID NOT NULL REFERENCES terrain_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  depth DECIMAL(5,2) NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📦',
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE piece_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain_objects ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for local dev)
CREATE POLICY "Allow all on piece_shapes" ON piece_shapes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on terrain_types" ON terrain_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on terrain_pieces" ON terrain_pieces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on terrain_objects" ON terrain_objects FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_terrain_pieces_terrain ON terrain_pieces(terrain_type_id);
CREATE INDEX idx_terrain_objects_terrain ON terrain_objects(terrain_type_id);
CREATE INDEX idx_terrain_types_slug ON terrain_types(slug);

-- Triggers for updated_at
CREATE TRIGGER update_terrain_types_updated_at BEFORE UPDATE ON terrain_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terrain_pieces_updated_at BEFORE UPDATE ON terrain_pieces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terrain_objects_updated_at BEFORE UPDATE ON terrain_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default pieces for each terrain (10 of each base shape)
INSERT INTO terrain_pieces (terrain_type_id, shape_id, quantity)
SELECT t.id, s.id, 10
FROM terrain_types t
CROSS JOIN piece_shapes s
WHERE t.is_default = true;


-- =============================================
-- MIGRATION 3: Add custom thumbnail
-- File: 20260125013100_add_custom_thumbnail.sql
-- =============================================

ALTER TABLE maps ADD COLUMN IF NOT EXISTS is_custom_thumbnail BOOLEAN DEFAULT false;


-- =============================================
-- MIGRATION 4: Add snapshot
-- File: 20260125014500_add_snapshot.sql
-- =============================================

-- Add snapshot field (always auto-generated) separate from custom thumbnail
ALTER TABLE maps ADD COLUMN IF NOT EXISTS snapshot TEXT;

-- Migrate existing data: if is_custom_thumbnail is false, copy thumbnail to snapshot
UPDATE maps SET snapshot = thumbnail WHERE is_custom_thumbnail = false AND thumbnail IS NOT NULL;

-- If is_custom_thumbnail is true, keep thumbnail as custom and snapshot as null (will be generated on next save)


-- =============================================
-- MIGRATION 5: Create custom pieces
-- File: 20260125020000_create_custom_pieces.sql
-- =============================================

-- Custom pieces table for user-defined terrain pieces
CREATE TABLE custom_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  width DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  is_split BOOLEAN NOT NULL DEFAULT false,
  split_direction TEXT CHECK (split_direction IN ('horizontal', 'vertical')),
  primary_terrain_type_id UUID NOT NULL REFERENCES terrain_types(id) ON DELETE CASCADE,
  secondary_terrain_type_id UUID REFERENCES terrain_types(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE custom_pieces ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user app)
CREATE POLICY "Allow all on custom_pieces" ON custom_pieces FOR ALL USING (true) WITH CHECK (true);

-- Index for efficient querying
CREATE INDEX idx_custom_pieces_primary_terrain ON custom_pieces(primary_terrain_type_id);

-- Validation constraints
ALTER TABLE custom_pieces ADD CONSTRAINT custom_pieces_width_check CHECK (width >= 0.5 AND width <= 24);
ALTER TABLE custom_pieces ADD CONSTRAINT custom_pieces_height_check CHECK (height >= 0.5 AND height <= 24);
ALTER TABLE custom_pieces ADD CONSTRAINT custom_pieces_quantity_check CHECK (quantity >= 0);

-- Split validation: if is_split is true, split_direction and secondary_terrain must be set
ALTER TABLE custom_pieces ADD CONSTRAINT custom_pieces_split_check
  CHECK (
    (is_split = false) OR
    (is_split = true AND split_direction IS NOT NULL AND secondary_terrain_type_id IS NOT NULL)
  );


-- =============================================
-- MIGRATION 6: Create piece templates
-- File: 20260125030000_create_piece_templates.sql
-- =============================================

-- User-defined piece templates
CREATE TABLE piece_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '📦',
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template pieces (which shapes and quantities each template includes)
CREATE TABLE piece_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES piece_templates(id) ON DELETE CASCADE,
  shape_id UUID NOT NULL REFERENCES piece_shapes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(template_id, shape_id)
);

-- Enable Row Level Security
ALTER TABLE piece_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE piece_template_items ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for local dev)
CREATE POLICY "Allow all on piece_templates" ON piece_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on piece_template_items" ON piece_template_items FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_piece_template_items_template ON piece_template_items(template_id);

-- Trigger for updated_at
CREATE TRIGGER update_piece_templates_updated_at BEFORE UPDATE ON piece_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default templates
INSERT INTO piece_templates (name, description, icon, is_default, display_order) VALUES
  ('Empty', 'No pieces - add them manually', '📭', true, 0),
  ('Starter Set', 'Basic pieces to get started', '🎯', true, 1),
  ('Standard Set', 'Common pieces for most builds', '📦', true, 2),
  ('Full Set', 'All pieces with generous quantities', '🎁', true, 3),
  ('Diagonals Only', 'Just triangular pieces', '📐', true, 4),
  ('Strip Pieces', 'Thin pieces for borders', '📏', true, 5),
  ('Squares Only', 'Just square pieces', '⬛', true, 6);

-- Seed template items for each default template
-- Starter Set
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 4
    WHEN '6x6' THEN 2
    WHEN '3x6' THEN 2
    WHEN '6x3' THEN 2
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Starter Set'
  AND s.shape_key IN ('3x3', '6x6', '3x6', '6x3');

-- Standard Set
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 6
    WHEN '6x6' THEN 4
    WHEN '3x6' THEN 4
    WHEN '6x3' THEN 4
    WHEN '3x1.5' THEN 4
    WHEN '1.5x3' THEN 4
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Standard Set'
  AND s.shape_key IN ('3x3', '6x6', '3x6', '6x3', '3x1.5', '1.5x3');

-- Full Set
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 10
    WHEN '6x6' THEN 4
    WHEN '3x6' THEN 5
    WHEN '6x3' THEN 5
    WHEN '3x1.5' THEN 8
    WHEN '1.5x3' THEN 8
    WHEN '6x1.5' THEN 4
    WHEN '1.5x6' THEN 4
    WHEN 'diagonal-tl' THEN 4
    WHEN 'diagonal-tr' THEN 4
    WHEN 'diagonal-br' THEN 4
    WHEN 'diagonal-bl' THEN 4
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Full Set';

-- Diagonals Only
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id, 6
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Diagonals Only'
  AND s.shape_key IN ('diagonal-tl', 'diagonal-tr', 'diagonal-br', 'diagonal-bl');

-- Strip Pieces
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x1.5' THEN 8
    WHEN '1.5x3' THEN 8
    WHEN '6x1.5' THEN 6
    WHEN '1.5x6' THEN 6
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Strip Pieces'
  AND s.shape_key IN ('3x1.5', '1.5x3', '6x1.5', '1.5x6');

-- Squares Only
INSERT INTO piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 12
    WHEN '6x6' THEN 6
    ELSE 0
  END
FROM piece_templates t
CROSS JOIN piece_shapes s
WHERE t.name = 'Squares Only'
  AND s.shape_key IN ('3x3', '6x6');


-- =============================================
-- MIGRATION 7: Custom pieces grid colors
-- File: 20260125040000_custom_pieces_grid_colors.sql
-- =============================================

-- Step 1: Add new column
ALTER TABLE custom_pieces
ADD COLUMN cell_colors JSONB;

-- Step 2: Migrate existing data
-- Convert split pieces to grid format
UPDATE custom_pieces
SET cell_colors = CASE
  -- Non-split pieces: single cell with primary terrain
  WHEN NOT is_split THEN
    jsonb_build_array(jsonb_build_array(primary_terrain_type_id::text))
  -- Horizontal split: 2 rows, 1 column each
  WHEN split_direction = 'horizontal' THEN
    jsonb_build_array(
      jsonb_build_array(primary_terrain_type_id::text),
      jsonb_build_array(COALESCE(secondary_terrain_type_id, primary_terrain_type_id)::text)
    )
  -- Vertical split: 1 row, 2 columns
  WHEN split_direction = 'vertical' THEN
    jsonb_build_array(
      jsonb_build_array(primary_terrain_type_id::text, COALESCE(secondary_terrain_type_id, primary_terrain_type_id)::text)
    )
  -- Fallback: single cell
  ELSE
    jsonb_build_array(jsonb_build_array(primary_terrain_type_id::text))
END;

-- Step 3: Make cell_colors required (after migration)
ALTER TABLE custom_pieces
ALTER COLUMN cell_colors SET NOT NULL;

-- Step 4: Drop old columns that are no longer needed
ALTER TABLE custom_pieces
DROP COLUMN is_split,
DROP COLUMN split_direction,
DROP COLUMN primary_terrain_type_id,
DROP COLUMN secondary_terrain_type_id;

-- Add a comment explaining the cell_colors format
COMMENT ON COLUMN custom_pieces.cell_colors IS
'2D array of terrain type UUIDs. Format: [[row0col0, row0col1], [row1col0, row1col1]].
Grid dimensions calculated as: cols = round(width/3), rows = round(height/3), minimum 1.';


-- =============================================
-- MIGRATION 8: Create piece variants
-- File: 20260125050000_piece_variants.sql
-- =============================================

-- Create piece_variants table for storing terrain piece variants with custom colors
CREATE TABLE piece_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  terrain_type_id UUID REFERENCES terrain_types(id) ON DELETE CASCADE,
  shape_id UUID REFERENCES piece_shapes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cell_colors JSONB NOT NULL,
  quantity INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE piece_variants ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for local development)
CREATE POLICY "Allow all operations on piece_variants" ON piece_variants
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster lookups by terrain type
CREATE INDEX idx_piece_variants_terrain_type ON piece_variants(terrain_type_id);

-- Create index for tag searches
CREATE INDEX idx_piece_variants_tags ON piece_variants USING GIN(tags);


-- =============================================
-- MIGRATION 9: Add magnets to piece shapes
-- File: 20260126000000_add_magnets_to_piece_shapes.sql
-- =============================================

-- Add magnets column to piece_shapes table
ALTER TABLE piece_shapes ADD COLUMN magnets JSONB DEFAULT NULL;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'piece_shapes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE piece_shapes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create trigger for updated_at if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_piece_shapes_updated_at'
  ) THEN
    CREATE TRIGGER update_piece_shapes_updated_at
      BEFORE UPDATE ON piece_shapes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================
-- MIGRATION 10: Create profiles table
-- File: 20260218000000_create_profiles_table.sql
-- =============================================

-- Create profiles table for authenticated users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create trigger to auto-update updated_at (reuses existing function from maps migration)
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create database trigger function to auto-insert a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Grant permissions to Supabase auth service roles
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO authenticator;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO authenticator;

-- Trigger on auth.users to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- MIGRATION 11: Add user_id to maps
-- File: 20260218100000_add_user_id_to_maps.sql
-- =============================================

-- Step 1: Delete all existing maps (they have no user_id)
DELETE FROM maps;

-- Step 2: Drop the old "allow all" RLS policy
DROP POLICY IF EXISTS "Allow all operations" ON maps;

-- Step 3: Add user_id column referencing profiles
ALTER TABLE maps ADD COLUMN user_id UUID NOT NULL REFERENCES profiles(id);

-- Step 4: Create index on user_id for faster queries
CREATE INDEX idx_maps_user_id ON maps(user_id);


-- =============================================
-- MIGRATION 12: Add profiles RLS policies
-- File: 20260218200000_add_profiles_rls_policies.sql
-- =============================================

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


-- =============================================
-- MIGRATION 13: Add maps RLS policies
-- File: 20260218300000_add_maps_rls_policies.sql
-- =============================================

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


-- =============================================
-- MIGRATION 14: Create test user
-- File: 20260223000000_create_test_user.sql
-- =============================================

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Delete existing test user if it exists (to recreate with correct fields)
  DELETE FROM auth.users WHERE id = test_user_id;

  -- Insert into auth.users with all required fields
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_sent_at,
    aud,
    role,
    is_sso_user
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test@local.dev',
    crypt('test-password-dev-only', gen_salt('bf')),
    NOW(),
    '',  -- Empty string instead of NULL
    '',  -- Empty string instead of NULL
    '',  -- Empty string instead of NULL
    '',  -- Empty string instead of NULL
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test User","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=test"}'::jsonb,
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    false
  );

  RAISE NOTICE 'Test user created: test@local.dev';
END $$;


-- =============================================
-- ALL MIGRATIONS COMPLETE ✅
-- =============================================
-- Next steps:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Run the query
-- 4. Verify tables created in Table Editor
-- =============================================
