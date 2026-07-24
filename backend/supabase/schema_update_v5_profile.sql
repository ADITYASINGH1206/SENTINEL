-- Add missing columns to the users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;
