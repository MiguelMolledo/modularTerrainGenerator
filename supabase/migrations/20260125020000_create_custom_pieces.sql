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
