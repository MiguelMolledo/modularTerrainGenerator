-- Add snapshot field (always auto-generated) separate from custom thumbnail
ALTER TABLE maps ADD COLUMN IF NOT EXISTS snapshot TEXT;

-- Migrate existing data: if is_custom_thumbnail is false, copy thumbnail to snapshot
UPDATE maps SET snapshot = thumbnail WHERE is_custom_thumbnail = false AND thumbnail IS NOT NULL;

-- If is_custom_thumbnail is true, keep thumbnail as custom and snapshot as null (will be generated on next save)
