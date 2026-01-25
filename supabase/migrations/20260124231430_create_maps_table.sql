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
