-- Schema Update v4: Create Reports Table
-- Execute this against the Supabase SQL Editor

DROP TABLE IF EXISTS public.reports CASCADE;

CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type TEXT NOT NULL CHECK (target_type IN ('account', 'post')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'nudity', '18+', 'misleading')),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'actioned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create reports
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid()::uuid = reporter_id);

-- Policy: Users can view their own reports
CREATE POLICY "Users can view their own reports" ON public.reports
    FOR SELECT USING (auth.uid()::uuid = reporter_id);

-- (Optional) Index for fast lookups by target
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);
