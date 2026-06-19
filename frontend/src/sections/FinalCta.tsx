import React from 'react';
import { motion } from 'framer-motion';

interface FinalCtaProps {
  onStart: () => void;
}

export function FinalCta({ onStart }: FinalCtaProps) {
  return (
    <section className="py-24 px-6 md:px-12 relative select-none z-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-4xl mx-auto rounded-3xl p-12 md:p-20 text-center relative overflow-hidden border border-white/10 shadow-[0_12px_64px_rgba(0,0,0,0.8)]"
        style={{
          background: 'radial-gradient(circle at center, #B8F200 0%, rgba(184, 242, 0, 0.35) 55%, #141414 100%)',
          backgroundColor: '#141414',
        }}
      >
        {/* Subtle grid pattern behind gradient */}
        <div className="absolute inset-0 opacity-5 grid-dots pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-8 relative z-10 flex flex-col items-center">
          
          {/* Carbon Heading */}
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight leading-[1.15] text-[#0D0D0D] select-none">
            Start finding buyers while they are still deciding.
          </h2>

          {/* Carbon Subtext */}
          <p className="font-mono text-xs uppercase tracking-widest text-[#0D0D0D]/75 select-none font-bold">
            No credit card required. Cancel anytime.
          </p>

          {/* Carbon Button with white text */}
          <motion.button
            whileHover={{ y: -2, scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="px-8 py-4 rounded-xl bg-[#0D0D0D] text-[#F5F5F5] font-mono text-xs font-bold uppercase tracking-widest hover:bg-black transition-all cursor-pointer border border-white/5"
          >
            Start Free Today
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}
export default FinalCta;
