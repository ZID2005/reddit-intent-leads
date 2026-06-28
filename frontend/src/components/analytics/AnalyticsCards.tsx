import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  FolderSearch,
  Zap,
  AlertCircle,
  Info,
  Star,
  PhoneCall,
  Target,
  Calendar,
} from 'lucide-react';
import { Lead } from '../../types/lead';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const NOHEMI = "'Nohemi', sans-serif";
const MONO = "'DM Mono', monospace";
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

// ─── CountUp with motion value ─────────────────────────────────────────────────
function CountUp({ to }: { to: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const ctrl = animate(count, to, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return ctrl.stop;
  }, [to]);
  return <motion.span>{rounded}</motion.span>;
}

interface AnalyticsCardsProps {
  leads: Lead[];
}

interface CardDef {
  title: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  valueColor: string;
  isPercentage?: boolean;
  radial?: boolean;
}

export function AnalyticsCards({ leads }: AnalyticsCardsProps) {
  const totalLeads        = leads.length;
  const highPriority      = leads.filter(l => l.priority === 'high').length;
  const mediumPriority    = leads.filter(l => l.priority === 'medium').length;
  const lowPriority       = leads.filter(l => l.priority === 'low').length;
  const savedLeads        = leads.filter(l => l.status === 'saved').length;
  const contactedLeads    = leads.filter(l => l.status === 'contacted').length;
  const leadsWithIntent   = leads.filter(l => l.intent_score != null && l.intent_score > 0);
  const avgIntent         = leadsWithIntent.length > 0
    ? Math.round(leadsWithIntent.reduce((s, l) => s + l.intent_score, 0) / leadsWithIntent.length)
    : 0;
  const leadsToday        = leads.filter(l => {
    const dv = l.created_at || l.processed_at;
    if (!dv) return false;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return new Date(dv) >= start;
  }).length;

  const cards: CardDef[] = [
    { title: 'Total Leads',      value: totalLeads,     icon: <FolderSearch className="w-4 h-4" />, accentColor: '#fff',               valueColor: '#fff' },
    { title: 'High Priority',    value: highPriority,   icon: <Zap          className="w-4 h-4" />, accentColor: LIME,                 valueColor: LIME },
    { title: 'Medium Priority',  value: mediumPriority, icon: <AlertCircle  className="w-4 h-4" />, accentColor: '#F59E0B',            valueColor: '#F59E0B' },
    { title: 'Low Priority',     value: lowPriority,    icon: <Info         className="w-4 h-4" />, accentColor: 'rgba(255,255,255,0.4)', valueColor: 'rgba(255,255,255,0.6)' },
    { title: 'Saved Leads',      value: savedLeads,     icon: <Star         className="w-4 h-4" />, accentColor: 'rgba(198,255,52,0.8)', valueColor: 'rgba(198,255,52,0.8)' },
    { title: 'Contacted',        value: contactedLeads, icon: <PhoneCall    className="w-4 h-4" />, accentColor: 'rgba(255,255,255,0.5)', valueColor: 'rgba(255,255,255,0.5)' },
    { title: 'Avg Intent Score', value: avgIntent,      icon: <Target       className="w-4 h-4" />, accentColor: LIME, valueColor: LIME, isPercentage: true, radial: true },
    { title: 'Collected Today',  value: leadsToday,     icon: <Calendar     className="w-4 h-4" />, accentColor: '#34D399',            valueColor: '#34D399' },
  ];

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  };

  const cardVariants = {
    hidden:  { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 w-full select-none"
    >
      {cards.map((card) => (
        <StatCard key={card.title} card={card} />
      ))}
    </motion.div>
  );
}

// ─── Individual stat card ──────────────────────────────────────────────────────
function StatCard({ card }: { card: CardDef }) {
  const [pos, setPos]     = useState({ x: 0, y: 0 });
  const [hovered, setHov] = useState(false);

  const cardVariants = {
    hidden:  { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3, transition: { duration: 0.25 } }}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      style={{
        ...glass,
        border: hovered
          ? '1px solid rgba(255,255,255,0.14)'
          : '1px solid rgba(255,255,255,0.08)',
        background: hovered ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.035)',
        boxShadow: hovered
          ? '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
      }}
    >
      {/* Mouse-tracked radial sheen */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(140px circle at ${pos.x}px ${pos.y}px, rgba(198,255,52,0.07), transparent 75%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${card.accentColor}55, transparent)`,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.25s',
      }} />

      {/* Label row */}
      <div className="flex items-center justify-between relative z-10">
        <span style={{
          fontFamily: NOHEMI, fontSize: 9, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
        }}>
          {card.title}
        </span>
        {/* Icon */}
        {card.radial ? (
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path strokeWidth="3" stroke="rgba(255,255,255,0.05)" fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <motion.path
                stroke={LIME} strokeWidth="3" strokeLinecap="round" fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                initial={{ strokeDasharray: '0, 100' }}
                animate={{ strokeDasharray: `${card.value}, 100` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: NOHEMI, fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>
              {card.value}%
            </div>
          </div>
        ) : (
          <div style={{
            padding: '7px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 9,
            color: card.accentColor,
          }}>
            {card.icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="relative z-10">
        <div style={{
          fontFamily: NOHEMI, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
          fontWeight: 800, color: card.valueColor, letterSpacing: '-0.02em', lineHeight: 1,
        }}>
          <CountUp to={card.value} />
          {card.isPercentage && !card.radial && (
            <span style={{ fontSize: '0.55em', marginLeft: 2, color: card.accentColor }}>%</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
