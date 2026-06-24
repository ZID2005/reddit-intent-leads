import React from 'react';
import { motion, Variants } from 'framer-motion';
import { AlertTriangle, Target, Cpu } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const headlineContainer = {
  hidden: {},
  visible: { 
    transition: { 
      staggerChildren: 0.08 
    } 
  }
};

const wordVariant: Variants = {
  hidden: { y: '110%', opacity: 0 },
  visible: { 
    y: '0%', 
    opacity: 1, 
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1] 
    } 
  }
};

const cardGridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1 // 100ms delay stagger
    }
  }
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number] 
    }
  }
};

interface CardData {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

function ProblemCard({ card, prefersReducedMotion }: { card: CardData; prefersReducedMotion: boolean }) {
  return (
    <motion.div
      variants={cardItemVariants}
      whileHover={prefersReducedMotion ? {} : { y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="sheen-card corner-ticks glass-panel bg-white/[0.04] border border-white/[0.08] border-l-2 border-l-[#E8A838] p-8 rounded-xl space-y-6 shadow-xl relative group flex flex-col justify-between"
    >
      <div className="space-y-6 text-left">
        {/* Amber Icon container */}
        <div className="w-12 h-12 rounded-xl glass-panel border-[#E8A838]/20 bg-[#E8A838]/5 flex items-center justify-center text-[#E8A838] shadow-inner">
          <card.icon className="w-5 h-5" />
        </div>

        <div className="space-y-3">
          {/* Title - DM Mono */}
          <h3 className="text-base font-bold text-white tracking-wide font-mono uppercase">
            {card.title}
          </h3>

          {/* Description - DM Sans */}
          <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-sans select-none">
            {card.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function Problem() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const cards: CardData[] = [
    {
      icon: AlertTriangle,
      title: "90% Noise",
      desc: "Standard alerts match exact terms like 'marketing tool' regardless of context, drowning your inbox in spam and irrelevant conversations.",
    },
    {
      icon: Target,
      title: "Missed Buyers",
      desc: "High-intent users express needs conversationally (e.g., 'our spreadsheets aren't cutting it anymore'). Exact-match systems miss these buyers entirely.",
    },
    {
      icon: Cpu,
      title: "Slow Response",
      desc: "Manually checking communities once a day means you respond hours too late. The company that replies to the thread first wins the customer.",
    },
  ];

  return (
    <section 
      id="problem" 
      className="py-32 bg-[#0A0A0A] border-b border-white/5 relative z-10 select-none overflow-hidden"
    >
      {/* Scroll triggered entrance */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl mx-auto px-6 md:px-12 space-y-16"
      >
        {/* Section Header */}
        <div className="text-center space-y-5 flex flex-col items-center">
          {/* Kicker label */}
          <div className="inline-flex items-center px-3 py-1.5 rounded-full glass-panel bg-white/[0.04] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <span className="font-mono text-[9px] md:text-[10px] text-[#C6FF34] font-bold tracking-widest uppercase">
              THE CURRENT WAY
            </span>
          </div>

          {/* Headline in Clash Display center-aligned with Clip Mask rise */}
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={headlineContainer}
            className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white select-none py-1 overflow-hidden"
            style={{ letterSpacing: '-0.02em' }}
          >
            {"Keyword alerts are dead.".split(' ').map((w, i) => (
              <span key={i} className="inline-block overflow-hidden mr-[0.25em] last:mr-0">
                <motion.span
                  variants={wordVariant}
                  className="inline-block"
                  style={{ filter: prefersReducedMotion ? 'none' : 'drop-shadow(0 0 16px rgba(255,255,255,0.08))' }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </motion.h2>

          {/* Subtext in DM Sans muted */}
          <p className="text-sm md:text-base text-gray-500 max-w-lg mx-auto font-sans leading-relaxed">
            Traditional social listening tools fail in context-heavy communities like Reddit.
          </p>
        </div>

        {/* 3 Cards staggered grid */}
        <motion.div
          variants={cardGridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {cards.map((card, idx) => (
            <ProblemCard 
              key={idx} 
              card={card} 
              prefersReducedMotion={prefersReducedMotion} 
            />
          ))}
        </motion.div>

      </motion.div>
    </section>
  );
}

export default Problem;
