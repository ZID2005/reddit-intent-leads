import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lead } from '../../types/lead';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Lock,
  Zap,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdvancedInsightsProps {
  leads: Lead[];
  isPro: boolean;
  onUpgrade?: () => void;
  shouldReduceMotion?: boolean;
}

// ─── CountUp Animation Component ──────────────────────────────────────────────
function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    const duration = 1200; // ms
    const frameRate = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const current = Math.round(easeProgress * value);
      setDisplayVal(current);

      if (frame >= totalFrames) {
        setDisplayVal(value);
        clearInterval(timer);
      }
    }, frameRate);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayVal}
      {suffix}
    </span>
  );
}

export function AdvancedInsights({
  leads,
  isPro,
  onUpgrade,
  shouldReduceMotion = false,
}: AdvancedInsightsProps) {
  // ─── 1. LEAD VELOCITY CALCULATIONS ──────────────────────────────────────────
  const sparklineData = useMemo(() => {
    const days: { dateStr: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ dateStr, count: 0 });
    }
    leads.forEach(l => {
      const dv = l.created_at || l.processed_at;
      if (!dv) return;
      const ds = new Date(dv).toISOString().slice(0, 10);
      const m = days.find(day => day.dateStr === ds);
      if (m) m.count++;
    });
    return days;
  }, [leads]);

  const velocityStats = useMemo(() => {
    const thisWeek = sparklineData.slice(7).reduce((acc, d) => acc + d.count, 0);
    const lastWeek = sparklineData.slice(0, 7).reduce((acc, d) => acc + d.count, 0);
    const diff = thisWeek - lastWeek;
    const growth = lastWeek > 0 ? Math.round((diff / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);
    const isPositive = diff >= 0;
    return { thisWeek, lastWeek, growth, isPositive };
  }, [sparklineData]);

  // ─── 2. SUBREDDIT PERFORMANCE HEATMAP CALCULATIONS ─────────────────────────
  const subredditHeatmapData = useMemo(() => {
    const subs: Record<
      string,
      { count: number; intentCount: number; sumIntent: number }
    > = {};
    leads.forEach(l => {
      if (!subs[l.subreddit]) {
        subs[l.subreddit] = { count: 0, intentCount: 0, sumIntent: 0 };
      }
      subs[l.subreddit].count++;
      if (l.intent_score != null && l.intent_score > 0) {
        subs[l.subreddit].intentCount++;
        subs[l.subreddit].sumIntent += l.intent_score;
      }
    });

    return Object.entries(subs).map(([subreddit, data]) => {
      const avgIntent =
        data.intentCount > 0 ? Math.round(data.sumIntent / data.intentCount) : 0;

      let performanceLabel = 'Weak';
      let performanceRank = 0;
      let badgeStyle = 'text-red-400 bg-red-400/8 border-red-400/20';

      const score = data.count * avgIntent;
      if (score > 1500) {
        performanceLabel = 'Excellent';
        performanceRank = 3;
        badgeStyle = 'text-[#C6FF34] bg-[#C6FF34]/8 border-[#C6FF34]/18';
      } else if (score > 800) {
        performanceLabel = 'Good';
        performanceRank = 2;
        badgeStyle = 'text-yellow-400 bg-yellow-400/8 border-yellow-400/20';
      } else if (score > 300) {
        performanceLabel = 'Moderate';
        performanceRank = 1;
        badgeStyle = 'text-orange-400 bg-orange-400/8 border-orange-400/20';
      }

      return {
        subreddit,
        count: data.count,
        avgIntent,
        performanceLabel,
        performanceRank,
        badgeStyle,
      };
    });
  }, [leads]);

  const [sortField, setSortField] = useState<'subreddit' | 'leads' | 'intent' | 'performance'>('leads');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedHeatmapData = useMemo(() => {
    const data = [...subredditHeatmapData];
    data.sort((a, b) => {
      const valA =
        sortField === 'intent'
          ? a.avgIntent
          : sortField === 'leads'
          ? a.count
          : sortField === 'performance'
          ? a.performanceRank
          : a.subreddit;
      const valB =
        sortField === 'intent'
          ? b.avgIntent
          : sortField === 'leads'
          ? b.count
          : sortField === 'performance'
          ? b.performanceRank
          : b.subreddit;

      if (typeof valA === 'string') {
        const valBStr = valB as string;
        return sortOrder === 'asc'
          ? valA.localeCompare(valBStr)
          : valBStr.localeCompare(valA);
      }
      const valBNum = valB as number;
      return sortOrder === 'asc' ? valA - valBNum : valBNum - valA;
    });
    return data;
  }, [subredditHeatmapData, sortField, sortOrder]);

  const displayedHeatmap = isPro
    ? sortedHeatmapData
    : sortedHeatmapData.slice(0, 3);

  // ─── 3. AI RECOMMENDATIONS GENERATION ────────────────────────────────────────
  const aiRecommendations = useMemo(() => {
    if (leads.length === 0) {
      return {
        insights: [
          'No qualified leads identified to compile recommendations.',
          'Start keyword collectors to start tracking subreddit intent.'
        ],
        recommendation: 'Increase keyword reach'
      };
    }

    const sortedSubs = [...subredditHeatmapData].sort((a, b) => b.count - a.count);
    const topSub = sortedSubs[0]?.subreddit || 'SaaS';
    const secondSub = sortedSubs[1]?.subreddit || 'smallbusiness';

    const highIntentLeads = leads.filter(l => (l.intent_score || 0) >= 70);
    const topSubHighIntent = highIntentLeads.filter(l => l.subreddit === topSub).length;
    const pctHighIntent =
      highIntentLeads.length > 0
        ? Math.round((topSubHighIntent / highIntentLeads.length) * 100)
        : 0;

    const painPoints = leads.filter(l => l.category === 'pain_point').length;
    const painPointsPct =
      leads.length > 0 ? Math.round((painPoints / leads.length) * 100) : 0;

    const buyingIntent = leads.filter(l => l.category === 'buying_intent').length;
    const buyingIntentPct =
      leads.length > 0 ? Math.round((buyingIntent / leads.length) * 100) : 0;

    const insights = [
      `r/${topSub} generated ${pctHighIntent}% of all high-intent leads.`,
      `Pain-point discussions comprise ${painPointsPct}% of qualified lead categories.`,
      `Buying-intent leads represent ${buyingIntentPct}% of overall intent distribution.`,
      `r/${secondSub} currently holds the highest confidence/conversion potential.`
    ];

    return {
      insights,
      recommendation: `r/${topSub} and r/${secondSub}`,
    };
  }, [leads, subredditHeatmapData]);

  const displayedInsights = isPro
    ? aiRecommendations.insights
    : aiRecommendations.insights.slice(0, 1);

  // ─── ANIMATION SETTINGS ──────────────────────────────────────────────────────
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0.001 : 0.1 } },
  };

  const cardVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full select-none"
    >
      {/* ── CARD 1: LEAD VELOCITY ── */}
      <motion.div
        variants={cardVariants}
        whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: 'rgba(255,255,255,0.11)', transition: { duration: 0.25 } }}
        className="bg-white/[0.035] border border-white/[0.07] backdrop-blur-2xl rounded-2xl overflow-hidden p-5 flex flex-col w-full relative lg:h-[380px] min-h-[350px]"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase">
            Lead Velocity
          </span>
          {velocityStats.isPositive ? (
            <div className="flex items-center gap-1 text-[#C6FF34] font-mono text-[10px] bg-[#C6FF34]/8 border border-[#C6FF34]/18 rounded-full px-2 py-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>STABLE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400 font-mono text-[10px] bg-red-400/8 border border-red-400/20 rounded-full px-2 py-0.5">
              <TrendingDown className="w-3 h-3" />
              <span>DECLINING</span>
            </div>
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 flex flex-col justify-between relative min-h-0">
          <div className={cn("flex flex-col gap-4 mt-2 transition-all duration-300", !isPro && "blur-md select-none pointer-events-none")}>
            {/* Stat Row */}
            <div className="flex items-baseline justify-between border-b border-white/[0.04] pb-3">
              <span className="font-sans text-xs text-white/45">This Week</span>
              <span className="font-display text-2xl font-bold text-white">
                <CountUp value={velocityStats.thisWeek} prefix="+" />
              </span>
            </div>

            <div className="flex items-baseline justify-between border-b border-white/[0.04] pb-3">
              <span className="font-sans text-xs text-white/45">Last Week</span>
              <span className="font-display text-lg font-bold text-white/70">
                <CountUp value={velocityStats.lastWeek} prefix="+" />
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="font-sans text-xs text-white/45">Growth</span>
              <span className={cn("font-display text-xl font-bold", velocityStats.isPositive ? "text-[#C6FF34]" : "text-red-400")}>
                <CountUp value={velocityStats.growth} prefix={velocityStats.isPositive ? '+' : ''} suffix="%" />
              </span>
            </div>

            {/* Sparkline Area */}
            <div className="mt-4 w-full h-[70px] bg-white/[0.02] border border-white/[0.04] rounded-xl overflow-hidden flex items-end">
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={velocityStats.isPositive ? '#C6FF34' : '#EF4444'}
                    fill={velocityStats.isPositive ? 'rgba(198,255,52,0.1)' : 'rgba(239,68,68,0.1)'}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gating Overlay */}
          {!isPro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center p-4">
              <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-2">
                <Lock className="w-3.5 h-3.5 text-white/40" />
              </div>
              <span className="font-mono text-[9px] text-white/30 tracking-widest uppercase mb-2">
                PRO FEATURE
              </span>
              <button
                onClick={onUpgrade}
                className="px-3.5 py-1.5 bg-[#C6FF34] text-black font-bold font-mono text-[10px] rounded-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer outline-none"
              >
                Unlock Velocity
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── CARD 2: SUBREDDIT PERFORMANCE HEATMAP ── */}
      <motion.div
        variants={cardVariants}
        whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: 'rgba(255,255,255,0.11)', transition: { duration: 0.25 } }}
        className="bg-white/[0.035] border border-white/[0.07] backdrop-blur-2xl rounded-2xl overflow-hidden p-5 flex flex-col w-full relative lg:h-[380px] h-auto"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />

        <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase mb-3">
          Top Performing Communities
        </div>

        {/* Heatmap table */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="w-full overflow-x-auto overflow-y-auto lg:max-h-[250px]" style={{ scrollbarWidth: 'auto' }}>
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9px] font-mono text-white/25 uppercase tracking-wider">
                  <th
                    onClick={() => handleSort('subreddit')}
                    className="py-2 cursor-pointer hover:text-white/60 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Subreddit</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('leads')}
                    className="py-2 text-right cursor-pointer hover:text-white/60 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Leads</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('intent')}
                    className="py-2 text-right cursor-pointer hover:text-white/60 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Avg Intent</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('performance')}
                    className="py-2 text-right cursor-pointer hover:text-white/60 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Score</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedHeatmap.map((row, idx) => (
                  <motion.tr
                    key={row.subreddit}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-2 font-mono text-white/70">r/{row.subreddit}</td>
                    <td className="py-2 text-right text-white font-medium">{row.count}</td>
                    <td className="py-2 text-right text-white/60">{row.avgIntent}%</td>
                    <td className="py-2 text-right">
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] border font-mono", row.badgeStyle)}>
                        {row.performanceLabel}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gating Upgrade Prompt */}
          {!isPro && sortedHeatmapData.length > 3 && (
            <div className="pt-3 border-t border-white/[0.04] flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-mono text-white/25 uppercase">
                Showing top 3 of {sortedHeatmapData.length} communities
              </span>
              <button
                onClick={onUpgrade}
                className="flex items-center gap-1 text-[10px] font-mono text-[#C6FF34]/70 hover:text-[#C6FF34] transition-colors cursor-pointer"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>Unlock Full Heatmap</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── CARD 3: AI RECOMMENDATIONS ── */}
      <motion.div
        variants={cardVariants}
        whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: 'rgba(255,255,255,0.11)', transition: { duration: 0.25 } }}
        className="bg-white/[0.035] border border-white/[0.07] backdrop-blur-2xl rounded-2xl overflow-hidden p-5 flex flex-col w-full relative lg:h-[380px] h-auto"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />

        <div className="font-mono text-[10px] text-white/30 tracking-widest uppercase mb-3">
          AI Recommendations
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Insights List */}
          <div className="space-y-3 mt-2 lg:overflow-y-auto" style={{ scrollbarWidth: 'auto' }}>
            {displayedInsights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className="flex items-start gap-2.5 font-sans text-xs text-white/70 border border-white/[0.02] bg-white/[0.01] rounded-xl p-2.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C6FF34] shrink-0 mt-0.5" />
                <span>{insight}</span>
              </motion.div>
            ))}
          </div>

          {/* Recommendation Block or Gating */}
          {isPro ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-4 p-3 rounded-xl bg-[#C6FF34]/4 border border-[#C6FF34]/15 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(198,255,52,0.02)_0%,transparent_100%)] pointer-events-none" />
              <div className="font-mono text-[9px] text-[#C6FF34] tracking-wider uppercase mb-1">
                Increase monitoring for:
              </div>
              <div className="font-sans text-xs text-white/80 font-medium leading-relaxed">
                {aiRecommendations.recommendation}
              </div>
            </motion.div>
          ) : (
            <div className="pt-3 border-t border-white/[0.04] flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-mono text-white/25 uppercase">
                3 Recommendations Locked
              </span>
              <button
                onClick={onUpgrade}
                className="flex items-center gap-1 text-[10px] font-mono text-[#C6FF34]/70 hover:text-[#C6FF34] transition-colors cursor-pointer"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>Unlock AI Recommendations</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
