-- Add is_custom_thumbnail field to maps table
ALTER TABLE maps ADD COLUMN IF NOT EXISTS is_custom_thumbnail BOOLEAN DEFAULT false;
