-- Migration: Add user_id to maps table and update RLS policies
-- This migration deletes all existing maps (fresh start for auth) and
-- adds user ownership via user_id column.

-- Step 1: Delete all existing maps (they have no user_id)
DELETE FROM maps;

-- Step 2: Drop the old "allow all" RLS policy
DROP POLICY IF EXISTS "Allow all operations" ON maps;

-- Step 3: Add user_id column referencing profiles
ALTER TABLE maps ADD COLUMN user_id UUID NOT NULL REFERENCES profiles(id);

-- Step 4: Create index on user_id for faster queries
CREATE INDEX idx_maps_user_id ON maps(user_id);
