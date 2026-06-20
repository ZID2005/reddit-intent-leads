import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead } from '../../types/lead';

interface AnalyticsChartsProps {
  leads: Lead[];
}

export function AnalyticsCharts({ leads }: AnalyticsChartsProps) {
  // Tooltip state for charts
  const [hoveredBar, setHoveredBar] = useState<{ x: number; y: number; label: string; value: number | string } | null>(null);
  const [hoveredPie, setHoveredPie] = useState<{ x: number; y: number; label: string; value: number; percent: number } | null>(null);
  const [hoveredHist, setHoveredHist] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredLine, setHoveredLine] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredContact, setHoveredContact] = useState<{ x: number; y: number; label: string; value: number; percent: number } | null>(null);

  // ── 1. Leads by Subreddit ──────────────────────────────────────────────────
  const subredditData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      counts[l.subreddit] = (counts[l.subreddit] || 0) + 1;
    });
    // Sort and take top 7
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [leads]);

  const maxSubredditCount = useMemo(() => {
    return Math.max(...subredditData.map(d => d.count), 1);
  }, [subredditData]);

  // ── 2. Leads by Category ───────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const counts = {
      buying_intent: 0,
      pain_point: 0,
      comparison: 0,
      research: 0,
      uncategorized: 0,
    };
    leads.forEach(l => {
      if (l.category in counts) {
        counts[l.category as keyof typeof counts]++;
      } else {
        counts.uncategorized++;
      }
    });

    const labels: Record<string, string> = {
      buying_intent: 'Buying Intent',
      pain_point: 'Pain Point',
      comparison: 'Comparison',
      research: 'Research',
      uncategorized: 'Uncategorized',
    };

    const colors: Record<string, string> = {
      buying_intent: '#C6FF34', // Lime
      comparison: '#22D3EE',    // Cyan
      pain_point: '#FFB347',    // Amber
      research: '#A855F7',      // Purple
      uncategorized: '#6B7280', // Gray
    };

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return Object.entries(counts).map(([key, count]) => ({
      key,
      name: labels[key] || key,
      count,
      color: colors[key] || '#9CA3AF',
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [leads]);

  // ── 3. Intent Score Distribution (Histogram) ────────────────────────────────
  const histogramData = useMemo(() => {
    const buckets = [
      { name: '0-20', count: 0 },
      { name: '21-40', count: 0 },
      { name: '41-60', count: 0 },
      { name: '61-80', count: 0 },
      { name: '81-100', count: 0 },
    ];
    leads.forEach(l => {
      const score = l.intent_score || 0;
      if (score <= 20) buckets[0].count++;
      else if (score <= 40) buckets[1].count++;
      else if (score <= 60) buckets[2].count++;
      else if (score <= 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [leads]);

  const maxHistCount = useMemo(() => {
    return Math.max(...histogramData.map(d => d.count), 1);
  }, [histogramData]);

  // ── 4. Leads Over Time ──────────────────────────────────────────────────────
  const timeSeriesData = useMemo(() => {
    const groups: Record<string, number> = {};
    leads.forEach(l => {
      const dateStr = new Date(l.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      groups[dateStr] = (groups[dateStr] || 0) + 1;
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const data = sortedDates.map(date => ({
      date,
      count: groups[date],
    }));

    // If empty, return placeholder to keep chart looking nice
    if (data.length === 0) {
      return [
        { date: 'No Data', count: 0 }
      ];
    }

    // Limit to last 10 points to avoid overcrowding
    return data.slice(-10);
  }, [leads]);

  const maxTimeCount = useMemo(() => {
    return Math.max(...timeSeriesData.map(d => d.count), 1);
  }, [timeSeriesData]);

  // ── 5. Contacted vs Uncontacted ─────────────────────────────────────────────
  const contactedData = useMemo(() => {
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const uncontacted = leads.length - contacted;
    const total = leads.length;

    return [
      { name: 'Contacted', count: contacted, color: '#C6FF34', percent: total > 0 ? Math.round((contacted / total) * 100) : 0 },
      { name: 'Uncontacted', count: uncontacted, color: 'rgba(255, 255, 255, 0.1)', percent: total > 0 ? Math.round((uncontacted / total) * 100) : 0 },
    ];
  }, [leads]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full select-none">
      
      {/* 1. Leads by Subreddit (Bar Chart) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[280px]">
        <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85 mb-4">Leads by Subreddit</h3>
        
        {subredditData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-mutedText font-mono">No data available</div>
        ) : (
          <div className="flex-1 relative flex items-end justify-between px-2 pt-4 pb-2">
            {subredditData.map((d, i) => {
              const heightPct = (d.count / maxSubredditCount) * 75; // Cap at 75% for spacing
              return (
                <div key={d.name} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Glowing Bar */}
                  <div className="w-8/12 max-w-[32px] relative flex flex-col justify-end h-full">
                    <motion.div
                      className="w-full bg-gradient-to-t from-lime/40 to-lime rounded-t-md relative cursor-pointer"
                      style={{ height: `${heightPct}%`, transformOrigin: 'bottom' }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const parentRect = e.currentTarget.offsetParent?.getBoundingClientRect();
                        if (parentRect) {
                          setHoveredBar({
                            x: rect.left - parentRect.left + rect.width / 2,
                            y: rect.top - parentRect.top - 8,
                            label: `r/${d.name}`,
                            value: d.count,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Bar shadow/glow */}
                      <div className="absolute inset-0 bg-lime/10 blur-[4px] rounded-t-md -z-10 group-hover:bg-lime/20" />
                    </motion.div>
                  </div>
                  
                  {/* Label */}
                  <span className="text-[9px] font-mono text-mutedText mt-2 truncate w-full text-center">
                    r/{d.name}
                  </span>
                </div>
              );
            })}

            {/* Custom Tooltip */}
            <AnimatePresence>
              {hoveredBar && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-mono shadow-xl z-20"
                  style={{ left: hoveredBar.x, top: hoveredBar.y, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="text-lime font-bold">{hoveredBar.label}</div>
                  <div className="text-white/80">{hoveredBar.value} leads</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 2. Leads by Category (Donut Chart) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[280px]">
        <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85 mb-4">Leads by Category</h3>
        
        {leads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-mutedText font-mono">No data available</div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-4">
            {/* SVG Donut */}
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background tracks */}
                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="12" fill="transparent" />
                
                {/* Render slices */}
                {(() => {
                  let accumulatedPercent = 0;
                  return categoryData.map((d, i) => {
                    const radius = 40;
                    const circ = 2 * Math.PI * radius; // 251.3
                    const strokeLength = (d.percent / 100) * circ;
                    const strokeOffset = circ - strokeLength + (accumulatedPercent / 100) * circ;
                    accumulatedPercent -= d.percent;
                    
                    if (d.count === 0) return null;

                    return (
                      <motion.circle
                        key={d.key}
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke={d.color}
                        strokeWidth="11"
                        fill="transparent"
                        strokeDasharray={circ}
                        strokeDashoffset={circ}
                        animate={{ strokeDashoffset: strokeOffset }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        strokeLinecap="round"
                        className="cursor-pointer transition-all duration-150 hover:stroke-[13px]"
                        onMouseEnter={() => {
                          setHoveredPie({
                            x: 72,
                            y: 72,
                            label: d.name,
                            value: d.count,
                            percent: d.percent
                          });
                        }}
                        onMouseLeave={() => setHoveredPie(null)}
                      />
                    );
                  });
                })()}
              </svg>
              
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-[10px] font-mono text-mutedText uppercase tracking-widest">Leads</span>
                <span className="text-xl font-bold font-mono text-white">{leads.length}</span>
              </div>
            </div>

            {/* Legend & Stats */}
            <div className="flex-1 flex flex-col gap-2 min-w-[140px] w-full">
              {categoryData.map(d => (
                <div key={d.key} className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-white/70">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold">{d.count}</span>
                    <span className="text-mutedText text-[9px] ml-1">({d.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Tooltip */}
            <AnimatePresence>
              {hoveredPie && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-mono shadow-xl z-20 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="font-bold" style={{ color: categoryData.find(c => c.name === hoveredPie.label)?.color }}>
                    {hoveredPie.label}
                  </div>
                  <div className="text-white/80">{hoveredPie.value} leads ({hoveredPie.percent}%)</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 3. Intent Score Distribution (Histogram) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[280px]">
        <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85 mb-4">Intent Score Distribution</h3>
        
        {leads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-mutedText font-mono">No data available</div>
        ) : (
          <div className="flex-1 relative flex items-end justify-between px-4 pt-4 pb-2 gap-1.5">
            {histogramData.map((d, i) => {
              const heightPct = (d.count / maxHistCount) * 75; // Cap at 75%
              return (
                <div key={d.name} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Glowing Bucket Bar */}
                  <div className="w-11/12 relative flex flex-col justify-end h-full">
                    <motion.div
                      className="w-full bg-gradient-to-t from-lime/20 to-lime/80 hover:to-lime rounded-t-sm relative cursor-pointer"
                      style={{ height: `${heightPct}%`, transformOrigin: 'bottom' }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const parentRect = e.currentTarget.offsetParent?.getBoundingClientRect();
                        if (parentRect) {
                          setHoveredHist({
                            x: rect.left - parentRect.left + rect.width / 2,
                            y: rect.top - parentRect.top - 8,
                            label: `Intent Score: ${d.name}`,
                            value: d.count,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredHist(null)}
                    >
                      <div className="absolute inset-0 bg-lime/5 blur-[2px] rounded-t-sm -z-10 group-hover:bg-lime/10" />
                    </motion.div>
                  </div>
                  
                  {/* Label */}
                  <span className="text-[9px] font-mono text-mutedText mt-2">
                    {d.name}
                  </span>
                </div>
              );
            })}

            {/* Custom Tooltip */}
            <AnimatePresence>
              {hoveredHist && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-mono shadow-xl z-20"
                  style={{ left: hoveredHist.x, top: hoveredHist.y, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="text-lime font-bold">{hoveredHist.label}</div>
                  <div className="text-white/80">{hoveredHist.value} leads</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 4. Leads Over Time (Line Chart) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[280px]">
        <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85 mb-4">Leads Over Time</h3>
        
        {leads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-mutedText font-mono">No data available</div>
        ) : (
          <div className="flex-1 relative flex flex-col justify-end px-2 pt-4 pb-2">
            {/* SVG Line / Area */}
            <div className="flex-1 relative w-full h-[160px]">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                <defs>
                  {/* Area fill gradient */}
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C6FF34" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#C6FF34" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Draw Area & Line */}
                {(() => {
                  const points = timeSeriesData.map((d, idx) => {
                    const x = (idx / Math.max(timeSeriesData.length - 1, 1)) * 300;
                    const y = 110 - (d.count / maxTimeCount) * 80;
                    return { x, y, ...d };
                  });

                  if (points.length === 0) return null;

                  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPath = `${linePath} L ${points[points.length - 1].x} 115 L ${points[0].x} 115 Z`;

                  return (
                    <>
                      {/* Grid lines (horizontal) */}
                      <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="70" x2="300" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="110" x2="300" y2="110" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                      {/* Area Fill */}
                      <motion.path
                        d={areaPath}
                        fill="url(#areaGrad)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      />

                      {/* Line */}
                      <motion.path
                        d={linePath}
                        fill="none"
                        stroke="#C6FF34"
                        strokeWidth="2.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />

                      {/* Interactive Nodes */}
                      {points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r="3.5"
                          fill="#171717"
                          stroke="#C6FF34"
                          strokeWidth="2"
                          className="cursor-pointer transition-all duration-100 hover:r-5 hover:fill-lime"
                          onMouseEnter={(e) => {
                            const svgEl = (e.currentTarget as any).ownerSVGElement;
                            if (svgEl) {
                              const parentRect = svgEl.getBoundingClientRect();
                              const containerRect = svgEl.parentElement?.getBoundingClientRect();
                              if (containerRect) {
                                const scaledX = parentRect.left - containerRect.left + (p.x / 300) * parentRect.width;
                                const scaledY = parentRect.top - containerRect.top + (p.y / 120) * parentRect.height;
                                
                                setHoveredLine({
                                  x: scaledX,
                                  y: scaledY - 10,
                                  label: p.date,
                                  value: p.count,
                                });
                              }
                            }
                          }}
                          onMouseLeave={() => setHoveredLine(null)}
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between w-full mt-2 border-t border-white/5 pt-1.5 px-0.5">
              {timeSeriesData.map((d, i) => (
                <span key={i} className="text-[8px] font-mono text-mutedText/80">
                  {d.date}
                </span>
              ))}
            </div>

            {/* Custom Tooltip */}
            <AnimatePresence>
              {hoveredLine && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-mono shadow-xl z-20"
                  style={{ left: hoveredLine.x, top: hoveredLine.y, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="text-lime font-bold">{hoveredLine.label}</div>
                  <div className="text-white/80">{hoveredLine.value} leads</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 5. Contacted vs Uncontacted (Donut Chart) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[280px] lg:col-span-2 max-w-lg mx-auto w-full">
        <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85 mb-4">Contacted vs Uncontacted Leads</h3>
        
        {leads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-mutedText font-mono">No data available</div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-6">
            {/* SVG Donut */}
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background tracks */}
                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="12" fill="transparent" />
                
                {/* Render slices */}
                {(() => {
                  let accumulatedPercent = 0;
                  return contactedData.map((d, i) => {
                    const radius = 40;
                    const circ = 2 * Math.PI * radius; // 251.3
                    const strokeLength = (d.percent / 100) * circ;
                    const strokeOffset = circ - strokeLength + (accumulatedPercent / 100) * circ;
                    accumulatedPercent -= d.percent;
                    
                    if (d.count === 0) return null;

                    return (
                      <motion.circle
                        key={d.name}
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke={d.color}
                        strokeWidth="11"
                        fill="transparent"
                        strokeDasharray={circ}
                        strokeDashoffset={circ}
                        animate={{ strokeDashoffset: strokeOffset }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        strokeLinecap="round"
                        className="cursor-pointer transition-all duration-150 hover:stroke-[13px]"
                        onMouseEnter={() => {
                          setHoveredContact({
                            x: 72,
                            y: 72,
                            label: d.name,
                            value: d.count,
                            percent: d.percent
                          });
                        }}
                        onMouseLeave={() => setHoveredContact(null)}
                      />
                    );
                  });
                })()}
              </svg>
              
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-[9px] font-mono text-mutedText uppercase tracking-widest">Outreach</span>
                <span className="text-lg font-bold font-mono text-white">
                  {contactedData.find(d => d.name === 'Contacted')?.percent || 0}%
                </span>
                <span className="text-[8px] font-mono text-lime uppercase tracking-widest font-semibold">Done</span>
              </div>
            </div>

            {/* Legend & Stats */}
            <div className="flex-1 flex flex-col gap-3 min-w-[140px] w-full">
              {contactedData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                    <span className="text-white/70">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold">{d.count}</span>
                    <span className="text-mutedText text-[10px] ml-1.5">({d.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Tooltip */}
            <AnimatePresence>
              {hoveredContact && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-mono shadow-xl z-20 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="font-bold" style={{ color: hoveredContact.label === 'Contacted' ? '#C6FF34' : 'rgba(255, 255, 255, 0.4)' }}>
                    {hoveredContact.label}
                  </div>
                  <div className="text-white/80">{hoveredContact.value} leads ({hoveredContact.percent}%)</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}
