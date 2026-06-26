-- ===========================================================================
-- SignalRadar Supabase SQL Migration: Performance Optimization Indexes
-- Execute in: Supabase Dashboard > SQL Editor
-- ===========================================================================

-- 1. Index for fast feed sorting (Dashboard and API sorting by recency)
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc
  ON public.posts (created_at DESC);

-- 2. Index for filtering leads by pipeline board column status ('new', 'saved', 'contacted')
CREATE INDEX IF NOT EXISTS idx_posts_status
  ON public.posts (status);

-- 3. Index for RLS policies and Profile Page user-specific stats lookups
CREATE INDEX IF NOT EXISTS idx_posts_user_id
  ON public.posts (user_id);

-- 4. Index for ranking leads by B2B buying intent scores (Analytics and feed ordering)
CREATE INDEX IF NOT EXISTS idx_posts_intent_score_desc
  ON public.posts (intent_score DESC);

-- 5. Index for filtering leads by categorized signal classifications
CREATE INDEX IF NOT EXISTS idx_posts_category
  ON public.posts (category);

-- 6. Index for filtering leads by specific Reddit communities (subreddits)
CREATE INDEX IF NOT EXISTS idx_posts_subreddit
  ON public.posts (subreddit);
