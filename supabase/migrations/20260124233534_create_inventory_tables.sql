-- =============================================
-- Inventory System Tables
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
