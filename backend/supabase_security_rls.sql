-- ===========================================================================
-- SignalRadar Supabase SQL Migration: Production-Safe RLS Policies
-- Execute in: Supabase Dashboard > SQL Editor
-- ===========================================================================

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Table: public.posts
-- ───────────────────────────────────────────────────────────────────────────

-- Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update posts" ON public.posts;
DROP POLICY IF EXISTS "Service role has full access to posts" ON public.posts;

-- Read policy: Authenticated users can view all posts in the shared global feed
CREATE POLICY "Users can view posts"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Update policy: Authenticated users can modify post status/notes in the shared global feed
CREATE POLICY "Users can update posts"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role policy: Allow backend service role key bypass constraints
CREATE POLICY "Service role has full access to posts"
  ON public.posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ───────────────────────────────────────────────────────────────────────────
-- 2. Table: public.scheduler_runs
-- ───────────────────────────────────────────────────────────────────────────

-- Enable Row Level Security (RLS)
ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

-- Clean up old anonymous development policies
DROP POLICY IF EXISTS "Allow anon read scheduler_runs" ON public.scheduler_runs;
DROP POLICY IF EXISTS "Allow anon insert scheduler_runs" ON public.scheduler_runs;
DROP POLICY IF EXISTS "Allow anon update scheduler_runs" ON public.scheduler_runs;
DROP POLICY IF EXISTS "Allow service write scheduler_runs" ON public.scheduler_runs;
DROP POLICY IF EXISTS "Allow authenticated users to read scheduler_runs" ON public.scheduler_runs;
DROP POLICY IF EXISTS "Allow service role full access on scheduler_runs" ON public.scheduler_runs;

-- Read policy: Allow authenticated users to read scheduler execution status
CREATE POLICY "Allow authenticated users to read scheduler_runs"
  ON public.scheduler_runs
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role policy: Allow backend service role key full access to runs table
CREATE POLICY "Allow service role full access on scheduler_runs"
  ON public.scheduler_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
