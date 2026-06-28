-- ============================================================
-- SignalRadar: Subscription and Usage Tracking Tables
-- Run once in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Table: public.subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id      uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan         text          NOT NULL DEFAULT 'free',
  status       text          NOT NULL DEFAULT 'active',
  starts_at    timestamptz   NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);

-- Index for subscriptions plan
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions (plan);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Clean up old policies if they exist
DROP POLICY IF EXISTS "Allow users to read their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access on subscriptions" ON public.subscriptions;

-- Policies
CREATE POLICY "Allow users to read their own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on subscriptions"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 2. Table: public.usage_tracking (Monthly Analytics)
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  user_id            uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month              text          NOT NULL, -- YYYY-MM format
  ai_generations     int           NOT NULL DEFAULT 0,
  csv_exports        int           NOT NULL DEFAULT 0,
  leads_viewed       int           NOT NULL DEFAULT 0,
  notifications_sent int           NOT NULL DEFAULT 0,
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Clean up old policies if they exist
DROP POLICY IF EXISTS "Allow users to read their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Service role full access on usage_tracking" ON public.usage_tracking;

-- Policies
CREATE POLICY "Allow users to read their own usage"
  ON public.usage_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on usage_tracking"
  ON public.usage_tracking
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 3. Table: public.daily_usage (Daily limits enforcement)
CREATE TABLE IF NOT EXISTS public.daily_usage (
  user_id            uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               date          NOT NULL DEFAULT current_date,
  ai_generations     int           NOT NULL DEFAULT 0,
  csv_exports        int           NOT NULL DEFAULT 0,
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Clean up old policies if they exist
DROP POLICY IF EXISTS "Allow users to read their own daily usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Service role full access on daily_usage" ON public.daily_usage;

-- Policies
CREATE POLICY "Allow users to read their own daily usage"
  ON public.daily_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on daily_usage"
  ON public.daily_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
