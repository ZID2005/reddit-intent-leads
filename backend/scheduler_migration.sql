-- ============================================================
-- SignalRadar: Scheduler Runs Table
-- Run once in: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduler_runs (
  id              bigserial     PRIMARY KEY,
  run_id          uuid          NOT NULL DEFAULT gen_random_uuid(),
  started_at      timestamptz   NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  status          text          NOT NULL DEFAULT 'running',
  -- status values: 'running' | 'success' | 'failed' | 'partial'
  interval_hours  int           NOT NULL DEFAULT 6,
  fetched         int           NOT NULL DEFAULT 0,
  scored          int           NOT NULL DEFAULT 0,
  inserted        int           NOT NULL DEFAULT 0,
  duplicates      int           NOT NULL DEFAULT 0,
  failures        int           NOT NULL DEFAULT 0,
  error_message   text,
  next_run_at     timestamptz
);

-- Index for fast "last run" queries
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_started_at
  ON public.scheduler_runs (started_at DESC);

-- Enable Row Level Security (RLS) — allow anon reads for frontend status card
ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read scheduler_runs"
  ON public.scheduler_runs
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated service role to insert/update (backend uses service key)
CREATE POLICY "Allow service write scheduler_runs"
  ON public.scheduler_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also allow anon inserts for local dev (remove in production if using service key)
CREATE POLICY "Allow anon insert scheduler_runs"
  ON public.scheduler_runs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update scheduler_runs"
  ON public.scheduler_runs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
