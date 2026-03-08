-- Add ai_enabled column to profiles (default false for new users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT false;

-- Enable AI for the test user
UPDATE public.profiles
  SET ai_enabled = true
  WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
