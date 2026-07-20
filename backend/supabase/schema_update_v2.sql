-- Run this entire script in the Supabase SQL Editor

-- 1. Add impressions_count to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS impressions_count INTEGER DEFAULT 0;

-- 2. Create hashtags table
CREATE TABLE IF NOT EXISTS public.hashtags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tag TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create post_hashtags table
CREATE TABLE IF NOT EXISTS public.post_hashtags (
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    hashtag_id UUID REFERENCES public.hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);

-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read hashtags." ON public.hashtags;
CREATE POLICY "Public can read hashtags." ON public.hashtags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read post_hashtags." ON public.post_hashtags;
CREATE POLICY "Public can read post_hashtags." ON public.post_hashtags FOR SELECT USING (true);

-- 4. Create RPC for atomic increment of impressions
CREATE OR REPLACE FUNCTION increment_impression(post_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET impressions_count = impressions_count + 1
  WHERE id = post_id_param;
END;
$$;
