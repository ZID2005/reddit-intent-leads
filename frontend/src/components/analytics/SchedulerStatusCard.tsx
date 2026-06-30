/**
 * SchedulerStatusCard.tsx
 * -----------------------
 * Analytics page card showing automated pipeline status.
 * Visual redesign only — all data logic, hooks, and state unchanged.
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
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Cpu,
} from 'lucide-react';
import { useScheduler, SchedulerRunRecord } from '../../hooks/useScheduler';
import { glassStyle } from '../../lib/glass';

const GODBER = "'Godber', sans-serif";
const NOHEMI = "'Nohemi', sans-serif";
const MONO = NOHEMI;
const LIME = '#C6FF34';

// ─── Liquid glass ──────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background:           'rgba(255,255,255,0.035)',
  border:               '1px solid rgba(255,255,255,0.08)',
  backdropFilter:       'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  borderRadius:         20,
  boxShadow:            '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
};

// ─── Helpers (unchanged logic) ─────────────────────────────────────────────────
function relativeTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 5)     return 'just now';
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function countdown(isoStr: string | null): string {
  if (!isoStr) return '—';
  const diff = (new Date(isoStr).getTime() - Date.now()) / 1000;
  if (diff <= 0) return 'soon';
  if (diff < 60)   return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  idle: {
    label: 'Idle', dotColor: LIME, textColor: LIME,
    icon: <CheckCircle2 className="w-3.5 h-3.5" />, pulse: false,
  },
  running: {
    label: 'Running', dotColor: '#fbbf24', textColor: '#fbbf24',
    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, pulse: true,
  },
  error: {
    label: 'Error', dotColor: '#ef4444', textColor: '#f87171',
    icon: <XCircle className="w-3.5 h-3.5" />, pulse: false,
  },
  offline: {
    label: 'Offline', dotColor: '#6b7280', textColor: '#9ca3af',
    icon: <WifiOff className="w-3.5 h-3.5" />, pulse: false,
  },
} as const;

const INTERVALS = [1, 3, 6, 12, 24] as const;

// ─── Run history item ──────────────────────────────────────────────────────────
function HistoryRow({ run }: { run: SchedulerRunRecord }) {
  const isSuccess = run.status === 'success' || run.status === 'partial';
  const isFailed  = run.status === 'failed';
  const isRunning = run.status === 'running';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flexShrink: 0 }}>
        {isRunning
          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: '#fbbf24' }} />
          : isFailed
          ? <XCircle className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
          : run.status === 'partial'
          ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
          : <CheckCircle2 className="w-3.5 h-3.5" style={{ color: LIME }} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{formatTime(run.started_at)}</span>
          <span style={{
            fontFamily: MONO, fontSize: 9, padding: '1px 6px', borderRadius: 99,
            color: isRunning ? '#fbbf24' : isFailed ? '#f87171' : run.status === 'partial' ? '#fcd34d' : LIME,
            background: isRunning ? 'rgba(251,191,36,0.1)' : isFailed ? 'rgba(239,68,68,0.1)' : 'rgba(198,255,52,0.08)',
          }}>
            {run.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>+{run.inserted} leads</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{run.fetched} fetched</span>
          {run.failures > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: '#f87171' }}>{run.failures} err</span>}
        </div>
      </div>
      <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{relativeTime(run.started_at)}</span>
    </div>
  );
}

// ─── Main card ─────────────────────────────────────────────────────────────────
export function SchedulerStatusCard({ shouldReduceMotion = false }: { shouldReduceMotion?: boolean }) {
  const {
    status, intervalHours, lastRunAt, nextRunAt,
    lastRunInserted, lastRunFetched, lastRunScored, lastRunDuplicates, lastRunFailures,
    lastError, history, apiOnline, triggerLoading, triggerError, configLoading,
    triggerRun, changeInterval,
  } = useScheduler();

  const [showHistory,    setShowHistory]    = useState(false);
  const [nextRunDisplay, setNextRunDisplay] = useState('—');
  const [lastRunDisplay, setLastRunDisplay] = useState('—');

  useEffect(() => {
    const tick = () => { setNextRunDisplay(countdown(nextRunAt)); setLastRunDisplay(relativeTime(lastRunAt)); };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [nextRunAt, lastRunAt]);

  const MiniStat = ({ label, value, subValue }: { label: string; value: React.ReactNode; subValue?: string }) => (
    <div className="bg-black/30 border border-white/[0.05] rounded-xl p-3">
      <div className="font-mono text-[10px] text-white/22 tracking-widest uppercase mb-1">{label}</div>
      <div className="font-mono text-sm text-white/70 font-medium">{value}</div>
      {subValue && <div className="font-mono text-[10px] text-white/30 mt-1">{subValue}</div>}
    </div>
  );

  const INTERVAL_PILLS = [
    { hours: 1, label: '1m' },
    { hours: 3, label: '5m' },
    { hours: 6, label: '15m' },
    { hours: 12, label: '30m' },
    { hours: 24, label: '1h' },
  ];

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.01 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...glassStyle }}
      className="rounded-2xl p-4 md:p-5 mb-3 relative overflow-hidden"
    >
      {/* Decorative lime top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C6FF34]/35 to-transparent rounded-t-2xl pointer-events-none" />
        {/* ── Header row ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-[#C6FF34]/55 tracking-widest font-mono text-[10px]">
              <Cpu className="text-[#C6FF34]/40 w-3.5 h-3.5" />
              <span>AUTO-REFRESH PIPELINE</span>
            </div>
            <h2 className="font-display text-base font-semibold text-white mt-2">
              Scheduler Status
            </h2>
          </div>

          {/* Status badge */}
          {apiOnline ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C6FF34]/10 border border-[#C6FF34]/25 text-[#C6FF34] font-mono text-[10px] select-none">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6FF34] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C6FF34]"></span>
              </span>
              <span>ONLINE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-400/10 border border-red-400/25 text-red-400 font-mono text-[10px] select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span>OFFLINE</span>
            </div>
          )}
        </div>

        {/* ── Metrics grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <MiniStat
            label="Last Run"
            value={lastRunDisplay}
            subValue={lastRunAt ? formatTime(lastRunAt) : undefined}
          />
          <MiniStat
            label="Next Run"
            value={apiOnline ? nextRunDisplay : '—'}
            subValue={nextRunAt && apiOnline ? formatTime(nextRunAt) : undefined}
          />
          <MiniStat
            label="Last Added"
            value={`+${lastRunInserted}`}
            subValue={`${lastRunFetched} fetched · ${lastRunDuplicates} dupes`}
          />
          <MiniStat
            label="Failures"
            value={<span className={lastRunFailures > 0 ? 'text-red-400' : 'text-white/70'}>{lastRunFailures}</span>}
            subValue={`${lastRunScored} scored`}
          />
        </div>

        {/* ── Controls row ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
          {/* Interval selector */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[10px] text-white/25 uppercase tracking-wider">Interval:</span>
            <div className="flex gap-2 flex-wrap">
              {INTERVAL_PILLS.map(p => {
                const isActive = p.hours === intervalHours;
                return (
                  <button
                    key={p.hours}
                    id={`scheduler-interval-${p.hours}h`}
                    onClick={() => changeInterval(p.hours)}
                    disabled={configLoading || !apiOnline}
                    className={`relative px-3 py-1.5 rounded-full font-mono text-xs cursor-pointer transition-all border outline-none select-none ${
                      isActive
                        ? 'border-transparent text-[#C6FF34]/75 font-semibold'
                        : 'border-white/[0.07] text-white/40 hover:text-white/65'
                    }`}
                    style={{
                      opacity: (configLoading || !apiOnline) ? 0.4 : 1,
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeInterval"
                        className="absolute inset-0 bg-[#C6FF34]/10 border border-[#C6FF34]/25 rounded-full z-0"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
            {/* History toggle */}
            <button
              id="scheduler-history-toggle"
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.15] text-white/45 hover:text-white/70 font-mono text-xs rounded-full cursor-pointer transition-all outline-none select-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>HISTORY</span>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
            </button>

            {/* Run Now */}
            <motion.button
              id="scheduler-run-now"
              onClick={triggerRun}
              disabled={triggerLoading || status === 'running' || !apiOnline}
              className={`flex items-center gap-2 font-mono text-xs font-medium rounded-xl px-4 py-2 transition-all cursor-pointer select-none border-none ${
                !apiOnline
                  ? 'bg-white/[0.03] text-white/30 cursor-not-allowed shadow-none opacity-40'
                  : status === 'running' || triggerLoading
                  ? 'bg-[#C6FF34]/25 text-[#C6FF34]/50 cursor-wait'
                  : 'bg-[#C6FF34] text-black hover:brightness-110 active:scale-95 shadow-[0_0_16px_rgba(198,255,52,0.2)]'
              }`}
            >
              {triggerLoading || status === 'running' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{triggerLoading ? 'TRIGGERING…' : status === 'running' ? 'RUNNING…' : 'RUN NOW'}</span>
            </motion.button>
          </div>
        </div>

        {/* ── Offline / error messages ────────────────────────────── */}
        <AnimatePresence>
          {triggerError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, color: '#f87171' }}>{triggerError}</p>
            </motion.div>
          )}

          {!apiOnline && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                <WifiOff className="w-3 h-3 inline mr-1.5" style={{ color: '#6b7280' }} />
                Scheduler offline. Start with:{' '}
                <code style={{
                  fontFamily: MONO, fontSize: 10, color: 'rgba(198,255,52,0.7)',
                  background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '2px 8px',
                }}>
                  python backend/scheduler.py
                </code>
              </p>
            </motion.div>
          )}

          {lastError && status === 'error' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
              <p style={{ fontFamily: MONO, fontSize: 9, color: '#f87171', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                  Recent Runs
                </p>
                {history.length === 0
                  ? <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '8px 0' }}>No runs yet.</p>
                  : history.map(run => <HistoryRow key={run.run_id} run={run} />)
                }
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </motion.div>
  );
}
