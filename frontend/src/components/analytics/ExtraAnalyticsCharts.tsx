import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Database, Layers, BarChart3, PieChart, Maximize2, X } from 'lucide-react';
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

const tooltipStyle: React.CSSProperties = {
  background:           '#0D0D0F',
  border:               '1px solid rgba(255,255,255,0.10)',
  backdropFilter:       'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius:         12,
  padding:              '8px 12px',
  boxShadow:            '0 8px 24px rgba(0,0,0,0.5)',
};

// ─── Polar helpers (unchanged) ─────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(x: number, y: number, r: number, start: number, end: number) {
  const s = polarToCartesian(x, y, r, end);
  const e = polarToCartesian(x, y, r, start);
  const large = end - start <= 180 ? '0' : '1';
  return ['M', x, y, 'L', s.x, s.y, 'A', r, r, 0, large, 0, e.x, e.y, 'Z'].join(' ');
}

// ─── Full-screen modal ─────────────────────────────────────────────────────────
function FullScreenModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
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
        style={{ ...glass, borderRadius: 24, width: '100%', maxWidth: 900, padding: '32px', maxHeight: '80vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 style={{ fontFamily: GODBER, fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px', cursor: 'pointer', display: 'flex' }}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 400 }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ─── Glass chart card ──────────────────────────────────────────────────────────
function ChartCard({ title, icon, height = 320, children, onMaximize, onExportPng, onExportJson }: {
  title: string;
  icon: React.ReactNode;
  height?: number;
  children: React.ReactNode;
  onMaximize?: () => void;
  onExportPng?: () => void;
  onExportJson?: () => void;
}) {
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
      }}
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span style={{ color: LIME }}>{icon}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onExportPng && (
            <button onClick={onExportPng} style={{ padding: '4px 8px', fontFamily: MONO, fontSize: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Download className="w-2.5 h-2.5" /> PNG
            </button>
          )}
          {onExportJson && (
            <button onClick={onExportJson} style={{ padding: '4px 8px', fontFamily: MONO, fontSize: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              JSON
            </button>
          )}
          {onMaximize && (
            <button onClick={onMaximize} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Maximize2 className="w-4 h-4" style={{ color: hovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', transition: 'color 0.2s' }} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 relative min-h-0">{children}</div>
    </motion.div>
  );
}

interface ExtraAnalyticsChartsProps {
  leads: Lead[];
  loading: boolean;
}

// ─── Client-side PNG Exporter (unchanged logic) ────────────────────────────────
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
        ctx.fillStyle = '#0F0E0E';
        ctx.fillRect(0, 0, bbox.width, bbox.height);
        ctx.drawImage(image, 0, 0, bbox.width, bbox.height);
        const pngURL = canvas.toDataURL('image/png');
        const a      = document.createElement('a');
        a.href       = pngURL;
        a.download   = `${fileName}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  } catch (err) { console.error('Error exporting PNG:', err); }
}

function exportJson(data: unknown, fileName: string) {
  try {
    const str  = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a    = document.createElement('a');
    a.href     = str;
    a.download = `${fileName}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  } catch (err) { console.error('Error exporting JSON:', err); }
}

export function ExtraAnalyticsCharts({ leads, loading }: ExtraAnalyticsChartsProps) {
  const [hoveredLine,      setHoveredLine]      = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredPie,       setHoveredPie]       = useState<{ x: number; y: number; label: string; value: number; percent: number } | null>(null);
  const [hoveredSubreddit, setHoveredSubreddit] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredFunnel,    setHoveredFunnel]    = useState<{ x: number; y: number; label: string; value: number; rate: string } | null>(null);
  const [modal, setModal] = useState<null | 'line' | 'pie' | 'bar' | 'funnel'>(null);

  const lineChartRef   = useRef<SVGSVGElement>(null);
  const pieChartRef    = useRef<SVGSVGElement>(null);
  const barChartRef    = useRef<SVGSVGElement>(null);
  const funnelChartRef = useRef<SVGSVGElement>(null);

  // ── 1. Leads Per Day (Last 30 Days) — unchanged logic ──────────────────
  const leadsPerDayData = useMemo(() => {
    const dates: { dateStr: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(now.getDate() - i);
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
  const maxLineCount = useMemo(() => Math.max(...leadsPerDayData.map(d => d.count), 1), [leadsPerDayData]);

  // ── 2. Category Distribution — unchanged logic ─────────────────────────
  const categoryData = useMemo(() => {
    const counts = { buying_intent: 0, pain_point: 0, comparison: 0, research: 0 };
    leads.forEach(l => { if (l.category in counts) counts[l.category as keyof typeof counts]++; });
    const labels  = { buying_intent: 'Buying Intent', pain_point: 'Pain Point', comparison: 'Comparison', research: 'Research' };
    const colors  = { buying_intent: '#C6FF34', comparison: '#22D3EE', pain_point: '#FFB347', research: '#A855F7' };
    const total   = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).map(([key, count]) => ({
      key, name: labels[key as keyof typeof labels], count,
      color: colors[key as keyof typeof colors],
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [leads]);

  // ── 3. Top Subreddits — unchanged logic ────────────────────────────────
  const topSubredditsData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.subreddit] = (counts[l.subreddit] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [leads]);
  const maxSubredditCount = useMemo(() => Math.max(...topSubredditsData.map(d => d.count), 1), [topSubredditsData]);

  // ── 4. Funnel Data — unchanged logic ───────────────────────────────────
  const funnelData = useMemo(() => {
    const totalNew      = leads.length;
    const totalSaved    = leads.filter(l => l.status === 'saved' || l.status === 'contacted').length;
    const totalContacted = leads.filter(l => l.status === 'contacted').length;
    const savedPct      = totalNew > 0 ? Math.round((totalSaved / totalNew) * 100) : 0;
    const contactedPct  = totalSaved > 0 ? Math.round((totalContacted / totalSaved) * 100) : 0;
    const overallPct    = totalNew > 0 ? Math.round((totalContacted / totalNew) * 100) : 0;
    return [
      { name: 'Incoming Leads',    count: totalNew,       color: '#C6FF34', rate: '100% Baseline' },
      { name: 'Shortlisted Leads', count: totalSaved,     color: '#22D3EE', rate: `${savedPct}% Saved` },
      { name: 'Outreach Initiated',count: totalContacted, color: '#A855F7', rate: `${contactedPct}% Contacted (${overallPct}% overall)` },
    ];
  }, [leads]);

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {[1,2,3,4].map(i => (
          <div key={i} style={{ ...glass, height: 320, padding: '20px' }}>
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse mb-4" />
            <div className="flex-1 bg-white/[0.02] rounded-lg animate-pulse flex items-center justify-center h-48">
              <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-lime animate-spin" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (leads.length === 0) {
    return (
      <div style={{ ...glass, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 300 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Database className="w-6 h-6" style={{ color: LIME, opacity: 0.8 }} />
        </div>
        <h3 style={{ fontFamily: MONO, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff', marginBottom: 6 }}>No Data Available</h3>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)', maxWidth: 360 }}>
          No qualified leads were found in the selected timeframe. Try expanding your date range filter.
        </p>
      </div>
    );
  }

  // ── Line chart render helper ────────────────────────────────────────────
  const renderLineChart = (ref: React.RefObject<SVGSVGElement | null>, vbW = 460, vbH = 170, maxH = 130, startX = 20, endX = 440, width = 420) => {
    const pts = leadsPerDayData.map((d, idx) => ({
      x: startX + (idx / 29) * width,
      y: maxH - (d.count / maxLineCount) * (maxH - 20),
      date: d.date, count: d.count,
    }));
    const lp = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const ap = `${lp} L ${pts[pts.length-1].x} ${maxH} L ${pts[0].x} ${maxH} Z`;
    return (
      <svg ref={ref as any} className="w-full h-full overflow-visible" viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6FF34" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#C6FF34" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={startX} y1="20" x2={endX} y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1={startX} y1="75" x2={endX} y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1={startX} y1={maxH} x2={endX} y2={maxH} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <motion.path d={ap} fill="url(#lineAreaGrad)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
        <motion.path d={lp} fill="none" stroke={LIME} strokeWidth="2.5" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: 'easeOut' }} />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0D0D0F" stroke={LIME} strokeWidth="2" style={{ cursor: 'pointer' }}
            onMouseEnter={() => {
              if (ref.current) {
                const r = ref.current.getBoundingClientRect();
                setHoveredLine({ x: (p.x / vbW) * r.width, y: (p.y / vbH) * r.height - 8, label: p.date, value: p.count });
              }
            }}
            onMouseLeave={() => setHoveredLine(null)}
          />
        ))}
      </svg>
    );
  };

  // ── Horizontal bar chart render helper ────────────────────────────────
  const renderHorizBars = (ref: React.RefObject<SVGSVGElement | null>) => (
    <svg ref={ref as any} className="w-full h-full" viewBox="0 0 460 230" preserveAspectRatio="none">
      <defs>
        <linearGradient id="hBarGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C6FF34" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C6FF34" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {topSubredditsData.map((d, i) => {
        const yPos    = 12 + i * 22;
        const barW    = (d.count / maxSubredditCount) * 280;
        return (
          <g key={d.name}>
            <text x="8" y={yPos + 11} fill="rgba(255,255,255,0.65)" fontSize="9" fontFamily={MONO}>r/{d.name}</text>
            <rect x="100" y={yPos} width="280" height="12" rx="3" fill="rgba(255,255,255,0.02)" />
            <motion.rect x="100" y={yPos} height="12" rx="3" fill="url(#hBarGrad)"
              initial={{ width: 0 }} whileInView={{ width: barW }} viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.04 }}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => {
                if (ref.current) {
                  const r = ref.current.getBoundingClientRect();
                  setHoveredSubreddit({ x: r.width * ((100 + barW / 2) / 460), y: r.height * (yPos / 230) - 8, label: `r/${d.name}`, value: d.count });
                }
              }}
              onMouseLeave={() => setHoveredSubreddit(null)}
            />
            <text x={107 + barW} y={yPos + 10} fill={LIME} fontSize="9" fontWeight="bold" fontFamily={MONO}>{d.count}</text>
          </g>
        );
      })}
    </svg>
  );

  // ── Funnel render helper ───────────────────────────────────────────────
  const renderFunnel = (ref: React.RefObject<SVGSVGElement | null>) => {
    const topY = 15, h = 45, gap = 12;
    const p1 = `50,${topY} 410,${topY} 360,${topY+h} 100,${topY+h}`;
    const p2 = `105,${topY+h+gap} 355,${topY+h+gap} 310,${topY+h*2+gap} 150,${topY+h*2+gap}`;
    const p3 = `155,${topY+h*2+gap*2} 305,${topY+h*2+gap*2} 275,${topY+h*3+gap*2} 185,${topY+h*3+gap*2}`;
    const polys = [
      { points: p1, color: 'rgba(198,255,52,0.75)', stroke: '#C6FF34', data: funnelData[0], yOff: topY + h/2 },
      { points: p2, color: 'rgba(34,211,238,0.70)', stroke: '#22D3EE', data: funnelData[1], yOff: topY+h+gap+h/2 },
      { points: p3, color: 'rgba(168,85,247,0.75)',  stroke: '#A855F7', data: funnelData[2], yOff: topY+h*2+gap*2+h/2 },
    ];
    return (
      <svg ref={ref as any} className="w-full h-full max-h-[220px]" viewBox="0 0 460 200">
        {polys.map((poly, idx) => (
          <g key={idx}>
            <motion.polygon points={poly.points} fill={poly.color} stroke={poly.stroke} strokeWidth="1.5"
              initial={{ opacity: 0, y: -10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => {
                if (ref.current) {
                  const r = ref.current.getBoundingClientRect();
                  setHoveredFunnel({ x: r.width / 2, y: r.height * (poly.yOff / 200) - 8, label: poly.data.name, value: poly.data.count, rate: poly.data.rate });
                }
              }}
              onMouseLeave={() => setHoveredFunnel(null)}
            />
            <text x="230" y={poly.yOff + 4} textAnchor="middle" fill="#fff" fontWeight="bold" fontSize="9.5" fontFamily={MONO} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {poly.data.name}: {poly.data.count}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full select-none">

        {/* 1. Leads Per Day (30 Days Line Chart) */}
        <ChartCard
          title="Leads Per Day (30 Days)" icon={<BarChart3 className="w-3.5 h-3.5" />} height={320}
          onMaximize={() => setModal('line')}
          onExportPng={() => exportPng(lineChartRef.current, 'leads_per_day_chart')}
          onExportJson={() => exportJson(leadsPerDayData, 'leads_per_day_data')}
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 relative min-h-0" style={{ height: '75%' }}>
              {renderLineChart(lineChartRef)}
            </div>
            <div className="flex justify-between w-full mt-2 pt-1.5 px-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontFamily: MONO, fontSize: 7.5, color: 'rgba(255,255,255,0.3)' }}>{leadsPerDayData[0]?.date}</span>
              <span style={{ fontFamily: MONO, fontSize: 7.5, color: 'rgba(255,255,255,0.3)' }}>{leadsPerDayData[14]?.date}</span>
              <span style={{ fontFamily: MONO, fontSize: 7.5, color: 'rgba(255,255,255,0.3)' }}>{leadsPerDayData[29]?.date}</span>
            </div>
            <AnimatePresence>
              {hoveredLine && (
                <motion.div initial={{ opacity: 0, y: 5, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ ...tooltipStyle, position: 'absolute', left: hoveredLine.x, top: hoveredLine.y, transform: 'translate(-50%, -100%)', pointerEvents: 'none', zIndex: 30, whiteSpace: 'nowrap' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: LIME, fontWeight: 700, marginBottom: 2 }}>{hoveredLine.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{hoveredLine.value} leads</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ChartCard>

        {/* 2. Category Distribution (Pie Chart) */}
        <ChartCard
          title="Category Breakdown" icon={<PieChart className="w-3.5 h-3.5" />} height={320}
          onMaximize={() => setModal('pie')}
          onExportPng={() => exportPng(pieChartRef.current, 'category_pie_chart')}
          onExportJson={() => exportJson(categoryData, 'category_distribution_data')}
        >
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-full pt-1">
            {/* SVG Pie */}
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg ref={pieChartRef} className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {(() => {
                  let accumulated = 0;
                  const total = categoryData.reduce((a, b) => a + b.count, 0);
                  if (total === 0) return <circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.03)" />;
                  const nonZero = categoryData.filter(c => c.count > 0);
                  if (nonZero.length === 1) {
                    const cat = nonZero[0];
                    return <circle cx="50" cy="50" r="40" fill="transparent" stroke={cat.color} strokeWidth="16" style={{ cursor: 'pointer' }} />;
                  }
                  return categoryData.map((d, i) => {
                    if (d.count === 0) return null;
                    const slice = (d.count / total) * 360;
                    const start = accumulated;
                    accumulated += slice;
                    return (
                      <motion.path key={d.key} d={describeArc(50, 50, 40, start, accumulated)} fill={d.color} opacity={0.85}
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: i * 0.05 }}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPie({ x: 72, y: 72, label: d.name, value: d.count, percent: d.percent })}
                        onMouseLeave={() => setHoveredPie(null)}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span style={{ fontFamily: NOHEMI, fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Engine</span>
                <span style={{ fontFamily: GODBER, fontSize: 14, fontWeight: 700, color: '#fff' }}>AI</span>
                <span style={{ fontFamily: NOHEMI, fontSize: 7, color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Parser</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 flex flex-col gap-2 min-w-[140px] max-w-[200px]">
              {categoryData.map(d => (
                <motion.div key={d.key} initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}
                  className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{d.name}</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', fontWeight: 700 }}>{d.count}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>({d.percent}%)</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <AnimatePresence>
              {hoveredPie && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ ...tooltipStyle, position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 30 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: categoryData.find(c => c.name === hoveredPie.label)?.color, fontWeight: 700, textAlign: 'center' }}>{hoveredPie.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>{hoveredPie.value} leads ({hoveredPie.percent}%)</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ChartCard>

        {/* 3. Top Subreddits Horizontal Bar */}
        <ChartCard
          title="Top Subreddits" icon={<Layers className="w-3.5 h-3.5" />} height={320}
          onMaximize={() => setModal('bar')}
          onExportPng={() => exportPng(barChartRef.current, 'top_subreddits_chart')}
          onExportJson={() => exportJson(topSubredditsData, 'top_subreddits_data')}
        >
          <div className="flex-1 relative h-full">
            {topSubredditsData.length === 0
              ? <div className="flex items-center justify-center h-full" style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No data available</div>
              : renderHorizBars(barChartRef)
            }
            <AnimatePresence>
              {hoveredSubreddit && (
                <motion.div initial={{ opacity: 0, y: 5, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ ...tooltipStyle, position: 'absolute', left: hoveredSubreddit.x, top: hoveredSubreddit.y, transform: 'translate(-50%, -100%)', pointerEvents: 'none', zIndex: 30, whiteSpace: 'nowrap' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: LIME, fontWeight: 700, marginBottom: 2 }}>{hoveredSubreddit.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{hoveredSubreddit.value} leads</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ChartCard>

        {/* 4. Conversion Funnel */}
        <ChartCard
          title="Conversion Funnel" icon={<Database className="w-3.5 h-3.5" />} height={320}
          onMaximize={() => setModal('funnel')}
          onExportPng={() => exportPng(funnelChartRef.current, 'funnel_conversion_chart')}
          onExportJson={() => exportJson(funnelData, 'funnel_conversion_data')}
        >
          <div className="flex flex-col justify-center h-full">
            {/* Funnel layers */}
            <div className="flex flex-col items-center gap-2 w-full px-4">
              {funnelData.map((layer, idx) => {
                const widths = ['100%', '75%', '52%'];
                const colors = ['rgba(198,255,52,0.75)', 'rgba(34,211,238,0.65)', 'rgba(168,85,247,0.7)'];
                const borders = ['rgba(198,255,52,0.5)', 'rgba(34,211,238,0.4)', 'rgba(168,85,247,0.45)'];
                return (
                  <motion.div
                    key={layer.name}
                    initial={{ opacity: 0, y: -12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: idx * 0.1 }}
                    style={{
                      width: widths[idx],
                      background: colors[idx],
                      border: `1px solid ${borders[idx]}`,
                      borderRadius: 10,
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', fontWeight: 600 }}>{layer.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: '#fff', fontWeight: 700 }}>{layer.count}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.6)', marginLeft: 6 }}>{layer.rate.split(' ')[0]}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal === 'line' && (
          <FullScreenModal title="Leads Per Day (Last 30 Days)" onClose={() => setModal(null)}>
            <div style={{ height: 360, position: 'relative' }}>
              {renderLineChart({ current: null } as any, 600, 220, 190, 20, 580, 560)}
            </div>
          </FullScreenModal>
        )}
        {modal === 'pie' && (
          <FullScreenModal title="Category Breakdown" onClose={() => setModal(null)}>
            <div className="flex flex-col sm:flex-row items-center justify-around gap-8 py-4">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {(() => {
                    let acc = 0;
                    const total = categoryData.reduce((a, b) => a + b.count, 0);
                    if (total === 0) return null;
                    return categoryData.map((d, i) => {
                      if (d.count === 0) return null;
                      const s = (d.count / total) * 360;
                      const start = acc; acc += s;
                      return <motion.path key={d.key} d={describeArc(50, 50, 40, start, acc)} fill={d.color} opacity={0.9} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: i * 0.05 }} />;
                    });
                  })()}
                </svg>
              </div>
              <div className="flex flex-col gap-3">
                {categoryData.map(d => (
                  <div key={d.key} className="flex items-center gap-3">
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.color }} />
                    <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{d.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: '#fff', fontWeight: 700 }}>{d.count}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>({d.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </FullScreenModal>
        )}
        {modal === 'bar' && (
          <FullScreenModal title="Top Subreddits" onClose={() => setModal(null)}>
            <div style={{ height: 400 }}>{renderHorizBars({ current: null } as any)}</div>
          </FullScreenModal>
        )}
        {modal === 'funnel' && (
          <FullScreenModal title="Conversion Funnel" onClose={() => setModal(null)}>
            <div className="flex flex-col items-center gap-4 py-8">
              {funnelData.map((layer, idx) => {
                const widths = ['90%', '68%', '48%'];
                const colors = ['rgba(198,255,52,0.75)', 'rgba(34,211,238,0.65)', 'rgba(168,85,247,0.7)'];
                return (
                  <motion.div key={layer.name} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                    style={{ width: widths[idx], background: colors[idx], borderRadius: 12, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: '#fff', fontWeight: 600 }}>{layer.name}</span>
                    <div>
                      <span style={{ fontFamily: MONO, fontSize: 20, color: '#fff', fontWeight: 700 }}>{layer.count}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginLeft: 8 }}>{layer.rate}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </FullScreenModal>
        )}
      </AnimatePresence>
    </>
  );
}
