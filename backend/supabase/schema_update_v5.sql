-- Schema Update v5: Support Multiple Media URLs per Post
-- Execute this against the Supabase SQL Editor

-- 1. Add new array column
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- 2. Migrate existing single media_url to the new array column (if it's not null and the array is empty)
UPDATE public.posts
SET media_urls = ARRAY[media_url]
WHERE media_url IS NOT NULL AND media_urls = '{}';

-- 3. We will NOT drop the old media_url column immediately to prevent sudden crashes for clients reading it.
-- But new reads/writes will use media_urls.
