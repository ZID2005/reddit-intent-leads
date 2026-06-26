-- ============================================================
-- Migration: Add notes to posts table
-- Run once in: Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.posts.notes IS
  'User-provided notes and annotations for this lead.';
