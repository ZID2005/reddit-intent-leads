import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Database, Layers, BarChart3, PieChart } from 'lucide-react';
import { Lead } from '../../types/lead';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Sector,
} from 'recharts';
import { ChartDialog } from '../ChartDialog';
import { glassStyle } from '../../lib/glass';
import {
  tooltipStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  limeGradient,
  areaGradient,
} from '../../lib/chartTheme';

interface ExtraAnalyticsChartsProps {
  leads: Lead[];
  loading: boolean;
  shouldReduceMotion?: boolean;
}

// ─── Client-side PNG/JSON Exporters ───────────────────────────────────────────
function exportPng(svgEl: SVGSVGElement | null, fileName: string) {
  if (!svgEl) return;
  try {
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob   = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL   = URL.createObjectURL(svgBlob);
    const image     = new Image();
    image.onload = () => {
      const canvas  = document.createElement('canvas');
      const bbox    = svgEl.getBoundingClientRect();
      canvas.width  = bbox.width * 2;
      canvas.height = bbox.height * 2;
      const ctx     = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.fillStyle = '#070708';
        ctx.fillRect(0, 0, bbox.width, bbox.height);
        ctx.drawImage(image, 0, 0, bbox.width, bbox.height);
        const pngURL = canvas.toDataURL('image/png');
        const a      = document.createElement('a');
        a.href       = pngURL;
        a.download   = `${fileName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  } catch (err) {
    console.error('Error exporting PNG:', err);
  }
}

function exportJson(data: unknown, fileName: string) {
  try {
    const str  = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a    = document.createElement('a');
    a.href     = str;
    a.download = `${fileName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Error exporting JSON:', err);
  }
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
        filter="url(#pieGlow)"
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
    </g>
  );
};

export function ExtraAnalyticsCharts({ leads, loading, shouldReduceMotion = false }: ExtraAnalyticsChartsProps) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  // ── 1. Leads Per Day (Last 30 Days) ────────────────────────────────────────
  const leadsPerDayData = useMemo(() => {
    const dates: { dateStr: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label   = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dates.push({ dateStr, label, count: 0 });
    }
    leads.forEach(l => {
      const dv = l.created_at || l.processed_at;
      if (!dv) return;
      const ds = new Date(dv).toISOString().slice(0, 10);
      const m  = dates.find(d => d.dateStr === ds);
      if (m) m.count++;
    });
    return dates.map(({ label, count }) => ({ date: label, count }));
  }, [leads]);

  // ── 2. Category Distribution ───────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const counts = { buying_intent: 0, pain_point: 0, comparison: 0, research: 0, uncategorized: 0 };
    leads.forEach(l => {
      if (l.category in counts) counts[l.category as keyof typeof counts]++;
      else counts.uncategorized++;
    });
    const labels = {
      buying_intent: 'Buying Intent',
      pain_point: 'Pain Point',
      comparison: 'Comparison',
      research: 'Research',
      uncategorized: 'Uncategorized',
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).map(([key, count]) => ({
      key,
      name: labels[key as keyof typeof labels],
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [leads]);

  // ── 3. Top Subreddits (Full and Sliced) ────────────────────────────────────
  const topSubredditsDataAll = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.subreddit] = (counts[l.subreddit] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const topSubredditsCompact = useMemo(() => topSubredditsDataAll.slice(0, 8), [topSubredditsDataAll]);
  const topSubredditsExpanded = useMemo(() => topSubredditsDataAll.slice(0, 15), [topSubredditsDataAll]);

  // ── 4. Funnel Data ─────────────────────────────────────────────────────────
  const totalNew       = leads.length;
  const totalSaved     = leads.filter(l => l.status === 'saved' || l.status === 'contacted').length;
  const totalContacted = leads.filter(l => l.status === 'contacted').length;

  const savedPct       = totalNew > 0 ? Math.round((totalSaved / totalNew) * 100) : 0;
  const contactedPct   = totalSaved > 0 ? Math.round((totalContacted / totalSaved) * 100) : 0;
  const overallPct     = totalNew > 0 ? Math.round((totalContacted / totalNew) * 100) : 0;

  // ── Render Helpers ────────────────────────────────────────────────────────
  const renderLeadsPerDayChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={leadsPerDayData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="leadsAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6FF34" stopOpacity={0.22} />
            <stop offset="75%" stopColor="#C6FF34" stopOpacity={0.04} />
            <stop offset="100%" stopColor="#C6FF34" stopOpacity={0} />
          </linearGradient>
          <filter id="lineglow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: 'rgba(255,255,255,0.25)' }}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: 'rgba(255,255,255,0.2)' }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <RechartsTooltip
          contentStyle={{
            background: 'rgba(7,7,8,0.97)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(24px)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            padding: '10px 14px',
          }}
          labelStyle={{ fontFamily: 'DM Mono', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginBottom: 4 }}
          itemStyle={{ fontFamily: 'DM Mono', fontSize: 13, color: '#C6FF34', fontWeight: 500 }}
          cursor={{ stroke: 'rgba(198,255,52,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#C6FF34"
          strokeWidth={2}
          fill="url(#leadsAreaGrad)"
          dot={{ fill: '#C6FF34', r: 3, stroke: 'rgba(7,7,8,1)', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#C6FF34', stroke: 'rgba(198,255,52,0.3)', strokeWidth: 3, filter: 'url(#lineglow)' }}
          filter="url(#lineglow)"
          isAnimationActive={true}
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderCategoryPie = (innerRadius: number, outerRadius: number, chartSize: number, isExpanded = false) => {
    const RechartsPie = Pie as any;
    const legendContainerVariants = {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: shouldReduceMotion ? 0 : 0.06
        }
      }
    };

    const legendItemVariants = {
      hidden: { opacity: 0, x: 10 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
    };

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 w-full">
        {/* Left: chart */}
        <div className="relative flex-shrink-0" style={{ width: chartSize, height: chartSize }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <defs>
                <filter id="pieGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <RechartsTooltip
                contentStyle={{
                  background: 'rgba(7,7,8,0.97)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  backdropFilter: 'blur(24px)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                  padding: '10px 14px',
                }}
              />
              <RechartsPie
                data={categoryData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                stroke="none"
                paddingAngle={3}
                startAngle={90}
                endAngle={450}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_: any, index: number) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
                isAnimationActive={!shouldReduceMotion}
              >
                {categoryData.map((entry, index) => {
                  let color = 'rgba(255,255,255,0.15)';
                  if (entry.key === 'buying_intent') color = '#C6FF34';
                  else if (entry.key === 'pain_point') color = '#E8A838';
                  else if (entry.key === 'comparison') color = '#60A5FA';
                  else if (entry.key === 'research') color = '#A78BFA';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </RechartsPie>
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="font-mono text-[9px] text-white/30 tracking-widest uppercase">
              AI ANALYZED
            </span>
            <span className={`font-display font-bold text-white mt-0.5 ${isExpanded ? 'text-4xl' : 'text-2xl'}`}>
              {leads.length}
            </span>
          </div>
        </div>

        {/* Right: legend */}
        <motion.div
          variants={legendContainerVariants}
          initial="hidden"
          animate="visible"
          className="flex-grow flex flex-col gap-2.5 w-full"
        >
          {categoryData.map((d, index) => {
            let color = 'rgba(255,255,255,0.15)';
            if (d.key === 'buying_intent') color = '#C6FF34';
            else if (d.key === 'pain_point') color = '#E8A838';
            else if (d.key === 'comparison') color = '#60A5FA';
            else if (d.key === 'research') color = '#A78BFA';

            const isHovered = activeIndex === index;

            return (
              <motion.div
                key={d.name}
                variants={legendItemVariants}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
                className={`flex items-center justify-between w-full cursor-pointer transition-all duration-200 ${
                  isHovered ? 'scale-[1.02] translate-x-1' : ''
                } ${
                  activeIndex !== -1 && !isHovered ? 'opacity-40' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 transition-shadow duration-300"
                    style={{
                      background: color,
                      boxShadow: isHovered ? `0 0 8px ${color}` : 'none'
                    }}
                  />
                  <span className={`font-mono text-white/55 transition-colors duration-200 ${
                    isHovered ? 'text-white font-medium' : ''
                  } ${isExpanded ? 'text-sm' : 'text-xs'}`}>
                    {d.name}
                  </span>
                </div>
                <div className="flex items-center ml-2">
                  <span className={`font-mono text-white/70 font-medium ${isExpanded ? 'text-sm' : 'text-xs'}`}>
                    {d.count}
                  </span>
                  <span className="font-mono text-[10px] text-white/30 ml-2">
                    ({d.percent}%)
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    );
  };

  const renderSubredditBars = (data: typeof topSubredditsCompact, isExpanded = false) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[220px] font-mono text-[11px] text-white/30">
          No data available
        </div>
      );
    }
    const maxValue = Math.max(...data.map(d => d.count), 1);

    return (
      <div className="flex flex-col gap-2 w-full py-1">
        {data.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 py-1.5 group cursor-default"
          >
            <span className="font-mono text-[11px] text-white/50 text-right shrink-0 w-24 group-hover:text-[#C6FF34] transition-colors truncate">
              {item.name}
            </span>
            <div className={`flex-1 ${isExpanded ? 'h-6' : 'h-5'} rounded-md overflow-hidden relative bg-white/[0.04] border border-white/[0.05]`}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${(item.count / maxValue) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
                className="h-full rounded-md relative overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, rgba(198,255,52,0.85) 0%, rgba(198,255,52,0.5) 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: 'linear-gradient(90deg, rgba(198,255,52,0.08) 0%, transparent 60%)' }}
              />
            </div>
            <span className="font-mono text-xs text-white/45 shrink-0 w-8 text-right group-hover:text-white/70 transition-colors">
              {item.count}
            </span>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderFunnelLayers = (isExpanded: boolean) => {
    const incomingValue = totalNew;
    const shortlistedValue = totalSaved;
    const outreachValue = totalContacted;
    const shortlistedPct = `${savedPct}%`;
    const outreachPct = `${contactedPct}%`;

    const funnelLayers = [
      {
        label: 'Incoming Leads',
        value: incomingValue,
        percentage: '100%',
        color: '#C6FF34',
        textColor: '#0a0a0a',
        width: '100%',
        bg: 'rgba(198,255,52,0.15)',
        border: 'rgba(198,255,52,0.35)',
      },
      {
        label: 'Shortlisted Leads',
        value: shortlistedValue,
        percentage: shortlistedPct,
        color: '#E8A838',
        textColor: 'rgba(255,255,255,0.8)',
        width: '65%',
        bg: 'rgba(232,168,56,0.12)',
        border: 'rgba(232,168,56,0.3)',
      },
      {
        label: 'Outreach Initiated',
        value: outreachValue,
        percentage: outreachPct,
        color: '#60A5FA',
        textColor: 'rgba(255,255,255,0.8)',
        width: '38%',
        bg: 'rgba(96,165,250,0.12)',
        border: 'rgba(96,165,250,0.28)',
      },
    ];

    return (
      <div className={`flex flex-col ${isExpanded ? 'gap-4 py-4' : 'gap-3 py-2'} w-full justify-center h-full relative`}>
        {funnelLayers.map((layer, index) => (
          <div key={layer.label} className="w-full relative flex flex-col items-center">
            {index > 0 && (
              <div
                className={`w-px absolute left-1/2 -translate-x-1/2 ${
                  isExpanded ? 'h-4 -top-4' : 'h-3 -top-3'
                }`}
                style={{
                  backgroundColor: layer.border,
                }}
              />
            )}
            <motion.div
              initial={{ opacity: 0, scaleX: 0.3 }}
              whileInView={{ opacity: 1, scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: layer.width,
                background: layer.bg,
                border: `1px solid ${layer.border}`,
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
              className={`mx-auto ${
                isExpanded ? 'px-6 py-5' : 'px-5 py-3.5'
              } flex items-center justify-between relative overflow-hidden`}
            >
              <div
                className="absolute inset-0 rounded-xl"
                style={{ background: `linear-gradient(90deg, ${layer.bg} 0%, transparent 100%)` }}
              />
              <span className="font-mono text-xs font-medium relative z-10" style={{ color: layer.textColor }}>
                {layer.label}
              </span>
              <div className="flex items-center gap-2 relative z-10">
                <span className={`font-display font-bold relative ${isExpanded ? 'text-2xl' : 'text-lg'}`} style={{ color: layer.color }}>
                  {layer.value}
                </span>
                <span className="font-mono text-[10px] text-white/35">({layer.percentage})</span>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    );
  };

  // ── Loading Skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{ ...glassStyle }}
            className="h-72 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] animate-pulse"
          >
            <div className="h-4 w-32 bg-white/5 rounded mb-4" />
            <div className="flex-1 bg-white/[0.02] rounded-lg flex items-center justify-center h-48">
              <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-lime animate-spin" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty State ─────────────────────────────────────────────────────────────
  if (leads.length === 0) {
    return (
      <div
        style={{ ...glassStyle }}
        className="p-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex flex-col items-center justify-center text-center min-h-[300px]"
      >
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <Database className="w-6 h-6 text-[#C6FF34] opacity-80" />
        </div>
        <h3 className="font-mono text-xs uppercase tracking-widest text-white mb-1">
          No Data Available
        </h3>
        <p className="font-sans text-xs text-white/40 max-w-xs">
          No qualified leads were found in the selected timeframe. Try expanding your date range filter.
        </p>
      </div>
    );
  }

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0.001 : 0.1 } },
  };

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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full select-none"
      >
        {/* 1. Leads Per Day */}
        <ChartDialog
          title="Leads Per Day — 30 Day Window"
          expandedChildren={renderLeadsPerDayChart(420)}
        >
          <motion.div
            variants={cardVariants}
            whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: 'rgba(255,255,255,0.11)', transition: { duration: 0.25 } }}
            className="bg-white/[0.035] border border-white/[0.07] backdrop-blur-2xl rounded-2xl overflow-hidden relative flex flex-col w-full"
          >
            {/* Decorative lime top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />

            {/* Header row */}
            <div className="px-5 pt-5 pb-0 flex justify-between items-center z-10">
              <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">
                LEADS PER DAY (30 DAYS)
              </span>
              <div className="flex items-center gap-2 mr-8">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const svgEl =
                      document.getElementById('leads-per-day-container')?.querySelector('svg') || null;
                    exportPng(svgEl, 'leads-per-day');
                  }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1 font-mono text-[10px] text-white/35 hover:border-white/15 hover:text-white/60 transition-all cursor-pointer"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>PNG</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportJson(leadsPerDayData, 'leads-per-day');
                  }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1 font-mono text-[10px] text-white/35 hover:border-white/15 hover:text-white/60 transition-all cursor-pointer"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Chart */}
            <div id="leads-per-day-container" className="flex-1 relative min-h-0 mt-3">
              {renderLeadsPerDayChart(280)}
            </div>
          </motion.div>
        </ChartDialog>

        {/* 2. Category Breakdown */}
        <ChartDialog
          title="Category Breakdown"
          expandedChildren={renderCategoryPie(90, 130, 300, true)}
        >
          <motion.div
            variants={cardVariants}
            whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: 'rgba(255,255,255,0.11)', transition: { duration: 0.25 } }}
            className="bg-white/[0.035] border border-white/[0.07] backdrop-blur-2xl rounded-2xl overflow-hidden relative flex flex-col w-full p-5"
          >
            {/* Decorative lime top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />

            {/* Header row */}
            <div className="flex items-center justify-between z-10">
              <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">
                CATEGORY BREAKDOWN
              </span>
              <div className="flex items-center gap-2 mr-8">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const svgEl =
                      document.getElementById('category-breakdown-container')?.querySelector('svg') || null;
                    exportPng(svgEl, 'category-breakdown');
                  }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1 font-mono text-[10px] text-white/35 hover:border-white/15 hover:text-white/60 transition-all cursor-pointer"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>PNG</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportJson(categoryData, 'category-breakdown');
                  }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1 font-mono text-[10px] text-white/35 hover:border-white/15 hover:text-white/60 transition-all cursor-pointer"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Chart Area */}
            <div id="category-breakdown-container" className="h-[360px] sm:h-[280px] w-full flex items-center justify-center">
              {renderCategoryPie(68, 95, 200, false)}
            </div>
          </motion.div>
        </ChartDialog>

        {/* 3. Top Performing Subreddits Custom Bars */}
        <ChartDialog
          title="Top Performing Subreddits"
          expandedChildren={renderSubredditBars(topSubredditsDataAll, true)}
        >
          <motion.div
            variants={cardVariants}
            whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: 'rgba(255,255,255,0.11)', transition: { duration: 0.25 } }}
            className="bg-white/[0.035] border border-white/[0.07] backdrop-blur-2xl rounded-2xl overflow-hidden relative flex flex-col w-full p-5"
          >
            {/* Decorative lime top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />

            {/* Header row */}
            <div className="flex items-center justify-between z-10 mb-4">
              <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">
                TOP SUBREDDITS
              </span>
              <div className="flex items-center gap-2 mr-8">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1 font-mono text-[10px] text-white/35 hover:border-white/15 hover:text-white/60 transition-all cursor-pointer"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>PNG</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportJson(topSubredditsDataAll, 'top-subreddits');
                  }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1 font-mono text-[10px] text-white/35 hover:border-white/15 hover:text-white/60 transition-all cursor-pointer"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-[270px] w-full">
              {renderSubredditBars(topSubredditsCompact, false)}
            </div>
          </motion.div>
        </ChartDialog>

        {/* 4. Conversion Funnel */}
        <ChartDialog
          title="Conversion Funnel"
          expandedChildren={renderFunnelLayers(true)}
        >
          <motion.div
            variants={cardVariants}
            whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: 'rgba(255,255,255,0.11)', transition: { duration: 0.25 } }}
            className="bg-white/[0.035] border border-white/[0.07] backdrop-blur-2xl rounded-2xl overflow-hidden relative flex flex-col w-full p-6"
          >
            {/* Decorative lime top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />

            {/* Header row */}
            <div className="flex items-center justify-between z-10 mb-6">
              <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">
                CONVERSION FUNNEL
              </span>
            </div>

            {/* Chart Area */}
            <div className="h-[270px] w-full flex items-center justify-center">
              {renderFunnelLayers(false)}
            </div>
          </motion.div>
        </ChartDialog>
      </motion.div>
    </>
  );
}
