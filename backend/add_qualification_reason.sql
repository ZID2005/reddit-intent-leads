-- ============================================================
-- Migration: Add qualification_reason to posts table
-- Run once in: Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS qualification_reason text;

COMMENT ON COLUMN public.posts.qualification_reason IS
  'Signal category that caused this lead to pass the pre-filter. '
  'One of: recommendation_request | comparison_signal | pricing_signal | '
  'migration_signal | problem_signal | tool_search';
