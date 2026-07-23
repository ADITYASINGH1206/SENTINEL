-- Schema Update v3 — Role 3 Moderation Fields
-- Run this in the Supabase SQL Editor after schema_update_v2.sql

-- 1. Add moderation columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_moderation_status TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_labels TEXT[] DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deepfake_confidence FLOAT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deepfake_model_version TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public', 'labeled', 'blocked', 'pending'));

-- 2. Add spam_score and status columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS spam_score FLOAT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'flagged', 'suspended'));

-- 3. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('account', 'post')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'nudity', '18+', 'misleading')),
    reporter_id TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'actioned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reports are viewable by everyone." ON public.reports;
CREATE POLICY "Reports are viewable by everyone." ON public.reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create reports." ON public.reports;
CREATE POLICY "Anyone can create reports." ON public.reports FOR INSERT WITH CHECK (true);
