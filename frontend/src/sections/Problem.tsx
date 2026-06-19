import React from 'react';
import { motion, Variants } from 'framer-motion';
import { AlertTriangle, Target, Cpu } from 'lucide-react';

export function Problem() {
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.215, 0.61, 0.355, 1],
      },
    },
  };

  const cards = [
    {
      icon: AlertTriangle,
      title: "90% NOISE",
      desc: "Standard alerts match exact terms like 'marketing tool' regardless of context, drowning your inbox in spam and irrelevant conversations.",
    },
    {
      icon: Target,
      title: "MISSED BUYERS",
      desc: "High-intent users express needs conversationally (e.g., 'our spreadsheets aren't cutting it anymore'). Exact-match systems miss these buyers entirely.",
    },
    {
      icon: Cpu,
      title: "SLOW RESPONSE",
      desc: "Manually checking communities once a day means you respond hours too late. The company that replies to the thread first wins the customer.",
    },
  ];

  return (
    <section id="problem" className="py-32 px-6 md:px-12 max-w-6xl mx-auto space-y-16 select-none relative z-10">
      {/* Heading Entrance */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center space-y-4"
      >
        <span className="font-mono text-[9px] md:text-[10px] text-[#E8A838] font-bold tracking-widest block uppercase">
          THE CONTEXT GAP
        </span>
        <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white select-none">
          Keyword alerts are dead.
        </h2>
        <p className="text-sm md:text-base text-gray-500 max-w-lg mx-auto font-sans">
          Traditional social listening tools fail in context-heavy communities like Reddit.
        </p>
      </motion.div>

      {/* Cards Entrance */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            variants={cardVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="glass-panel border-l-[3px] border-l-[#E8A838] bg-[#141414]/50 p-8 rounded-2xl space-y-5 shadow-lg relative group transition-all"
          >
            {/* Hover Glow Accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#E8A838]/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

            <div className="w-12 h-12 rounded-xl glass-panel border-[#E8A838]/20 bg-[#E8A838]/5 flex items-center justify-center text-[#E8A838]">
              <card.icon className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-white tracking-wide font-mono">
              {card.title}
            </h3>

            <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-sans select-none">
              {card.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
export default Problem;
