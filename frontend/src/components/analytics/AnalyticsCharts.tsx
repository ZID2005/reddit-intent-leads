import React from 'react';
import { motion } from 'framer-motion';
import { Lead } from '../../types/lead';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  LabelList,
} from 'recharts';
import { ChartDialog } from '../ChartDialog';
import {
  limeGradient,
} from '../../lib/chartTheme';

interface AnalyticsChartsProps {
  leads: Lead[];
  shouldReduceMotion?: boolean;
}

export function AnalyticsCharts({ leads, shouldReduceMotion = false }: AnalyticsChartsProps) {
  // ── 1. Intent Score Distribution ─────────────────────────────────────────
  const histogramData = React.useMemo(() => {
    const buckets = [
      { name: '0–20', count: 0 },
      { name: '21–40', count: 0 },
      { name: '41–60', count: 0 },
      { name: '61–80', count: 0 },
      { name: '81–100', count: 0 },
    ];
    leads.forEach(l => {
      const s = l.intent_score || 0;
      if (s <= 20) buckets[0].count++;
      else if (s <= 40) buckets[1].count++;
      else if (s <= 60) buckets[2].count++;
      else if (s <= 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [leads]);

  const peakBracket = React.useMemo(() => {
    if (histogramData.length === 0) return 'N/A';
    let max = histogramData[0];
    histogramData.forEach(b => {
      if (b.count > max.count) {
        max = b;
      }
    });
    return max.count > 0 ? max.name : 'N/A';
  }, [histogramData]);

  // ── Render Helpers ────────────────────────────────────────────────────────
  const renderIntentChart = (height: number, idPrefix = 'compact') => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={histogramData} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
        {limeGradient(`${idPrefix}-intentGrad`)}
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'DM Mono' }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'DM Mono' }} />
        <RechartsTooltip
          contentStyle={{
            background: 'rgba(7,7,8,0.97)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(24px)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            padding: '10px 14px',
          }}
          labelStyle={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: 4 }}
          itemStyle={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#C6FF34', fontWeight: 500 }}
          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
        />
        <Bar
          dataKey="count"
          fill={`url(#${idPrefix}-intentGrad)`}
          stroke="rgba(198,255,52,0.35)"
          strokeWidth={1.5}
          radius={[4, 4, 0, 0]}
          barSize={idPrefix === 'expanded' ? 52 : 32}
          isAnimationActive={!shouldReduceMotion}
        >
          <LabelList
            dataKey="count"
            position="top"
            offset={8}
            fill="rgba(198,255,52,0.85)"
            style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 500 }}
          />
          {histogramData.map((_, i) => (
            <Cell key={`cell-${i}`} className="cursor-pointer hover:fill-opacity-100 transition-all duration-200" fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const cardVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] as const }
    },
  };

  return (
    <>
      {/* 3. Intent Score Distribution */}
      <ChartDialog
        title="Intent Score Distribution"
        expandedChildren={renderIntentChart(400, 'expanded')}
      >
        <motion.div
          variants={cardVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: 'rgba(255,255,255,0.11)', transition: { duration: 0.25 } }}
          className="bg-white/[0.035] border border-white/[0.07] backdrop-blur-2xl rounded-2xl overflow-hidden relative flex flex-col w-full p-5"
        >
          {/* Decorative lime top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />

          <div className="flex justify-between items-start mb-5 relative z-10">
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase">
                Intent Score Distribution
              </div>
              <p className="text-[11px] text-white/45">
                Commercial intent score spread across leads
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <span className="block text-[8px] font-mono text-white/30 uppercase tracking-widest">Total Leads</span>
                <span className="font-mono text-xs font-semibold text-white/85">{leads.length}</span>
              </div>
              <div>
                <span className="block text-[8px] font-mono text-white/30 uppercase tracking-widest">Peak Range</span>
                <span className="font-mono text-xs font-semibold text-lime">{peakBracket}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 relative min-h-0">
            {leads.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] font-mono text-[11px] text-white/30">
                No data available
              </div>
            ) : (
              <div className="h-[220px] w-full">
                {renderIntentChart(220, 'compact')}
              </div>
            )}
          </div>
        </motion.div>
      </ChartDialog>
    </>
  );
}
