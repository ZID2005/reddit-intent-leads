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
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useScheduler, SchedulerRunRecord } from '../../hooks/useScheduler';

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
export function SchedulerStatusCard() {
  const {
    status, intervalHours, lastRunAt, nextRunAt,
    lastRunInserted, lastRunFetched, lastRunScored, lastRunDuplicates, lastRunFailures,
    lastError, history, apiOnline, triggerLoading, triggerError, configLoading,
    triggerRun, changeInterval,
  } = useScheduler();

  const [showHistory,    setShowHistory]    = useState(false);
  const [nextRunDisplay, setNextRunDisplay] = useState('—');
  const [lastRunDisplay, setLastRunDisplay] = useState('—');

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;

  useEffect(() => {
    const tick = () => { setNextRunDisplay(countdown(nextRunAt)); setLastRunDisplay(relativeTime(lastRunAt)); };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [nextRunAt, lastRunAt]);

  // Stat mini-block
  const MiniStat = ({ icon, label, value, subValue, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; subValue?: string; accent?: boolean }) => (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, color: 'rgba(255,255,255,0.35)' }}>
        {icon}
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 500, color: accent ? LIME : '#fff', lineHeight: 1 }}>{value}</div>
      {subValue && <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{subValue}</div>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...glass, overflow: 'hidden', borderLeft: `2px solid ${LIME}` }}
    >
      {/* Status-colored top accent bar */}
      <div style={{
        height: 2, width: '100%',
        background: status === 'running' ? '#fbbf24' : status === 'error' ? '#ef4444' : status === 'offline' ? '#6b7280' : LIME,
      }} />

      <div style={{ padding: '20px' }}>
        {/* ── Header row ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ padding: '6px', background: 'rgba(198,255,52,0.08)', border: '1px solid rgba(198,255,52,0.18)', borderRadius: 8 }}>
                <Zap className="w-3.5 h-3.5" style={{ color: LIME }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(198,255,52,0.6)' }}>
                Auto-Refresh Pipeline
              </span>
            </div>
            <h2 style={{ fontFamily: GODBER, fontWeight: 700, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>
              Scheduler Status
            </h2>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 99,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: cfg.textColor,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: cfg.dotColor,
              boxShadow: `0 0 8px ${cfg.dotColor}`,
              animation: cfg.pulse ? 'pulse 1.5s infinite' : 'none',
            }} />
            {cfg.icon}
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* ── Metrics grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MiniStat
            icon={<Clock className="w-3 h-3" />} label="Last Run"
            value={lastRunDisplay}
            subValue={lastRunAt ? formatTime(lastRunAt) : undefined}
          />
          <MiniStat
            icon={<RefreshCw className="w-3 h-3" />} label="Next Run"
            value={apiOnline ? nextRunDisplay : '—'}
            subValue={nextRunAt && apiOnline ? formatTime(nextRunAt) : undefined}
            accent={apiOnline}
          />
          <MiniStat
            icon={<TrendingUp className="w-3 h-3" />} label="Last Added"
            value={`+${lastRunInserted}`}
            subValue={`${lastRunFetched} fetched · ${lastRunDuplicates} dupes`}
          />
          <MiniStat
            icon={<AlertTriangle className="w-3 h-3" />} label="Failures"
            value={<span style={{ color: lastRunFailures > 0 ? '#f87171' : '#fff' }}>{lastRunFailures}</span>}
            subValue={`${lastRunScored} scored`}
          />
        </div>

        {/* ── Controls row ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Interval selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
              Interval:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '3px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
              {INTERVALS.map(h => {
                const isActive = h === intervalHours;
                return (
                  <button
                    key={h}
                    id={`scheduler-interval-${h}h`}
                    onClick={() => changeInterval(h)}
                    disabled={configLoading || !apiOnline}
                    style={{
                      position: 'relative', padding: '4px 10px', borderRadius: 6,
                      fontFamily: MONO, fontSize: 9, fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#0a0a0a' : 'rgba(255,255,255,0.45)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      opacity: (configLoading || !apiOnline) ? 0.4 : 1,
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeInterval"
                        style={{ position: 'absolute', inset: 0, background: LIME, borderRadius: 6, zIndex: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>{h}h</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* History toggle */}
          <button
            id="scheduler-history-toggle"
            onClick={() => setShowHistory(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', fontFamily: MONO, fontSize: 9,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            <Copy className="w-3 h-3" />
            History
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Run Now */}
          <motion.button
            id="scheduler-run-now"
            onClick={triggerRun}
            disabled={triggerLoading || status === 'running' || !apiOnline}
            whileHover={{ scale: apiOnline ? 1.02 : 1 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 10,
              fontFamily: MONO, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: !apiOnline ? 'not-allowed' : 'pointer',
              transition: 'box-shadow 0.2s',
              ...(!apiOnline
                ? { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }
                : status === 'running' || triggerLoading
                ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }
                : { background: LIME, color: '#0a0a0a', border: `1px solid ${LIME}`, boxShadow: '0 0 0 rgba(198,255,52,0)' }
              ),
            }}
            onMouseEnter={e => {
              if (apiOnline && status !== 'running' && !triggerLoading) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(198,255,52,0.4)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 rgba(198,255,52,0)';
            }}
          >
            {triggerLoading || status === 'running'
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Play className="w-3.5 h-3.5" />
            }
            {triggerLoading ? 'Triggering…' : status === 'running' ? 'Running…' : 'Run Now'}
          </motion.button>
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
      </div>
    </motion.div>
  );
}
