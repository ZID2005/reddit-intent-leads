import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { BarChart2, X, Activity, Zap } from 'lucide-react';
import { Lead } from '../types/lead';
import { cn } from '../lib/utils';
import { AnalyticsFilters, TimeFilterType } from '../components/analytics/AnalyticsFilters';
import { AnalyticsCards } from '../components/analytics/AnalyticsCards';
import { AnalyticsCharts } from '../components/analytics/AnalyticsCharts';
import { TopSubredditsTable } from '../components/analytics/TopSubredditsTable';
import { SchedulerStatusCard } from '../components/analytics/SchedulerStatusCard';
import { ExtraAnalyticsCharts } from '../components/analytics/ExtraAnalyticsCharts';
import { LoadingState, ErrorState } from '../components/EmptyStates';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const GODBER = "'Godber', sans-serif";
const NOHEMI = "'Nohemi', sans-serif";
const MONO  = "'DM Mono', monospace";
const SANS  = "'DM Sans', sans-serif";
const LIME  = '#C6FF34';

// ─── Liquid glass style ────────────────────────────────────────────────────────
export const glass: React.CSSProperties = {
  background:           'rgba(255, 255, 255, 0.035)',
  border:               '1px solid rgba(255, 255, 255, 0.08)',
  backdropFilter:       'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  borderRadius:         20,
  boxShadow:            '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
};

// ─── Section entrance variants ─────────────────────────────────────────────────
const sectionVariants = {
  hidden:  { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

interface AnalyticsPageProps {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  retryFetch: () => void;
  isPro?: boolean;
  onUpgrade?: () => void;
}

// ─── Floating panel stat item ──────────────────────────────────────────────────
function FabStat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      <div style={{ fontFamily: NOHEMI, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: NOHEMI, fontSize: 22, fontWeight: 700, color: accent ? LIME : '#fff', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

export function AnalyticsPage({ leads, loading, error, retryFetch, isPro = false, onUpgrade }: AnalyticsPageProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [fabOpen, setFabOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll progress off the main content div
  const { scrollYProgress } = useScroll({ container: contentRef });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Close FAB panel on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFabOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ─── In-memory date filtering (unchanged logic) ────────────────────────────
  const filteredLeads = useMemo(() => {
    if (timeFilter === 'all') return leads;
    const now = new Date();
    const cutoff = new Date();
    if (timeFilter === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (timeFilter === '7days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeFilter === '30days') {
      cutoff.setDate(now.getDate() - 30);
    }
    return leads.filter(l => {
      const dateVal = l.created_at || l.processed_at;
      if (!dateVal) return false;
      return new Date(dateVal) >= cutoff;
    });
  }, [leads, timeFilter]);

  // ─── Quick stats for FAB panel ─────────────────────────────────────────────
  const quickStats = useMemo(() => {
    const high = filteredLeads.filter(l => l.priority === 'high').length;
    const withIntent = filteredLeads.filter(l => l.intent_score > 0);
    const avgScore = withIntent.length > 0
      ? Math.round(withIntent.reduce((s, l) => s + l.intent_score, 0) / withIntent.length)
      : 0;
    const today = filteredLeads.filter(l => {
      const dv = l.created_at || l.processed_at;
      if (!dv) return false;
      const start = new Date(); start.setHours(0,0,0,0);
      return new Date(dv) >= start;
    }).length;
    return { total: filteredLeads.length, high, avgScore, today };
  }, [filteredLeads]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6" style={{ background: '#070708' }}>
        <div className="h-10 w-48 bg-white/5 rounded shimmer" />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex items-center justify-center" style={{ background: '#070708' }}>
        <ErrorState message={error} onRetry={retryFetch} />
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden" style={{ background: '#070708' }}>

      {/* ── Scroll progress bar ──────────────────────────────────────────────── */}
      <motion.div
        style={{
          scaleX,
          transformOrigin: 'left',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${LIME}, rgba(198,255,52,0.3))`,
          zIndex: 200,
          pointerEvents: 'none',
        }}
      />

      {/* ── Ambient lime orbs ─────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 80, -50, 0], y: [0, -60, 40, 0], scale: [1, 1.22, 0.88, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '10%', left: '6%',
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(198,255,52,0.09) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{ x: [0, -60, 40, 0], y: [0, 55, -75, 0], scale: [1, 0.84, 1.16, 1] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          style={{
            position: 'absolute', bottom: '12%', right: '4%',
            width: 380, height: 380, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(198,255,52,0.07) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
        <motion.div
          animate={{ x: [0, 44, -28, 0], y: [0, -38, 58, 0], scale: [1, 1.08, 0.93, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 11 }}
          style={{
            position: 'absolute', top: '48%', left: '42%',
            width: 560, height: 260, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(198,255,52,0.04) 0%, transparent 70%)',
            filter: 'blur(120px)',
          }}
        />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.012) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 pb-24 md:pb-8 space-y-6 select-none"
        style={{ scrollbarWidth: 'none' }}
      >

        {/* SECTION 1 — Header + Time Filters */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          style={{ ...glass }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5"
        >
          {/* Left: title */}
          <div className="flex items-center gap-3">
            <div style={{
              padding: '8px',
              background: 'rgba(198,255,52,0.08)',
              border: '1px solid rgba(198,255,52,0.2)',
              borderRadius: 10,
            }}>
              <Activity className="w-4 h-4" style={{ color: LIME }} />
            </div>
            <div>
              <h1 style={{
                fontFamily: GODBER, fontWeight: 800, fontSize: '1.35rem',
                color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.1,
              }}>
                Analytics Engine
              </h1>
              <p style={{ fontFamily: SANS, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Real-time aggregate performance metrics and visual trends
              </p>
            </div>
          </div>

          {/* Right: time filter */}
          <AnalyticsFilters value={timeFilter} onChange={setTimeFilter} />
        </motion.div>

        {/* SECTION 2 — Scheduler Status */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <SchedulerStatusCard />
        </motion.div>

        {/* SECTION 3 — Stat Cards */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <AnalyticsCards leads={filteredLeads} />
        </motion.div>

        {/* SECTION 4 + 5 — Charts */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <AnalyticsCharts leads={filteredLeads} />
        </motion.div>

        {/* SECTION 7 — Top Subreddits Table */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="pt-2"
        >
          <TopSubredditsTable leads={filteredLeads} />
        </motion.div>

        {/* SECTION 8 — Extended Insights */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="space-y-4"
        >
          {/* Section header */}
          <div className="flex items-center gap-3">
            <div style={{
              padding: '6px',
              background: 'rgba(198,255,52,0.06)',
              border: '1px solid rgba(198,255,52,0.15)',
              borderRadius: 8,
            }}>
              <BarChart2 className="w-3.5 h-3.5" style={{ color: LIME }} />
            </div>
            <h2 style={{
              fontFamily: GODBER, fontWeight: 700, fontSize: '1rem',
              color: '#fff', letterSpacing: '-0.01em',
            }}>
              Extended Insights
            </h2>
            <div style={{
              fontFamily: NOHEMI, fontSize: 9, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20, padding: '2px 8px',
            }}>
              30-day window
            </div>
          </div>

          <div className="relative">
            <div className={cn(
              "transition-all duration-300",
              !isPro ? "blur-md pointer-events-none select-none" : ""
            )}>
              <ExtraAnalyticsCharts leads={filteredLeads} loading={loading} />
            </div>
            {!isPro && (
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 rounded-2xl"
                style={{
                  background: 'rgba(7,7,8,0.75)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Zap className="w-8 h-8 text-[#C6FF34] mb-3 animate-bounce" />
                <h4 style={{ fontFamily: GODBER, fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                  Advanced Analytics Locked
                </h4>
                <p style={{ fontFamily: SANS, fontSize: 12, color: 'rgba(255,255,255,0.5)', maxWidth: 280, marginBottom: 16 }}>
                  Upgrade to Pro to unlock historical trend charts, vertical distributions, and deep intent analytics.
                </p>
                <button
                  onClick={onUpgrade}
                  className="px-5 py-2.5 bg-[#C6FF34] text-black font-bold font-mono text-xs rounded-xl hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer outline-none"
                  style={{ boxShadow: '0 0 16px rgba(198,255,52,0.2)' }}
                >
                  Unlock Pro Analytics
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Bottom padding for FAB */}
        <div className="h-20" />
      </div>

      {/* ── Floating Action Button ─────────────────────────────────────────────── */}
      <div className="fixed bottom-[80px] md:bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* FAB summary panel */}
        <AnimatePresence>
          {fabOpen && (
            <>
              {/* Outside click backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setFabOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  ...glass,
                  width: 288,
                  padding: '20px',
                  position: 'relative',
                  zIndex: 50,
                  transformOrigin: 'bottom right',
                }}
              >
                {/* Close */}
                <button
                  onClick={() => setFabOpen(false)}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '4px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X className="w-3.5 h-3.5 text-white/50" />
                </button>

                <div style={{ fontFamily: NOHEMI, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                  Quick Summary
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FabStat label="Total Leads" value={quickStats.total} />
                  <FabStat label="High Priority" value={quickStats.high} accent />
                  <FabStat label="Avg Score" value={`${quickStats.avgScore}%`} />
                  <FabStat label="Today" value={quickStats.today} />
                </div>

                {/* Top highlight */}
                <div style={{
                  position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                  background: `linear-gradient(90deg, transparent, rgba(198,255,52,0.4), transparent)`,
                }} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* FAB button */}
        <motion.button
          onClick={() => setFabOpen(v => !v)}
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          style={{
            ...glass,
            width: 56, height: 56,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(198,255,52,0.2), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          transition={{ duration: 0.25 }}
        >
          <BarChart2 className="w-6 h-6" style={{ color: LIME }} />
        </motion.button>
      </div>

    </div>
  );
}

export default AnalyticsPage;
