-- Add magnets column to piece_shapes table
-- Stores array of magnet configurations: [{size: "3x2", quantity: 4}, ...]
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
