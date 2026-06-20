/**
 * SchedulerStatusCard.tsx
 * -----------------------
 * Analytics page card showing automated pipeline status.
 *
 * Features:
 * - Live status indicator (idle / running / error / offline)
 * - Last Run & Next Run timestamps with relative time
 * - Per-run metrics: inserted / fetched / duplicates / failures
 * - Interval selector: 1h · 3h · 6h · 12h · 24h
 * - "Run Now" button with loading spinner
 * - Recent run history timeline
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Play,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  WifiOff,
  TrendingUp,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useScheduler, SchedulerRunRecord } from '../../hooks/useScheduler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function countdown(isoStr: string | null): string {
  if (!isoStr) return '—';
  const diff = (new Date(isoStr).getTime() - Date.now()) / 1000;
  if (diff <= 0) return 'soon';
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  idle: {
    label: 'Idle',
    dotColor: 'bg-lime',
    glow: 'shadow-[0_0_8px_#C6FF34]',
    textColor: 'text-lime',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    pulse: false,
  },
  running: {
    label: 'Running',
    dotColor: 'bg-amber-400',
    glow: 'shadow-[0_0_8px_#fbbf24]',
    textColor: 'text-amber-400',
    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    pulse: true,
  },
  error: {
    label: 'Error',
    dotColor: 'bg-red-500',
    glow: 'shadow-[0_0_8px_#ef4444]',
    textColor: 'text-red-400',
    icon: <XCircle className="w-3.5 h-3.5" />,
    pulse: false,
  },
  offline: {
    label: 'Offline',
    dotColor: 'bg-gray-500',
    glow: '',
    textColor: 'text-gray-400',
    icon: <WifiOff className="w-3.5 h-3.5" />,
    pulse: false,
  },
} as const;

const INTERVALS = [1, 3, 6, 12, 24] as const;

// ---------------------------------------------------------------------------
// Run History item
// ---------------------------------------------------------------------------
function HistoryRow({ run }: { run: SchedulerRunRecord }) {
  const isSuccess = run.status === 'success' || run.status === 'partial';
  const isFailed = run.status === 'failed';
  const isRunning = run.status === 'running';

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="flex-shrink-0">
        {isRunning ? (
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        ) : isFailed ? (
          <XCircle className="w-3.5 h-3.5 text-red-400" />
        ) : run.status === 'partial' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/70">
            {formatTime(run.started_at)}
          </span>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
              isRunning
                ? 'text-amber-400 bg-amber-400/10'
                : isFailed
                ? 'text-red-400 bg-red-400/10'
                : run.status === 'partial'
                ? 'text-amber-300 bg-amber-300/10'
                : 'text-lime bg-lime/10'
            }`}
          >
            {run.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[9px] text-mutedText">
            +{run.inserted} leads
          </span>
          <span className="text-[9px] text-mutedText">
            {run.fetched} fetched
          </span>
          {run.failures > 0 && (
            <span className="text-[9px] text-red-400">
              {run.failures} err
            </span>
          )}
        </div>
      </div>
      <span className="text-[9px] font-mono text-mutedText flex-shrink-0">
        {relativeTime(run.started_at)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------
export function SchedulerStatusCard() {
  const {
    status,
    intervalHours,
    lastRunAt,
    nextRunAt,
    lastRunInserted,
    lastRunFetched,
    lastRunScored,
    lastRunDuplicates,
    lastRunFailures,
    lastError,
    history,
    apiOnline,
    triggerLoading,
    triggerError,
    configLoading,
    triggerRun,
    changeInterval,
  } = useScheduler();

  const [showHistory, setShowHistory] = useState(false);
  const [nextRunDisplay, setNextRunDisplay] = useState('—');
  const [lastRunDisplay, setLastRunDisplay] = useState('—');

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;

  // Live countdown ticker
  useEffect(() => {
    const tick = () => {
      setNextRunDisplay(countdown(nextRunAt));
      setLastRunDisplay(relativeTime(lastRunAt));
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [nextRunAt, lastRunAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel rounded-2xl border border-white/5 overflow-hidden"
    >
      {/* Top accent bar — color matches status */}
      <div
        className={`h-[2px] w-full ${
          status === 'running'
            ? 'bg-amber-400'
            : status === 'error'
            ? 'bg-red-500'
            : status === 'offline'
            ? 'bg-gray-600'
            : 'bg-lime'
        }`}
      />

      <div className="p-5">
        {/* ── Header row ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-lime/10 border border-lime/20">
                <Zap className="w-3.5 h-3.5 text-lime" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-mutedText/80">
                Auto-Refresh Pipeline
              </span>
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Scheduler Status
            </h2>
          </div>

          {/* Status badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 ${cfg.textColor}`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} ${cfg.glow} ${
                cfg.pulse ? 'animate-pulse' : ''
              }`}
            />
            {cfg.icon}
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest">
              {cfg.label}
            </span>
          </div>
        </div>

        {/* ── Metrics grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {/* Last Run */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-mutedText">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] font-mono uppercase tracking-widest">
                Last Run
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-white">
              {lastRunDisplay}
            </p>
            {lastRunAt && (
              <p className="text-[9px] text-mutedText font-mono">
                {formatTime(lastRunAt)}
              </p>
            )}
          </div>

          {/* Next Run */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-mutedText">
              <RefreshCw className="w-3 h-3" />
              <span className="text-[9px] font-mono uppercase tracking-widest">
                Next Run
              </span>
            </div>
            <p
              className={`text-sm font-bold font-mono ${
                apiOnline ? 'text-lime' : 'text-gray-400'
              }`}
            >
              {apiOnline ? nextRunDisplay : '—'}
            </p>
            {nextRunAt && apiOnline && (
              <p className="text-[9px] text-mutedText font-mono">
                {formatTime(nextRunAt)}
              </p>
            )}
          </div>

          {/* New Leads */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-mutedText">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[9px] font-mono uppercase tracking-widest">
                Last Added
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-white">
              +{lastRunInserted}
            </p>
            <p className="text-[9px] text-mutedText font-mono">
              {lastRunFetched} fetched · {lastRunDuplicates} dupes
            </p>
          </div>

          {/* Failures */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-mutedText">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[9px] font-mono uppercase tracking-widest">
                Failures
              </span>
            </div>
            <p
              className={`text-sm font-bold font-mono ${
                lastRunFailures > 0 ? 'text-red-400' : 'text-white'
              }`}
            >
              {lastRunFailures}
            </p>
            <p className="text-[9px] text-mutedText font-mono">
              {lastRunScored} scored
            </p>
          </div>
        </div>

        {/* ── Controls row ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Interval selector */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-mutedText">
              Interval:
            </span>
            <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-lg">
              {INTERVALS.map(h => {
                const isActive = h === intervalHours;
                return (
                  <button
                    key={h}
                    id={`scheduler-interval-${h}h`}
                    onClick={() => changeInterval(h)}
                    disabled={configLoading || !apiOnline}
                    className={`relative px-2.5 py-1 text-[9px] font-mono font-medium rounded-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'text-carbon-dark font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeInterval"
                        className="absolute inset-0 bg-lime rounded-md z-0"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{h}h</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* History toggle */}
          <button
            id="scheduler-history-toggle"
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-mutedText hover:text-white border border-white/5 rounded-lg hover:bg-white/[0.03] transition-all duration-150"
          >
            <Copy className="w-3 h-3" />
            History
            {showHistory ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {/* Run Now button */}
          <motion.button
            id="scheduler-run-now"
            onClick={triggerRun}
            disabled={triggerLoading || status === 'running' || !apiOnline}
            whileHover={{ scale: apiOnline ? 1.02 : 1 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all duration-200 ${
              !apiOnline
                ? 'bg-white/[0.03] text-gray-500 border border-white/5 cursor-not-allowed'
                : status === 'running' || triggerLoading
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30 cursor-wait'
                : 'bg-lime text-carbon-dark border border-lime/50 hover:shadow-[0_0_16px_rgba(198,255,52,0.4)]'
            }`}
          >
            {triggerLoading || status === 'running' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {triggerLoading
              ? 'Triggering…'
              : status === 'running'
              ? 'Running…'
              : 'Run Now'}
          </motion.button>
        </div>

        {/* ── Error / offline messages ─────────────────────────────── */}
        <AnimatePresence>
          {triggerError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <p className="text-[10px] text-red-400 font-mono">{triggerError}</p>
            </motion.div>
          )}

          {!apiOnline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg"
            >
              <p className="text-[10px] text-mutedText font-mono">
                <WifiOff className="w-3 h-3 inline mr-1.5 text-gray-500" />
                Scheduler offline. Start with:{' '}
                <code className="text-white/70 bg-white/5 px-1 py-0.5 rounded">
                  python backend/scheduler.py
                </code>
              </p>
            </motion.div>
          )}

          {lastError && status === 'error' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <p className="text-[9px] text-red-400 font-mono truncate">
                Last error: {lastError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Run history ──────────────────────────────────────────── */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 overflow-hidden"
            >
              <div className="border-t border-white/5 pt-4">
                <p className="text-[9px] font-mono uppercase tracking-widest text-mutedText mb-3">
                  Recent Runs
                </p>
                {history.length === 0 ? (
                  <p className="text-[10px] text-mutedText font-mono py-2">
                    No runs yet.
                  </p>
                ) : (
                  <div>
                    {history.map(run => (
                      <HistoryRow key={run.run_id} run={run} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
