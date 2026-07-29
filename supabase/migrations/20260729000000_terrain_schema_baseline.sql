-- Modular Terrain Creator: baseline consolidado
-- Vive en el schema `terrain` (el proyecto Supabase se comparte con otras
-- apps: GymStats usa `public`, FamilyExpenses usa `family`).
-- Este archivo es el estado final de las migraciones históricas del proyecto
-- original (ya eliminado), portadas al schema `terrain`.

CREATE SCHEMA IF NOT EXISTS terrain;
GRANT USAGE ON SCHEMA terrain TO anon, authenticated, service_role;

-- ============================================================
-- Helpers
-- ============================================================

CREATE OR REPLACE FUNCTION terrain.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Profiles (una fila por usuario de auth.users)
-- ============================================================

CREATE TABLE terrain.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE terrain.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON terrain.profiles
  FOR EACH ROW
  EXECUTE FUNCTION terrain.update_updated_at_column();

-- Crea el perfil de terrain al registrarse un usuario. El proyecto se comparte
-- con otras apps, así que el trigger debe ser inofensivo para sus signups:
-- ON CONFLICT DO NOTHING y sin exigir metadatos concretos.
CREATE OR REPLACE FUNCTION terrain.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO terrain.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Permisos para el servicio de auth (GoTrue) que dispara el trigger
GRANT USAGE ON SCHEMA terrain TO supabase_auth_admin;
GRANT ALL ON TABLE terrain.profiles TO supabase_auth_admin;

-- Nombre distinto de `on_auth_user_created` porque en el proyecto compartido
-- ese trigger ya existe (es el de GymStats).
DROP TRIGGER IF EXISTS on_auth_user_created_terrain ON auth.users;
CREATE TRIGGER on_auth_user_created_terrain
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION terrain.handle_new_user();

-- Backfill: los usuarios ya existentes (de las otras apps) también pueden
-- entrar en terrain con su misma cuenta.
INSERT INTO terrain.profiles (id, email, display_name)
SELECT u.id,
       COALESCE(u.email, ''),
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- RLS: cada usuario ve y edita solo su perfil. Operaciones de admin via
-- Supabase Studio / service_role (sin policies de admin para evitar recursion).
CREATE POLICY "Users can select own profile"
  ON terrain.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON terrain.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- Maps (contenido por usuario)
-- ============================================================

CREATE TABLE terrain.maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES terrain.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  map_width INTEGER NOT NULL DEFAULT 72,
  map_height INTEGER NOT NULL DEFAULT 45,
  levels INTEGER[] NOT NULL DEFAULT ARRAY[-1, 0, 1, 2],
  placed_pieces JSONB NOT NULL DEFAULT '[]',
  grid_config JSONB,
  thumbnail TEXT,
  is_custom_thumbnail BOOLEAN DEFAULT false,
  snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE terrain.maps ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_maps_updated_at ON terrain.maps(updated_at DESC);
CREATE INDEX idx_maps_user_id ON terrain.maps(user_id);

CREATE TRIGGER update_maps_updated_at
  BEFORE UPDATE ON terrain.maps
  FOR EACH ROW
  EXECUTE FUNCTION terrain.update_updated_at_column();

CREATE POLICY "Users can select own maps"
  ON terrain.maps FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own maps"
  ON terrain.maps FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own maps"
  ON terrain.maps FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own maps"
  ON terrain.maps FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- Inventario (datos de referencia/seed; el cliente los lee pero
-- el inventario de trabajo vive en localStorage)
-- ============================================================

CREATE TABLE terrain.piece_shapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shape_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  width DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  is_diagonal BOOLEAN NOT NULL DEFAULT false,
  default_rotation INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  magnets JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE terrain.terrain_types (
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

CREATE TABLE terrain.terrain_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terrain_type_id UUID NOT NULL REFERENCES terrain.terrain_types(id) ON DELETE CASCADE,
  shape_id UUID NOT NULL REFERENCES terrain.piece_shapes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(terrain_type_id, shape_id)
);

CREATE TABLE terrain.terrain_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terrain_type_id UUID NOT NULL REFERENCES terrain.terrain_types(id) ON DELETE CASCADE,
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

CREATE TABLE terrain.custom_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  width DECIMAL(5,2) NOT NULL CHECK (width >= 0.5 AND width <= 24),
  height DECIMAL(5,2) NOT NULL CHECK (height >= 0.5 AND height <= 24),
  -- 2D array de UUIDs de terrain_types: [[row0col0, row0col1], [row1col0, ...]]
  -- cols = round(width/3), rows = round(height/3), minimo 1.
  cell_colors JSONB NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE terrain.piece_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '📦',
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE terrain.piece_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES terrain.piece_templates(id) ON DELETE CASCADE,
  shape_id UUID NOT NULL REFERENCES terrain.piece_shapes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(template_id, shape_id)
);

CREATE TABLE terrain.piece_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  terrain_type_id UUID REFERENCES terrain.terrain_types(id) ON DELETE CASCADE,
  shape_id UUID REFERENCES terrain.piece_shapes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cell_colors JSONB NOT NULL,
  quantity INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_terrain_pieces_terrain ON terrain.terrain_pieces(terrain_type_id);
CREATE INDEX idx_terrain_objects_terrain ON terrain.terrain_objects(terrain_type_id);
CREATE INDEX idx_terrain_types_slug ON terrain.terrain_types(slug);
CREATE INDEX idx_piece_template_items_template ON terrain.piece_template_items(template_id);
CREATE INDEX idx_piece_variants_terrain_type ON terrain.piece_variants(terrain_type_id);
CREATE INDEX idx_piece_variants_tags ON terrain.piece_variants USING GIN(tags);

-- Triggers updated_at
CREATE TRIGGER update_piece_shapes_updated_at BEFORE UPDATE ON terrain.piece_shapes
  FOR EACH ROW EXECUTE FUNCTION terrain.update_updated_at_column();
CREATE TRIGGER update_terrain_types_updated_at BEFORE UPDATE ON terrain.terrain_types
  FOR EACH ROW EXECUTE FUNCTION terrain.update_updated_at_column();
CREATE TRIGGER update_terrain_pieces_updated_at BEFORE UPDATE ON terrain.terrain_pieces
  FOR EACH ROW EXECUTE FUNCTION terrain.update_updated_at_column();
CREATE TRIGGER update_terrain_objects_updated_at BEFORE UPDATE ON terrain.terrain_objects
  FOR EACH ROW EXECUTE FUNCTION terrain.update_updated_at_column();
CREATE TRIGGER update_piece_templates_updated_at BEFORE UPDATE ON terrain.piece_templates
  FOR EACH ROW EXECUTE FUNCTION terrain.update_updated_at_column();

-- RLS: solo lectura para usuarios autenticados (datos seed; nunca se mutan
-- desde el cliente — ver migracion historica lock_down_inventory_rls)
ALTER TABLE terrain.piece_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain.terrain_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain.terrain_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain.terrain_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain.custom_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain.piece_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain.piece_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain.piece_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read piece_shapes" ON terrain.piece_shapes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read terrain_types" ON terrain.terrain_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read terrain_pieces" ON terrain.terrain_pieces
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read terrain_objects" ON terrain.terrain_objects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read custom_pieces" ON terrain.custom_pieces
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read piece_templates" ON terrain.piece_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read piece_template_items" ON terrain.piece_template_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read piece_variants" ON terrain.piece_variants
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Grants para los roles de la API (RLS sigue mandando)
-- ============================================================

GRANT ALL ON ALL TABLES IN SCHEMA terrain TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA terrain
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- ============================================================
-- Seeds
-- ============================================================

INSERT INTO terrain.piece_shapes (shape_key, name, width, height, is_diagonal, default_rotation, display_order) VALUES
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

INSERT INTO terrain.terrain_types (slug, name, color, icon, is_default, display_order) VALUES
  ('desert', 'Desert', '#E5C07B', '🏜️', true, 1),
  ('forest', 'Forest', '#98C379', '🌲', true, 2),
  ('arid', 'Arid', '#D19A66', '🏔️', true, 3),
  ('water', 'Water', '#61AFEF', '🌊', true, 4),
  ('swamp', 'Swamp', '#56B6C2', '🐊', true, 5),
  ('lava', 'Lava', '#E06C75', '🌋', true, 6);

INSERT INTO terrain.terrain_pieces (terrain_type_id, shape_id, quantity)
SELECT t.id, s.id, 10
FROM terrain.terrain_types t
CROSS JOIN terrain.piece_shapes s
WHERE t.is_default = true;

INSERT INTO terrain.piece_templates (name, description, icon, is_default, display_order) VALUES
  ('Empty', 'No pieces - add them manually', '📭', true, 0),
  ('Starter Set', 'Basic pieces to get started', '🎯', true, 1),
  ('Standard Set', 'Common pieces for most builds', '📦', true, 2),
  ('Full Set', 'All pieces with generous quantities', '🎁', true, 3),
  ('Diagonals Only', 'Just triangular pieces', '📐', true, 4),
  ('Strip Pieces', 'Thin pieces for borders', '📏', true, 5),
  ('Squares Only', 'Just square pieces', '⬛', true, 6);

INSERT INTO terrain.piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 4
    WHEN '6x6' THEN 2
    WHEN '3x6' THEN 2
    WHEN '6x3' THEN 2
    ELSE 0
  END
FROM terrain.piece_templates t
CROSS JOIN terrain.piece_shapes s
WHERE t.name = 'Starter Set'
  AND s.shape_key IN ('3x3', '6x6', '3x6', '6x3');

INSERT INTO terrain.piece_template_items (template_id, shape_id, quantity)
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
FROM terrain.piece_templates t
CROSS JOIN terrain.piece_shapes s
WHERE t.name = 'Standard Set'
  AND s.shape_key IN ('3x3', '6x6', '3x6', '6x3', '3x1.5', '1.5x3');

INSERT INTO terrain.piece_template_items (template_id, shape_id, quantity)
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
FROM terrain.piece_templates t
CROSS JOIN terrain.piece_shapes s
WHERE t.name = 'Full Set';

INSERT INTO terrain.piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id, 6
FROM terrain.piece_templates t
CROSS JOIN terrain.piece_shapes s
WHERE t.name = 'Diagonals Only'
  AND s.shape_key IN ('diagonal-tl', 'diagonal-tr', 'diagonal-br', 'diagonal-bl');

INSERT INTO terrain.piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x1.5' THEN 8
    WHEN '1.5x3' THEN 8
    WHEN '6x1.5' THEN 6
    WHEN '1.5x6' THEN 6
    ELSE 0
  END
FROM terrain.piece_templates t
CROSS JOIN terrain.piece_shapes s
WHERE t.name = 'Strip Pieces'
  AND s.shape_key IN ('3x1.5', '1.5x3', '6x1.5', '1.5x6');

INSERT INTO terrain.piece_template_items (template_id, shape_id, quantity)
SELECT t.id, s.id,
  CASE s.shape_key
    WHEN '3x3' THEN 12
    WHEN '6x6' THEN 6
    ELSE 0
  END
FROM terrain.piece_templates t
CROSS JOIN terrain.piece_shapes s
WHERE t.name = 'Squares Only'
  AND s.shape_key IN ('3x3', '6x6');
