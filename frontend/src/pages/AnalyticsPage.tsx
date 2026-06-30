import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { BarChart2, Activity, Zap } from 'lucide-react';
import { Lead } from '../types/lead';
import { cn } from '../lib/utils';
import { AnalyticsFilters, TimeFilterType } from '../components/analytics/AnalyticsFilters';
import { AnalyticsCards } from '../components/analytics/AnalyticsCards';
import { AnalyticsCharts } from '../components/analytics/AnalyticsCharts';

import { SchedulerStatusCard } from '../components/analytics/SchedulerStatusCard';
import { ExtraAnalyticsCharts } from '../components/analytics/ExtraAnalyticsCharts';
import { AdvancedInsights } from '../components/analytics/AdvancedInsights';
import { LoadingState, ErrorState } from '../components/EmptyStates';
import AmbientBackground from '../components/AmbientBackground';
import { glassStyle } from '../lib/glass';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const GODBER = "'Godber', sans-serif";
const SANS  = "'DM Sans', sans-serif";



export function AnalyticsPage({ leads, loading, error, retryFetch, isPro = false, onUpgrade }: AnalyticsPageProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const contentRef = useRef<HTMLDivElement>(null);

  // Reduced motion support
  const shouldReduceMotion = useReducedMotion() ?? false;

  // Scroll progress off the main content div
  const { scrollYProgress } = useScroll({ container: contentRef });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Section entrance variants
  const sectionVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] as const }
    }
  };



  // ─── In-memory date filtering ──────────────────────────────────────────────
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
    <div className="flex-1 bg-[#070708] min-h-screen relative flex flex-col overflow-hidden">
      <AmbientBackground />
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">

        {/* ── Scroll progress bar ──────────────────────────────────────────────── */}
        <motion.div
          className="fixed left-0 right-0 z-40 bg-gradient-to-r from-lime/40 via-lime to-lime/40"
          style={{
            scaleX,
            transformOrigin: 'left',
            top: '52px',
            height: '2px',
            pointerEvents: 'none',
          }}
        />

        {/* ── Scrollable content ────────────────────────────────────────────────── */}
        <div
          ref={contentRef}
          className="relative z-10 flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-24 space-y-6 select-none"
          style={{ scrollbarWidth: 'none' }}
        >

          {/* SECTION 1 — Header + Time Filters */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.5 }}
            style={{ ...glassStyle }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 md:p-5 rounded-2xl mb-3"
          >
            {/* Left: title */}
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-lime" />
              <div>
                <h1 className="font-display text-xl font-bold text-white">
                  Analytics Engine
                </h1>
                <p className="font-sans text-xs text-white/35 mt-0.5">
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
            viewport={{ once: true, margin: '-60px' }}
          >
            <SchedulerStatusCard shouldReduceMotion={shouldReduceMotion} />
          </motion.div>

          {/* SECTION 3 — Stat Cards */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <AnalyticsCards leads={filteredLeads} shouldReduceMotion={shouldReduceMotion} />
          </motion.div>

          {/* SECTION 4 + 5 — Charts */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <AnalyticsCharts leads={filteredLeads} shouldReduceMotion={shouldReduceMotion} />
          </motion.div>



          {/* SECTION 8 — Extended Insights */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="space-y-4"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 mb-2 select-none">
              <div style={{
                padding: '6px',
                background: 'rgba(198,255,52,0.06)',
                border: '1px solid rgba(198,255,52,0.15)',
                borderRadius: 8,
              }}>
                <BarChart2 className="w-3.5 h-3.5" style={{ color: '#C6FF34' }} />
              </div>
              <h2 className="font-mono text-[10px] text-white/25 tracking-widest uppercase">
                Extended Insights
              </h2>
              <div className="font-mono text-[10px] bg-[#C6FF34]/8 border border-[#C6FF34]/18 text-[#C6FF34]/60 rounded-full px-3 py-1">
                30-DAY WINDOW
              </div>
            </div>

            <div className="relative">
              <ExtraAnalyticsCharts
                leads={filteredLeads}
                loading={loading}
                shouldReduceMotion={shouldReduceMotion}
              />
            </div>
          </motion.div>

          {/* SECTION 9 — Advanced Insights */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="space-y-4"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 mb-2 select-none">
              <div style={{
                padding: '6px',
                background: 'rgba(198,255,52,0.06)',
                border: '1px solid rgba(198,255,52,0.15)',
                borderRadius: 8,
              }}>
                <Zap className="w-3.5 h-3.5" style={{ color: '#C6FF34' }} />
              </div>
              <h2 className="font-mono text-[10px] text-white/25 tracking-widest uppercase">
                Advanced Intelligence
              </h2>
              <div className="font-mono text-[10px] bg-[#C6FF34]/8 border border-[#C6FF34]/18 text-[#C6FF34]/60 rounded-full px-3 py-1">
                PRO FEATURES
              </div>
            </div>

            <AdvancedInsights
              leads={filteredLeads}
              isPro={isPro}
              onUpgrade={onUpgrade}
              shouldReduceMotion={shouldReduceMotion}
            />
          </motion.div>

        </div>

      </div>
    </div>
  );
}

interface AnalyticsPageProps {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  retryFetch: () => void;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export default AnalyticsPage;
