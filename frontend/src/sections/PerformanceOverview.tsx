import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ArrowRight, TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, BarChart2 } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type IconKey = 'finance' | 'users' | 'product' | 'chart';

interface Metric {
  id: string;
  label: string;
  value: string;
  changePercent: number;
  icon: IconKey;
}

interface Activity {
  id: string;
  title: string;
  timestamp: string;
  value: string;
  isPositive: boolean;
}

interface Period {
  id: string;
  label: string;
  metrics: Metric[];
  activities: Activity[];
}

export interface PerformanceOverviewProps {
  title: string;
  accentWord: string;
  subtitle: string;
  ctaLabel: string;
  onCtaClick: () => void;
  periods: Period[];
  defaultPeriodId: string;
}

/* ─────────────────────────────────────────────
   Icon map
───────────────────────────────────────────── */
const IconMap: Record<IconKey, React.FC<{ className?: string }>> = {
  finance: ({ className }) => <DollarSign className={className} />,
  users: ({ className }) => <Users className={className} />,
  product: ({ className }) => <ShoppingBag className={className} />,
  chart: ({ className }) => <BarChart2 className={className} />,
};

/* ─────────────────────────────────────────────
   Metric Card
───────────────────────────────────────────── */
const MetricCard: React.FC<{ metric: Metric; index: number; prefersReducedMotion: boolean }> = ({
  metric,
  index,
  prefersReducedMotion,
}) => {
  const Icon = IconMap[metric.icon];
  const positive = metric.changePercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl p-3.5 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Icon bubble */}
      <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2.5"
        style={{ background: 'rgba(198,255,52,0.12)' }}>
        <Icon className="w-3.5 h-3.5 text-[#C6FF34]" />
      </div>

      <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase mb-1">{metric.label}</p>
      <p className="text-lg font-bold text-white font-display leading-none mb-1.5">{metric.value}</p>

      {/* Change pill */}
      <span
        className={`inline-flex items-center gap-0.5 text-[9px] font-mono font-bold tracking-wide ${
          positive ? 'text-[#C6FF34]' : 'text-red-400'
        }`}
      >
        {positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
        {positive ? '+' : ''}{metric.changePercent}%
      </span>

      {/* Subtle glow behind positive cards */}
      {positive && (
        <div
          className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(198,255,52,0.08) 0%, transparent 70%)',
          }}
        />
      )}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   Activity Row
───────────────────────────────────────────── */
const ActivityRow: React.FC<{ activity: Activity; index: number; prefersReducedMotion: boolean }> = ({
  activity,
  index,
  prefersReducedMotion,
}) => (
  <motion.div
    initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay: 0.55 + index * 0.08, ease: 'easeOut' }}
    className="flex items-center gap-3 py-2.5"
    style={{ borderBottom: index === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
  >
    {/* Clock icon bubble */}
    <div
      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-white truncate">{activity.title}</p>
      <p className="text-[9px] text-gray-500 font-mono">{activity.timestamp}</p>
    </div>
    <span
      className={`text-[11px] font-bold font-mono flex-shrink-0 ${
        activity.isPositive ? 'text-[#C6FF34]' : 'text-red-400'
      }`}
    >
      {activity.value}
    </span>
  </motion.div>
);

/* ─────────────────────────────────────────────
   Phone Mockup (right column)
───────────────────────────────────────────── */
const PhoneMockup: React.FC<{ period: Period; prefersReducedMotion: boolean }> = ({
  period,
  prefersReducedMotion,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96, y: prefersReducedMotion ? 0 : 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    className="relative mx-auto"
    style={{ width: 280, maxWidth: '100%' }}
  >
    {/* Ambient glow behind phone */}
    <div
      className="absolute inset-0 rounded-[44px] pointer-events-none"
      style={{
        filter: 'blur(60px)',
        background: 'radial-gradient(ellipse at 60% 40%, rgba(198,255,52,0.14) 0%, transparent 70%)',
        transform: 'scale(1.2)',
      }}
    />

    {/* Phone shell */}
    <div
      className="relative rounded-[38px] overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #1a1a1c 0%, #111113 60%, #0d0d0f 100%)',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
        padding: '12px 10px 10px',
      }}
    >
      {/* Notch */}
      <div className="flex justify-center mb-3">
        <div
          className="w-24 h-5 rounded-full"
          style={{ background: '#0a0a0b', border: '2px solid rgba(255,255,255,0.06)' }}
        />
      </div>

      {/* Screen content */}
      <div className="rounded-[28px] overflow-hidden px-3 pb-3 pt-1"
        style={{ background: '#0f0f11' }}>

        {/* Metric grid 2×2 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {period.metrics.map((m, i) => (
            <MetricCard key={m.id} metric={m} index={i} prefersReducedMotion={prefersReducedMotion} />
          ))}
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-xl px-3 pt-3 pb-1"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-white font-mono tracking-wider uppercase">Recent Activity</span>
            <span className="text-[9px] text-[#C6FF34] font-mono font-bold cursor-pointer hover:text-white transition-colors">
              View All
            </span>
          </div>
          {period.activities.map((a, i) => (
            <ActivityRow key={a.id} activity={a} index={i} prefersReducedMotion={prefersReducedMotion} />
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────
   Period Tab
───────────────────────────────────────────── */
const PeriodTab: React.FC<{
  period: Period;
  isActive: boolean;
  onClick: () => void;
}> = ({ period, isActive, onClick }) => (
  <button
    onClick={onClick}
    className="relative px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors duration-200 cursor-pointer"
    style={{ color: isActive ? '#C6FF34' : 'rgba(255,255,255,0.35)' }}
  >
    {isActive && (
      <motion.span
        layoutId="period-indicator"
        className="absolute inset-0 rounded-lg"
        style={{ background: 'rgba(198,255,52,0.08)', border: '1px solid rgba(198,255,52,0.2)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    )}
    <span className="relative z-10">{period.label}</span>
  </button>
);

/* ─────────────────────────────────────────────
   PerformanceOverview — main export
───────────────────────────────────────────── */
export function PerformanceOverview({
  title,
  accentWord,
  subtitle,
  ctaLabel,
  onCtaClick,
  periods,
  defaultPeriodId,
}: PerformanceOverviewProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activePeriodId, setActivePeriodId] = useState(defaultPeriodId);
  const activePeriod = periods.find((p) => p.id === activePeriodId) ?? periods[0];

  const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 22 },
    visible: (d: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: d, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <section
      className="relative py-28 px-6 md:px-12 select-none overflow-hidden"
      style={{ background: '#070708' }}
    >
      {/* Ambient green radial glow */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          right: '-5%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(198,255,52,0.12) 0%, transparent 68%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute pointer-events-none z-0"
        style={{
          left: '-8%',
          bottom: '0',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(198,255,52,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Card container */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-6xl mx-auto rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15,15,17,0.95) 0%, rgba(10,10,12,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
          backdropFilter: 'blur(32px)',
        }}
      >
        {/* Subtle animated blob inside card */}
        <motion.div
          animate={prefersReducedMotion ? {} : { x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute pointer-events-none z-0"
          style={{
            top: '-60px',
            right: '30%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(198,255,52,0.04)',
            filter: 'blur(80px)',
          }}
        />

        {/* Two-column layout */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 p-10 md:p-14 lg:p-16">

          {/* ── LEFT: Copy ── */}
          <div className="flex-1 flex flex-col items-start gap-6 max-w-xl">

            {/* Eyebrow badge */}
            <motion.div
              custom={0.1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariants}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
              style={{
                background: 'rgba(198,255,52,0.06)',
                border: '1px solid rgba(198,255,52,0.18)',
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: '#C6FF34', boxShadow: '0 0 6px #C6FF34' }}
              />
              <span className="text-[9px] md:text-[10px] font-mono font-bold text-[#C6FF34] tracking-widest uppercase">
                Live Performance Dashboard
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              custom={0.2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariants}
              className="font-display font-bold leading-[1.05] text-white"
              style={{ fontSize: 'clamp(32px, 4vw, 54px)', letterSpacing: '-0.03em' }}
            >
              {title}{' '}
              <span style={{ color: '#C6FF34' }}>{accentWord}</span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              custom={0.32}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariants}
              className="text-sm md:text-base leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 420 }}
            >
              {subtitle}
            </motion.p>

            {/* Period tabs */}
            <motion.div
              custom={0.42}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariants}
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {periods.map((p) => (
                <PeriodTab
                  key={p.id}
                  period={p}
                  isActive={p.id === activePeriodId}
                  onClick={() => setActivePeriodId(p.id)}
                />
              ))}
            </motion.div>

            {/* CTA button */}
            <motion.div
              custom={0.52}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariants}
            >
              <motion.button
                whileHover={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: -2,
                        boxShadow: '0 0 32px rgba(198,255,52,0.45)',
                        filter: 'brightness(1.08)',
                      }
                }
                whileTap={{ scale: 0.97 }}
                onClick={onCtaClick}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200"
                style={{
                  background: '#C6FF34',
                  color: '#070708',
                  boxShadow: '0 0 18px rgba(198,255,52,0.25)',
                  minHeight: 48,
                }}
              >
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>

            {/* Trust micro-copy */}
            <motion.p
              custom={0.6}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariants}
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              No credit card required · Cancel anytime · 50 free leads
            </motion.p>
          </div>

          {/* ── RIGHT: Phone mockup ── */}
          <div className="flex-shrink-0 w-full lg:w-auto flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePeriodId}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -16 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                <PhoneMockup period={activePeriod} prefersReducedMotion={prefersReducedMotion} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default PerformanceOverview;
