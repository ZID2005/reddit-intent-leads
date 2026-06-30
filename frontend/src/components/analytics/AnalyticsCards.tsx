import React, { useEffect, useState } from 'react';
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
import { glassStyle } from '../../lib/glass';

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
  shouldReduceMotion?: boolean;
}

interface CardDef {
  title: string;
  value: number;
  icon: React.ReactNode;
  valueColor: string;
  isPercentage?: boolean;
}

export function AnalyticsCards({ leads, shouldReduceMotion = false }: AnalyticsCardsProps) {
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
    { title: 'Total Leads',      value: totalLeads,     icon: <FolderSearch />, valueColor: 'text-white' },
    { title: 'High Priority',    value: highPriority,   icon: <Zap />,          valueColor: 'text-[#C6FF34]' },
    { title: 'Medium Priority',  value: mediumPriority, icon: <AlertCircle />,  valueColor: 'text-amber-400' },
    { title: 'Low Priority',     value: lowPriority,    icon: <Info />,         valueColor: 'text-white/55' },
    { title: 'Saved Leads',      value: savedLeads,     icon: <Star />,         valueColor: 'text-[#C6FF34]' },
    { title: 'Contacted',        value: contactedLeads, icon: <PhoneCall />,    valueColor: 'text-amber-400' },
    { title: 'Avg Intent Score', value: avgIntent,      icon: <Target />,       valueColor: 'text-white', isPercentage: true },
    { title: 'Collected Today',  value: leadsToday,     icon: <Calendar />,     valueColor: 'text-white' },
  ];

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0.001 : 0.06 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full select-none mb-5"
    >
      {cards.map((card) => (
        <StatCard key={card.title} card={card} shouldReduceMotion={shouldReduceMotion} />
      ))}
    </motion.div>
  );
}

// ─── Individual stat card ──────────────────────────────────────────────────────
function StatCard({ card, shouldReduceMotion }: { card: CardDef; shouldReduceMotion: boolean }) {
  const [pos, setPos]     = useState({ x: 0, y: 0 });
  const [hovered, setHov] = useState(false);

  const cardVariants = {
    hidden:  shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] as const }
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={shouldReduceMotion ? {} : { y: -3, transition: { duration: 0.25 } }}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseMove={e => {
        if (shouldReduceMotion) return;
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      style={{
        ...glassStyle,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
      }}
      className={`border p-4 md:p-5 ${
        hovered && !shouldReduceMotion
          ? 'border-white/[0.14] bg-white/[0.055] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-white/[0.08] bg-white/[0.035] shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.055)]'
      }`}
    >
      {/* Mouse-tracked radial sheen */}
      <AnimatePresence>
        {hovered && !shouldReduceMotion && (
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
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C6FF34]/20 to-transparent opacity-50" />

      {/* Label row */}
      <div className="flex items-center justify-between w-full relative z-10">
        <span className="font-mono text-[10px] text-white/25 tracking-widest uppercase">
          {card.title}
        </span>
        {React.cloneElement(card.icon as React.ReactElement<any>, {
          className: "w-4 h-4 text-white/18 ml-auto"
        })}
      </div>

      {/* Value */}
      <div className="relative z-10 flex flex-col items-start mt-2">
        <div className={`font-display text-4xl font-bold ${card.valueColor}`}>
          <CountUp to={card.value} />
          {card.isPercentage && (
            <span className="text-[0.65em] font-mono ml-0.5">%</span>
          )}
        </div>
        <div className="w-8 h-0.5 bg-[#C6FF34]/50 rounded-full mt-2" />
      </div>
    </motion.div>
  );
}
