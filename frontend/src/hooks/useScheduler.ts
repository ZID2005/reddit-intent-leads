/**
 * useScheduler.ts
 * ---------------
 * React hook that manages scheduler state for the Analytics page.
 *
 * - Polls /api/scheduler/status every 10 seconds for live status.
 * - Reads recent run history from Supabase scheduler_runs table.
 * - Exposes triggerRun() and changeInterval() actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// The URL of the running scheduler FastAPI service (set in .env)
const SCHEDULER_API_URL =
  import.meta.env.VITE_SCHEDULER_API_URL || 'http://localhost:8000';

export type SchedulerStatus = 'idle' | 'running' | 'error' | 'offline';

export interface SchedulerRunRecord {
  id: number;
  run_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'failed' | 'partial';
  interval_hours: number;
  fetched: number;
  scored: number;
  inserted: number;
  duplicates: number;
  failures: number;
  error_message: string | null;
  next_run_at: string | null;
}

export interface SchedulerState {
  status: SchedulerStatus;
  intervalHours: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastRunInserted: number;
  lastRunFetched: number;
  lastRunScored: number;
  lastRunDuplicates: number;
  lastRunFailures: number;
  lastError: string | null;
  history: SchedulerRunRecord[];
  apiOnline: boolean;
}

const POLL_INTERVAL_MS = 10_000; // 10 seconds

export function useScheduler() {
  const [state, setState] = useState<SchedulerState>({
    status: 'offline',
    intervalHours: 6,
    lastRunAt: null,
    nextRunAt: null,
    lastRunInserted: 0,
    lastRunFetched: 0,
    lastRunScored: 0,
    lastRunDuplicates: 0,
    lastRunFailures: 0,
    lastError: null,
    history: [],
    apiOnline: false,
  });

  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch live status from scheduler API ──────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${SCHEDULER_API_URL}/api/scheduler/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setState(prev => ({
        ...prev,
        status: (data.status as SchedulerStatus) || 'idle',
        intervalHours: data.interval_hours ?? prev.intervalHours,
        lastRunAt: data.last_run_at ?? prev.lastRunAt,
        nextRunAt: data.next_run_at ?? prev.nextRunAt,
        lastRunInserted: data.last_run_inserted ?? 0,
        lastRunFetched: data.last_run_fetched ?? 0,
        lastRunScored: data.last_run_scored ?? 0,
        lastRunDuplicates: data.last_run_duplicates ?? 0,
        lastRunFailures: data.last_run_failures ?? 0,
        lastError: data.last_error ?? null,
        apiOnline: true,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        status: 'offline',
        apiOnline: false,
      }));
    }
  }, []);

  // ── Fetch run history from Supabase (read-only, anon key) ─────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('scheduler_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (data) {
        setState(prev => ({ ...prev, history: data as SchedulerRunRecord[] }));
      }
    } catch (e) {
      console.warn('Could not load scheduler history:', e);
    }
  }, []);

  // ── Realtime subscription for scheduler_runs inserts ─────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('scheduler-runs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduler_runs' },
        () => {
          fetchHistory();
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHistory, fetchStatus]);

  // ── Initial load + polling ────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    fetchHistory();

    pollRef.current = setInterval(() => {
      fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus, fetchHistory]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const triggerRun = useCallback(async () => {
    if (triggerLoading || state.status === 'running') return;
    setTriggerLoading(true);
    setTriggerError(null);

    try {
      const res = await fetch(`${SCHEDULER_API_URL}/api/scheduler/run`, {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 409) {
        setTriggerError('Pipeline is already running.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setState(prev => ({ ...prev, status: 'running' }));
      // Poll immediately
      setTimeout(fetchStatus, 1500);
    } catch (e: any) {
      setTriggerError(
        e.message?.includes('timeout') || e.message?.includes('fetch')
          ? 'Scheduler is offline. Start it with: python backend/scheduler.py'
          : e.message || 'Failed to trigger run.'
      );
    } finally {
      setTriggerLoading(false);
    }
  }, [triggerLoading, state.status, fetchStatus]);

  const changeInterval = useCallback(
    async (hours: number) => {
      if (configLoading) return;
      setConfigLoading(true);
      try {
        const res = await fetch(`${SCHEDULER_API_URL}/api/scheduler/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interval_hours: hours }),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setState(prev => ({
          ...prev,
          intervalHours: hours,
          nextRunAt: data.next_run_at ?? prev.nextRunAt,
        }));
      } catch (e: any) {
        console.error('Failed to update interval:', e);
      } finally {
        setConfigLoading(false);
      }
    },
    [configLoading]
  );

  return {
    ...state,
    triggerLoading,
    triggerError,
    configLoading,
    triggerRun,
    changeInterval,
    refresh: fetchStatus,
  };
}
