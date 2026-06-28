import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Maximize2, X, RotateCw } from 'lucide-react';
import { Lead } from '../../types/lead';

// ─── Design tokens ─────────────────────────────────────────────────────────────
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

// ─── Tooltip style ─────────────────────────────────────────────────────────────
const tooltipStyle: React.CSSProperties = {
  background:           '#0D0D0F',
  border:               '1px solid rgba(255,255,255,0.10)',
  backdropFilter:       'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius:         12,
  padding:              '8px 12px',
  boxShadow:            '0 8px 24px rgba(0,0,0,0.5)',
};

// ─── Card header label ─────────────────────────────────────────────────────────
function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
      {children}
    </span>
  );
}

// ─── Glass chart card with maximize ───────────────────────────────────────────
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  height?: number;
  colSpan?: boolean;
  onMaximize?: () => void;
}

function ChartCard({ title, children, height = 280, colSpan, onMaximize }: ChartCardProps) {
  const [hovered, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.25 } }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...glass,
        border: hovered ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.08)',
        background: hovered ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.035)',
        transition: 'background 0.25s, border-color 0.25s',
        height,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...(colSpan ? { gridColumn: 'span 2' } : {}),
      }}
      className={colSpan ? 'lg:col-span-2' : ''}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <CardLabel>{title}</CardLabel>
        {onMaximize && (
          <button
            onClick={onMaximize}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
          >
            <Maximize2 className="w-4 h-4" style={{ color: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', transition: 'color 0.2s' }} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative min-h-0">
        {children}
      </div>
    </motion.div>
  );
}

// ─── Full-screen modal ─────────────────────────────────────────────────────────
function FullScreenModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            ...glass,
            borderRadius: 24,
            width: '100%',
            maxWidth: 900,
            padding: '32px',
            maxHeight: '80vh',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 style={{ fontFamily: GODBER, fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>{title}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px', cursor: 'pointer', display: 'flex',
              }}
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 400 }}>{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Floating tooltip ──────────────────────────────────────────────────────────
function Tooltip({ x, y, label, value }: { x: number; y: number; label: string; value: string | number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      style={{
        ...tooltipStyle,
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none',
        zIndex: 30,
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 10, color: LIME, fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{value} leads</div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
interface AnalyticsChartsProps {
  leads: Lead[];
}

export function AnalyticsCharts({ leads }: AnalyticsChartsProps) {
  const [hoveredBar, setHoveredBar]       = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredPie, setHoveredPie]       = useState<{ x: number; y: number; label: string; value: number; percent: number } | null>(null);
  const [hoveredHist, setHoveredHist]     = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredLine, setHoveredLine]     = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredContact, setHoveredContact] = useState<{ x: number; y: number; label: string; value: number; percent: number } | null>(null);

  // Maximize modal state
  const [modal, setModal] = useState<null | 'subreddit' | 'category' | 'intent' | 'time' | 'contacted'>(null);

  // ── 1. Leads by Subreddit ─────────────────────────────────────────────────
  const subredditData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.subreddit] = (counts[l.subreddit] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 7);
  }, [leads]);
  const maxSubredditCount = useMemo(() => Math.max(...subredditData.map(d => d.count), 1), [subredditData]);

  // ── 2. Leads by Category ──────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const counts = { buying_intent: 0, pain_point: 0, comparison: 0, research: 0, uncategorized: 0 };
    leads.forEach(l => {
      if (l.category in counts) counts[l.category as keyof typeof counts]++;
      else counts.uncategorized++;
    });
    const labels: Record<string, string> = { buying_intent: 'Buying Intent', pain_point: 'Pain Point', comparison: 'Comparison', research: 'Research', uncategorized: 'Uncategorized' };
    const colors: Record<string, string> = { buying_intent: '#C6FF34', comparison: '#22D3EE', pain_point: '#FFB347', research: '#A855F7', uncategorized: '#6B7280' };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).map(([key, count]) => ({
      key, name: labels[key] || key, count, color: colors[key] || '#9CA3AF',
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [leads]);

  // ── 3. Intent Score Distribution ─────────────────────────────────────────
  const histogramData = useMemo(() => {
    const buckets = [{ name: '0–20', count: 0 }, { name: '21–40', count: 0 }, { name: '41–60', count: 0 }, { name: '61–80', count: 0 }, { name: '81–100', count: 0 }];
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
  const maxHistCount = useMemo(() => Math.max(...histogramData.map(d => d.count), 1), [histogramData]);

  // ── 4. Leads Over Time ────────────────────────────────────────────────────
  const timeSeriesData = useMemo(() => {
    const groups: Record<string, number> = {};
    leads.forEach(l => {
      const ds = new Date(l.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      groups[ds] = (groups[ds] || 0) + 1;
    });
    const sorted = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const data = sorted.map(date => ({ date, count: groups[date] }));
    return data.length === 0 ? [{ date: 'No Data', count: 0 }] : data.slice(-10);
  }, [leads]);
  const maxTimeCount = useMemo(() => Math.max(...timeSeriesData.map(d => d.count), 1), [timeSeriesData]);

  // ── 5. Contacted vs Uncontacted ───────────────────────────────────────────
  const contactedData = useMemo(() => {
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const uncontacted = leads.length - contacted;
    const total = leads.length;
    return [
      { name: 'Contacted', count: contacted, color: LIME, percent: total > 0 ? Math.round((contacted / total) * 100) : 0 },
      { name: 'Uncontacted', count: uncontacted, color: 'rgba(255,255,255,0.1)', percent: total > 0 ? Math.round((uncontacted / total) * 100) : 0 },
    ];
  }, [leads]);

  // ── Bar chart renderer ─────────────────────────────────────────────────────
  const renderBarChart = (data: { name: string; count: number }[], maxCount: number, prefix = 'r/') => (
    <div className="flex-1 relative flex items-end justify-between px-2 pt-4 pb-2 h-full">
      {data.map((d, i) => {
        const heightPct = (d.count / maxCount) * 78;
        return (
          <div key={d.name} className="flex-1 flex flex-col items-center group relative h-full justify-end">
            <div className="w-8/12 max-w-[32px] relative flex flex-col justify-end h-full">
              <motion.div
                style={{
                  width: '100%',
                  background: `linear-gradient(to top, rgba(198,255,52,0.3), rgba(198,255,52,0.9))`,
                  borderRadius: '4px 4px 0 0',
                  height: `${heightPct}%`,
                  transformOrigin: 'bottom',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                onMouseEnter={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const par = e.currentTarget.closest('.bars-container')?.getBoundingClientRect() || rect;
                  setHoveredBar({ x: rect.left - par.left + rect.width / 2, y: rect.top - par.top - 8, label: `${prefix}${d.name}`, value: d.count });
                }}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Bar glow */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(198,255,52,0.1)', filter: 'blur(4px)', zIndex: -1, borderRadius: '4px 4px 0 0' }} />
              </motion.div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 6, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {prefix}{d.name}
            </span>
          </div>
        );
      })}
      <AnimatePresence>
        {hoveredBar && <Tooltip x={hoveredBar.x} y={hoveredBar.y} label={hoveredBar.label} value={hoveredBar.value} />}
      </AnimatePresence>
    </div>
  );

  // ── Donut chart renderer ───────────────────────────────────────────────────
  const renderDonut = (data: { key?: string; name: string; count: number; color: string; percent: number }[], centerLabel: string, centerValue: React.ReactNode) => {
    let accumulated = 0;
    return (
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-4 h-full">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="12" fill="transparent" />
            {data.map((d, i) => {
              const radius = 40;
              const circ = 2 * Math.PI * radius;
              const strokeLen = (d.percent / 100) * circ;
              const strokeOff = circ - strokeLen + (accumulated / 100) * circ;
              accumulated -= d.percent;
              if (d.count === 0) return null;
              return (
                <motion.circle
                  key={d.name}
                  cx="50" cy="50" r={radius}
                  stroke={d.color} strokeWidth="11" fill="transparent"
                  strokeDasharray={circ} strokeDashoffset={circ}
                  animate={{ strokeDashoffset: strokeOff }}
                  transition={{ duration: 0.7, delay: i * 0.1 }}
                  strokeLinecap="round"
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{centerLabel}</span>
            <div style={{ fontFamily: NOHEMI, fontWeight: 700, fontSize: '1.5rem', color: '#fff', lineHeight: 1 }}>{centerValue}</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-2 min-w-[140px]">
          {data.map(d => (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{d.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', fontWeight: 700 }}>{d.count}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>({d.percent}%)</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full select-none">

        {/* 1. Leads by Subreddit */}
        <ChartCard title="Leads by Subreddit" height={280} onMaximize={() => setModal('subreddit')}>
          {subredditData.length === 0
            ? <div className="flex-1 flex items-center justify-center" style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No data available</div>
            : <div className="bars-container flex-1 relative flex items-end justify-between px-2 pt-4 pb-2 h-full">
                {renderBarChart(subredditData, maxSubredditCount)}
              </div>
          }
        </ChartCard>

        {/* 2. Leads by Category */}
        <ChartCard title="Leads by Category" height={280} onMaximize={() => setModal('category')}>
          {leads.length === 0
            ? <div className="flex items-center justify-center h-full" style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No data available</div>
            : renderDonut(categoryData, 'Leads', leads.length)
          }
        </ChartCard>

        {/* 3. Intent Score Distribution */}
        <ChartCard title="Intent Score Distribution" height={280} onMaximize={() => setModal('intent')}>
          {leads.length === 0
            ? <div className="flex items-center justify-center h-full" style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No data available</div>
            : <div className="flex-1 relative flex items-end justify-between px-4 pt-4 pb-2 gap-1.5 h-full">
                {histogramData.map((d, i) => {
                  const heightPct = (d.count / maxHistCount) * 78;
                  return (
                    <div key={d.name} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      <div className="w-11/12 relative flex flex-col justify-end h-full">
                        <motion.div
                          style={{
                            width: '100%',
                            background: `linear-gradient(to top, rgba(198,255,52,0.25), rgba(198,255,52,0.85))`,
                            borderRadius: '3px 3px 0 0',
                            height: `${heightPct}%`,
                            transformOrigin: 'bottom',
                            cursor: 'pointer',
                          }}
                          initial={{ scaleY: 0 }}
                          whileInView={{ scaleY: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: i * 0.07 }}
                          onMouseEnter={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const par = e.currentTarget.closest('.hist-container')?.getBoundingClientRect() || rect;
                            setHoveredHist({ x: rect.left - par.left + rect.width / 2, y: rect.top - par.top - 8, label: `Score ${d.name}`, value: d.count });
                          }}
                          onMouseLeave={() => setHoveredHist(null)}
                        />
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{d.name}</span>
                    </div>
                  );
                })}
                <AnimatePresence>
                  {hoveredHist && <Tooltip x={hoveredHist.x} y={hoveredHist.y} label={hoveredHist.label} value={hoveredHist.value} />}
                </AnimatePresence>
              </div>
          }
        </ChartCard>

        {/* 4. Leads Over Time */}
        <ChartCard title="Leads Over Time" height={280} onMaximize={() => setModal('time')}>
          {leads.length === 0
            ? <div className="flex items-center justify-center h-full" style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No data available</div>
            : <div className="flex-1 relative flex flex-col justify-end px-2 pt-4 pb-2 h-full">
                <div className="flex-1 relative w-full" style={{ minHeight: 140 }}>
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="timeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C6FF34" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#C6FF34" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="70" x2="300" y2="70" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="110" x2="300" y2="110" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    {(() => {
                      const pts = timeSeriesData.map((d, idx) => ({
                        x: (idx / Math.max(timeSeriesData.length - 1, 1)) * 300,
                        y: 110 - (d.count / maxTimeCount) * 80,
                        ...d,
                      }));
                      const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaPath = `${linePath} L ${pts[pts.length - 1].x} 115 L ${pts[0].x} 115 Z`;
                      return (
                        <>
                          <motion.path d={areaPath} fill="url(#timeAreaGrad)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
                          <motion.path d={linePath} fill="none" stroke={LIME} strokeWidth="2.5" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: 'easeOut' }} />
                          {pts.map((p, idx) => (
                            <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#0D0D0F" stroke={LIME} strokeWidth="2" style={{ cursor: 'pointer' }}
                              onMouseEnter={e => {
                                const svgEl = (e.currentTarget as any).ownerSVGElement as SVGSVGElement;
                                if (svgEl) {
                                  const sr = svgEl.getBoundingClientRect();
                                  const cr = svgEl.parentElement?.getBoundingClientRect();
                                  if (cr) {
                                    setHoveredLine({ x: sr.left - cr.left + (p.x / 300) * sr.width, y: sr.top - cr.top + (p.y / 120) * sr.height - 10, label: p.date, value: p.count });
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
                <div className="flex justify-between w-full mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {timeSeriesData.map((d, i) => (
                    <span key={i} style={{ fontFamily: MONO, fontSize: 7.5, color: 'rgba(255,255,255,0.3)' }}>{d.date}</span>
                  ))}
                </div>
                <AnimatePresence>
                  {hoveredLine && <Tooltip x={hoveredLine.x} y={hoveredLine.y} label={hoveredLine.label} value={hoveredLine.value} />}
                </AnimatePresence>
              </div>
          }
        </ChartCard>

        {/* 5. Contacted vs Uncontacted */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            ...glass,
            position: 'relative',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            height: 280,
            maxWidth: 480,
            margin: '0 auto',
            width: '100%',
          }}
          className="lg:col-span-2"
        >
          {/* Lime radial glow behind */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(198,255,52,0.05) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: 20 }} />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <CardLabel>Contacted vs Uncontacted Leads</CardLabel>
            <button onClick={() => setModal('contacted')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Maximize2 className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
            </button>
          </div>

          <div className="flex-1 relative z-10 min-h-0">
            {leads.length === 0
              ? <div className="flex items-center justify-center h-full" style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No data available</div>
              : renderDonut(
                  contactedData,
                  'Outreach',
                  <span style={{ fontFamily: NOHEMI }}>{contactedData.find(d => d.name === 'Contacted')?.percent || 0}%</span>
                )
            }
          </div>
        </motion.div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal === 'subreddit' && (
        <FullScreenModal title="Leads by Subreddit" onClose={() => setModal(null)}>
          <div className="bars-container flex items-end justify-between gap-3 px-4 pb-4 h-full" style={{ minHeight: 300 }}>
            {renderBarChart(subredditData, maxSubredditCount)}
          </div>
        </FullScreenModal>
      )}
      {modal === 'category' && (
        <FullScreenModal title="Leads by Category" onClose={() => setModal(null)}>
          <div style={{ minHeight: 300 }}>
            {renderDonut(categoryData, 'LEADS', leads.length)}
          </div>
        </FullScreenModal>
      )}
      {modal === 'intent' && (
        <FullScreenModal title="Intent Score Distribution" onClose={() => setModal(null)}>
          <div className="hist-container flex items-end justify-between gap-2 px-8 pb-4 h-full" style={{ minHeight: 300 }}>
            {histogramData.map((d, i) => {
              const hp = (d.count / maxHistCount) * 85;
              return (
                <div key={d.name} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div className="w-full h-full flex flex-col justify-end">
                    <motion.div style={{ width: '100%', background: `linear-gradient(to top, rgba(198,255,52,0.25), rgba(198,255,52,0.85))`, borderRadius: '4px 4px 0 0', height: `${hp}%`, transformOrigin: 'bottom' }}
                      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.5, delay: i * 0.07 }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{d.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: LIME }}>{d.count}</span>
                </div>
              );
            })}
          </div>
        </FullScreenModal>
      )}
      {modal === 'time' && (
        <FullScreenModal title="Leads Over Time" onClose={() => setModal(null)}>
          <div style={{ minHeight: 300, position: 'relative' }}>
            <svg className="w-full" viewBox="0 0 600 200" style={{ height: 280 }}>
              <defs>
                <linearGradient id="modalTimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6FF34" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#C6FF34" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = timeSeriesData.map((d, idx) => ({
                  x: (idx / Math.max(timeSeriesData.length - 1, 1)) * 580 + 10,
                  y: 170 - (d.count / maxTimeCount) * 130,
                  ...d,
                }));
                const lp = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const ap = `${lp} L ${pts[pts.length-1].x} 175 L ${pts[0].x} 175 Z`;
                return (
                  <>
                    <motion.path d={ap} fill="url(#modalTimeGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
                    <motion.path d={lp} fill="none" stroke={LIME} strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="4" fill="#0D0D0F" stroke={LIME} strokeWidth="2" />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </FullScreenModal>
      )}
      {modal === 'contacted' && (
        <FullScreenModal title="Contacted vs Uncontacted" onClose={() => setModal(null)}>
          <div style={{ minHeight: 300 }}>
            {renderDonut(contactedData, 'Outreach', `${contactedData.find(d => d.name === 'Contacted')?.percent || 0}%`)}
          </div>
        </FullScreenModal>
      )}
    </>
  );
}
