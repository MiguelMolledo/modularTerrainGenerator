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
