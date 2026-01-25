-- Migration: Convert custom_pieces from split system to grid-based cell colors
-- This allows each piece to be divided into a grid where each cell can have its own terrain color

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

-- Step 5: Drop the check constraint that was on split_direction
-- (Already dropped when column was dropped)

-- Add a comment explaining the cell_colors format
COMMENT ON COLUMN custom_pieces.cell_colors IS
'2D array of terrain type UUIDs. Format: [[row0col0, row0col1], [row1col0, row1col1]].
Grid dimensions calculated as: cols = round(width/3), rows = round(height/3), minimum 1.';
