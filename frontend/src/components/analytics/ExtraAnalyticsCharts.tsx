import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Database, Layers, BarChart3, PieChart } from 'lucide-react';
import { Lead } from '../../types/lead';

interface ExtraAnalyticsChartsProps {
  leads: Lead[];
  loading: boolean;
}

// Polar coordinate helper for Pie slices
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

export function ExtraAnalyticsCharts({ leads, loading }: ExtraAnalyticsChartsProps) {
  // Tooltip states
  const [hoveredLine, setHoveredLine] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredPie, setHoveredPie] = useState<{ x: number; y: number; label: string; value: number; percent: number } | null>(null);
  const [hoveredSubreddit, setHoveredSubreddit] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredFunnel, setHoveredFunnel] = useState<{ x: number; y: number; label: string; value: number; rate: string } | null>(null);

  // SVG Refs for PNG Exports
  const lineChartRef = useRef<SVGSVGElement>(null);
  const pieChartRef = useRef<SVGSVGElement>(null);
  const barChartRef = useRef<SVGSVGElement>(null);
  const funnelChartRef = useRef<SVGSVGElement>(null);

  // ── 1. Leads Per Day (Last 30 Days) ──────────────────────────────────────────
  const leadsPerDayData = useMemo(() => {
    const dates: { dateStr: string; label: string; dateObj: Date; count: number }[] = [];
    const now = new Date();
    
    // Build array of past 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dates.push({ dateStr, label, dateObj: d, count: 0 });
    }

    // Populate counts
    leads.forEach(l => {
      const dateVal = l.created_at || l.processed_at;
      if (!dateVal) return;
      const leadDateStr = new Date(dateVal).toISOString().slice(0, 10);
      const match = dates.find(d => d.dateStr === leadDateStr);
      if (match) {
        match.count++;
      }
    });

    return dates.map(({ label, count }) => ({ date: label, count }));
  }, [leads]);

  const maxLineCount = useMemo(() => {
    return Math.max(...leadsPerDayData.map(d => d.count), 1);
  }, [leadsPerDayData]);

  // ── 2. Category Distribution (Pie Chart) ─────────────────────────────────────
  const categoryData = useMemo(() => {
    const counts = {
      buying_intent: 0,
      pain_point: 0,
      comparison: 0,
      research: 0,
    };
    
    leads.forEach(l => {
      if (l.category in counts) {
        counts[l.category as keyof typeof counts]++;
      }
    });

    const labels = {
      buying_intent: 'Buying Intent',
      pain_point: 'Pain Point',
      comparison: 'Comparison',
      research: 'Research',
    };

    const colors = {
      buying_intent: '#C6FF34', // Lime
      comparison: '#22D3EE',    // Cyan
      pain_point: '#FFB347',    // Amber
      research: '#A855F7',      // Purple
    };

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return Object.entries(counts).map(([key, count]) => ({
      key,
      name: labels[key as keyof typeof labels],
      count,
      color: colors[key as keyof typeof colors],
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [leads]);

  // ── 3. Top Subreddits (Horizontal Bar Chart - Top 10) ────────────────────────
  const topSubredditsData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      counts[l.subreddit] = (counts[l.subreddit] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [leads]);

  const maxSubredditCount = useMemo(() => {
    return Math.max(...topSubredditsData.map(d => d.count), 1);
  }, [topSubredditsData]);

  // ── 4. Funnel Data (New -> Saved -> Contacted) ───────────────────────────────
  const funnelData = useMemo(() => {
    const totalNew = leads.length;
    const totalSaved = leads.filter(l => l.status === 'saved' || l.status === 'contacted').length;
    const totalContacted = leads.filter(l => l.status === 'contacted').length;

    const savedPct = totalNew > 0 ? Math.round((totalSaved / totalNew) * 100) : 0;
    const contactedPct = totalSaved > 0 ? Math.round((totalContacted / totalSaved) * 100) : 0;
    const overallPct = totalNew > 0 ? Math.round((totalContacted / totalNew) * 100) : 0;

    return [
      { name: 'Incoming Leads', count: totalNew, color: '#C6FF34', rate: '100% Baseline' },
      { name: 'Shortlisted Leads', count: totalSaved, color: '#22D3EE', rate: `${savedPct}% Saved` },
      { name: 'Outreach Initiated', count: totalContacted, color: '#A855F7', rate: `${contactedPct}% Contacted (${overallPct}% overall)` },
    ];
  }, [leads]);

  // ── Client-side PNG Exporter ────────────────────────────────────────────────
  const exportPng = (svgEl: SVGSVGElement | null, fileName: string) => {
    if (!svgEl) return;
    try {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const bbox = svgEl.getBoundingClientRect();
        
        // Scale for high resolution output
        canvas.width = bbox.width * 2;
        canvas.height = bbox.height * 2;
        
        const context = canvas.getContext('2d');
        if (context) {
          context.scale(2, 2);
          // Dark-mode themed background color
          context.fillStyle = '#0F0E0E';
          context.fillRect(0, 0, bbox.width, bbox.height);
          
          context.drawImage(image, 0, 0, bbox.width, bbox.height);
          
          const pngURL = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngURL;
          downloadLink.download = `${fileName}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.error('Error exporting PNG:', err);
    }
  };

  // ── Client-side JSON Exporter ───────────────────────────────────────────────
  const exportJson = (data: any, fileName: string) => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadLink = document.createElement('a');
      downloadLink.href = dataStr;
      downloadLink.download = `${fileName}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Error exporting JSON:', err);
    }
  };

  // ── Loading Skeleton Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full select-none">
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[320px] justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 w-12 bg-white/5 rounded animate-pulse" />
                <div className="h-6 w-12 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex-1 bg-white/[0.02] rounded-lg animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-lime animate-spin" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty State Render ──────────────────────────────────────────────────────
  if (leads.length === 0) {
    return (
      <div className="glass-panel p-10 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
          <Database className="w-6 h-6 text-lime/80" />
        </div>
        <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">No Data Available</h3>
        <p className="text-xs text-mutedText max-w-sm">
          No qualified leads were found in the selected timeframe. Try expanding your date range filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full select-none">

      {/* 1. Leads Per Day (Last 30 Days Line Chart) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-lime" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85">Leads Per Day (30 Days)</h3>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => exportPng(lineChartRef.current, 'leads_per_day_chart')}
              className="px-2 py-1 text-[9px] font-mono rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <Download className="w-2.5 h-2.5" /> PNG
            </button>
            <button
              onClick={() => exportJson(leadsPerDayData, 'leads_per_day_data')}
              className="px-2 py-1 text-[9px] font-mono rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              JSON
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex flex-col justify-end px-2 pt-2 pb-1">
          <div className="flex-1 relative w-full h-[190px]">
            <svg
              ref={lineChartRef}
              className="w-full h-full overflow-visible"
              viewBox="0 0 460 170"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="leadsDayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6FF34" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#C6FF34" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="20" x2="440" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="20" y1="75" x2="440" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="20" y1="130" x2="440" y2="130" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

              {/* Line Calculations */}
              {(() => {
                const points = leadsPerDayData.map((d, idx) => {
                  const x = 20 + (idx / 29) * 420;
                  const y = 130 - (d.count / maxLineCount) * 100;
                  return { x, y, date: d.date, count: d.count };
                });

                const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const areaPath = `${linePath} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`;

                return (
                  <>
                    <motion.path
                      d={areaPath}
                      fill="url(#leadsDayGrad)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                    <motion.path
                      d={linePath}
                      fill="none"
                      stroke="#C6FF34"
                      strokeWidth="2.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8 }}
                    />
                    {points.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill="#0F0E0E"
                        stroke="#C6FF34"
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-100 hover:r-5 hover:fill-lime"
                        onMouseEnter={(e) => {
                          const svg = lineChartRef.current;
                          if (svg) {
                            const rect = svg.getBoundingClientRect();
                            const xRatio = p.x / 460;
                            const yRatio = p.y / 170;
                            setHoveredLine({
                              x: rect.width * xRatio,
                              y: rect.height * yRatio - 8,
                              label: p.date,
                              value: p.count
                            });
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

          <div className="flex justify-between w-full mt-2 border-t border-white/5 pt-1.5 px-2">
            <span className="text-[7.5px] font-mono text-mutedText/85">{leadsPerDayData[0]?.date}</span>
            <span className="text-[7.5px] font-mono text-mutedText/85">{leadsPerDayData[14]?.date}</span>
            <span className="text-[7.5px] font-mono text-mutedText/85">{leadsPerDayData[29]?.date}</span>
          </div>

          <AnimatePresence>
            {hoveredLine && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2 py-1 rounded text-[9px] font-mono shadow-xl z-20"
                style={{ left: hoveredLine.x, top: hoveredLine.y, transform: 'translate(-50%, -100%)' }}
              >
                <div className="text-lime font-bold">{hoveredLine.label}</div>
                <div className="text-white/95">{hoveredLine.value} leads</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Category Distribution (Pie Chart) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-lime" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85">Category Breakdown</h3>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => exportPng(pieChartRef.current, 'category_pie_chart')}
              className="px-2 py-1 text-[9px] font-mono rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <Download className="w-2.5 h-2.5" /> PNG
            </button>
            <button
              onClick={() => exportJson(categoryData, 'category_distribution_data')}
              className="px-2 py-1 text-[9px] font-mono rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              JSON
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-4 pt-1">
          <div className="relative w-36 h-36 flex-shrink-0">
            <svg
              ref={pieChartRef}
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              {(() => {
                let accumulatedAngle = 0;
                const total = categoryData.reduce((a, b) => a + b.count, 0);

                if (total === 0) {
                  return <circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.03)" />;
                }

                // If only one category exists
                const nonZeroCategories = categoryData.filter(c => c.count > 0);
                if (nonZeroCategories.length === 1) {
                  const cat = nonZeroCategories[0];
                  return (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth="16"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPie({ x: 72, y: 72, label: cat.name, value: cat.count, percent: 100 })}
                      onMouseLeave={() => setHoveredPie(null)}
                    />
                  );
                }

                return categoryData.map((d, i) => {
                  if (d.count === 0) return null;
                  const sliceAngle = (d.count / total) * 360;
                  const startAngle = accumulatedAngle;
                  const endAngle = accumulatedAngle + sliceAngle;
                  accumulatedAngle = endAngle;

                  const pathData = describeArc(50, 50, 40, startAngle, endAngle);

                  return (
                    <motion.path
                      key={d.key}
                      d={pathData}
                      fill={d.color}
                      opacity={0.85}
                      className="cursor-pointer transition-all hover:opacity-100"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-[8px] font-mono text-mutedText uppercase tracking-widest">Engine</span>
              <span className="text-base font-bold font-mono text-white">AI</span>
              <span className="text-[7px] font-mono text-lime uppercase tracking-widest font-semibold">Parser</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1.5 w-full min-w-[140px] max-w-[200px]">
            {categoryData.map(d => (
              <div key={d.key} className="flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-white/70">{d.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-bold">{d.count}</span>
                  <span className="text-mutedText text-[8px] ml-1">({d.percent}%)</span>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {hoveredPie && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2 py-1 rounded text-[9px] font-mono shadow-xl z-20 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
              >
                <div className="font-bold text-center" style={{ color: categoryData.find(c => c.name === hoveredPie.label)?.color }}>
                  {hoveredPie.label}
                </div>
                <div className="text-white/90 text-center">{hoveredPie.value} leads ({hoveredPie.percent}%)</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Top Subreddits (Horizontal Bar Chart) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-lime" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85">Top Subreddits</h3>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => exportPng(barChartRef.current, 'top_subreddits_chart')}
              className="px-2 py-1 text-[9px] font-mono rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <Download className="w-2.5 h-2.5" /> PNG
            </button>
            <button
              onClick={() => exportJson(topSubredditsData, 'top_subreddits_data')}
              className="px-2 py-1 text-[9px] font-mono rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              JSON
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex flex-col justify-end">
          {topSubredditsData.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-xs text-mutedText font-mono">No data available</div>
          ) : (
            <svg
              ref={barChartRef}
              className="w-full h-full"
              viewBox="0 0 460 230"
              preserveAspectRatio="none"
            >
              {topSubredditsData.map((d, i) => {
                const yPos = 15 + i * 21;
                const barWidth = (d.count / maxSubredditCount) * 280;
                return (
                  <g key={d.name} className="group">
                    {/* Subreddit Label */}
                    <text
                      x="10"
                      y={yPos + 11}
                      fill="rgba(255,255,255,0.7)"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      r/{d.name}
                    </text>

                    {/* Bar Background Track */}
                    <rect
                      x="100"
                      y={yPos}
                      width="280"
                      height="12"
                      rx="3"
                      fill="rgba(255,255,255,0.02)"
                    />

                    {/* Filled Bar */}
                    <motion.rect
                      x="100"
                      y={yPos}
                      height="12"
                      rx="3"
                      fill="url(#barGradient)"
                      initial={{ width: 0 }}
                      animate={{ width: barWidth }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      className="cursor-pointer hover:opacity-90"
                      onMouseEnter={(e) => {
                        const svg = barChartRef.current;
                        if (svg) {
                          const rect = svg.getBoundingClientRect();
                          const xRatio = (100 + barWidth / 2) / 460;
                          const yRatio = yPos / 230;
                          setHoveredSubreddit({
                            x: rect.width * xRatio,
                            y: rect.height * yRatio - 8,
                            label: `r/${d.name}`,
                            value: d.count
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredSubreddit(null)}
                    />

                    {/* Value label */}
                    <text
                      x={105 + barWidth}
                      y={yPos + 10}
                      fill="#C6FF34"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {d.count}
                    </text>
                  </g>
                );
              })}

              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#C6FF34" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#C6FF34" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
          )}

          <AnimatePresence>
            {hoveredSubreddit && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2 py-1 rounded text-[9px] font-mono shadow-xl z-25"
                style={{ left: hoveredSubreddit.x, top: hoveredSubreddit.y, transform: 'translate(-50%, -100%)' }}
              >
                <div className="text-lime font-bold">{hoveredSubreddit.label}</div>
                <div className="text-white/95">{hoveredSubreddit.value} leads</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Funnel Widget */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-lime" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85">Conversion Funnel</h3>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => exportPng(funnelChartRef.current, 'funnel_conversion_chart')}
              className="px-2 py-1 text-[9px] font-mono rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <Download className="w-2.5 h-2.5" /> PNG
            </button>
            <button
              onClick={() => exportJson(funnelData, 'funnel_conversion_data')}
              className="px-2 py-1 text-[9px] font-mono rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              JSON
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex flex-col justify-center">
          <svg
            ref={funnelChartRef}
            className="w-full h-full max-h-[220px]"
            viewBox="0 0 460 200"
          >
            {(() => {
              // Standard trapezoid polygon points
              const topY = 15;
              const height = 45;
              const gap = 12;

              // Polygon coordinates centered around X=230
              // Tier 1: Width 360 -> 260
              const p1 = `50,${topY} 410,${topY} 360,${topY + height} 100,${topY + height}`;
              // Tier 2: Width 260 -> 180
              const p2 = `105,${topY + height + gap} 355,${topY + height + gap} 310,${topY + height * 2 + gap} 150,${topY + height * 2 + gap}`;
              // Tier 3: Width 180 -> 120
              const p3 = `155,${topY + height * 2 + gap * 2} 305,${topY + height * 2 + gap * 2} 275,${topY + height * 3 + gap * 2} 185,${topY + height * 3 + gap * 2}`;

              const polygons = [
                { points: p1, color: 'rgba(198, 255, 52, 0.75)', stroke: '#C6FF34', data: funnelData[0] },
                { points: p2, color: 'rgba(34, 211, 238, 0.7)', stroke: '#22D3EE', data: funnelData[1] },
                { points: p3, color: 'rgba(168, 85, 247, 0.75)', stroke: '#A855F7', data: funnelData[2] },
              ];

              return polygons.map((poly, idx) => {
                const yOffset = topY + idx * (height + gap) + height / 2;
                return (
                  <g key={idx} className="group">
                    <motion.polygon
                      points={poly.points}
                      fill={poly.color}
                      stroke={poly.stroke}
                      strokeWidth="1.5"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.08 }}
                      className="cursor-pointer transition-all hover:brightness-110"
                      onMouseEnter={(e) => {
                        const svg = funnelChartRef.current;
                        if (svg) {
                          const rect = svg.getBoundingClientRect();
                          const yRatio = yOffset / 200;
                          setHoveredFunnel({
                            x: rect.width / 2,
                            y: rect.height * yRatio - 8,
                            label: poly.data.name,
                            value: poly.data.count,
                            rate: poly.data.rate
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredFunnel(null)}
                    />
                    
                    {/* Centered label inside trapezoid */}
                    <text
                      x="230"
                      y={yOffset + 4}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontWeight="bold"
                      fontSize="9.5"
                      fontFamily="monospace"
                      className="pointer-events-none select-none"
                    >
                      {poly.data.name}: {poly.data.count} ({poly.data.rate.split(' ')[0]})
                    </text>
                  </g>
                );
              });
            })()}
          </svg>

          <AnimatePresence>
            {hoveredFunnel && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none bg-carbon-card border border-white/10 px-2.5 py-1.5 rounded text-[9px] font-mono shadow-xl z-25 left-1/2 transform -translate-x-1/2"
                style={{ top: hoveredFunnel.y, transform: 'translate(-50%, -100%)' }}
              >
                <div className="text-lime font-bold text-center">{hoveredFunnel.label}</div>
                <div className="text-white/95 text-center">{hoveredFunnel.value} total leads</div>
                <div className="text-mutedText text-[8px] text-center mt-0.5">{hoveredFunnel.rate}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
