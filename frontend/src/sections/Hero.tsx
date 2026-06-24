import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { PlayCircle, ArrowRight, ChevronDown } from 'lucide-react';
import Ferrofluid from '../components/Ferrofluid';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface HeroProps {
  onStart: () => void;
  onWatchDemo: () => void;
}

export function Hero({ onStart, onWatchDemo }: HeroProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [scrollPast100, setScrollPast100] = useState(false);

  useEffect(() => {
    const handler = () => setScrollPast100(window.scrollY > 100);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const headline1 = "Find Buying Signals";
  const headline2 = "Before Your Competitors";

  // Stagger children with 80ms delay
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

  const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 25 },
    visible: (delaySec: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: prefersReducedMotion ? 0 : delaySec,
        duration: 0.6,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 md:px-12 bg-[#070708] overflow-hidden select-none">
      {/* WebGL Ferrofluid Background */}
      <Ferrofluid 
        colors={['#ffffff', '#ffffff', '#ffffff']}
        speed={0.04}
        scale={1.5}
        opacity={0.8}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Bottom fade-out gradient overlay to blend with next section */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none z-[1]" />

      {/* Apple Liquid Glass Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
        <div className="w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full bg-[#C6FF34]/[0.03] blur-[150px]" />
      </div>

      {/* Content wrapper */}
      <div className="max-w-4xl space-y-8 z-10 relative mt-20 flex flex-col items-center">
        
        {/* Eyebrow Pill Badge */}
        <motion.div
          custom={0.1}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full glass-panel bg-white/[0.04] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#C6FF34] mr-2 shadow-[0_0_6px_#C6FF34]"
          />
          <span className="font-mono text-[9px] md:text-[10px] text-[#C6FF34] font-bold tracking-widest uppercase">
            AI-POWERED INTENT MONITORING
          </span>
        </motion.div>

        {/* Headline Word-by-word rising out of clip mask */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={headlineContainer}
          className="text-4xl md:text-[72px] font-bold font-display tracking-tight leading-[1.05] text-white max-w-3xl select-none"
          style={{ letterSpacing: '-0.03em' }}
        >
          {/* Line 1 (White) */}
          <span className="block overflow-hidden py-1">
            {headline1.split(' ').map((w, i) => (
              <span key={i} className="inline-block overflow-hidden mr-[0.25em] last:mr-0">
                <motion.span
                  variants={wordVariant}
                  className="inline-block text-white"
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </span>
          
          {/* Line 2 (Volt Lime) */}
          <span className="block overflow-hidden py-1">
            {headline2.split(' ').map((w, i) => (
              <span key={i} className="inline-block overflow-hidden mr-[0.25em] last:mr-0">
                <motion.span
                  variants={wordVariant}
                  className="inline-block text-[#C6FF34]"
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </span>
        </motion.h1>

        {/* Subheadline (DM Sans 18px muted gray) - Fades in after headline */}
        <motion.p
          custom={0.9}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="text-base md:text-lg text-gray-400 font-sans max-w-2xl mx-auto leading-relaxed select-none"
        >
          SignalRadar monitors Reddit communities in real time, identifies purchase intent,
          and delivers qualified leads with AI-generated outreach suggestions.
        </motion.p>

        {/* CTA Button Row - Fades in after subheadline */}
        <motion.div
          custom={1.2}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          {/* Primary CTA Button */}
          <motion.button
            whileHover={prefersReducedMotion ? {} : { filter: 'brightness(1.1)', boxShadow: '0 0 24px rgba(198,255,52,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(198,255,52,0.2)] border border-[#C6FF34]/10 transition-all duration-200"
            style={{ minHeight: '44px' }}
          >
            Start Monitoring Signals
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          {/* Secondary Ghost Watch Demo Button */}
          <motion.button
            whileHover={prefersReducedMotion ? {} : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onWatchDemo}
            className="w-full sm:w-auto px-6 py-4 rounded-xl border border-white/10 glass-panel bg-white/[0.01] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
            style={{ minHeight: '44px' }}
          >
            <PlayCircle className="w-4 h-4 text-white" />
            Watch Demo
          </motion.button>
        </motion.div>

        {/* Social Proof Pills - Slides up after buttons appear */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-8 md:pt-12">
          {[
            { value: "1,200+", label: "Signals Processed" },
            { value: "94%", label: "Accuracy Rate" },
            { value: "Zero", label: "Manual Monitoring" }
          ].map((pill, idx) => (
            <motion.div
              key={idx}
              custom={1.5 + idx * 0.1}
              initial="hidden"
              animate="visible"
              variants={fadeUpVariants}
              className="flex items-center gap-2 px-4 py-2.5 glass-panel bg-white/[0.02] border border-white/[0.08] rounded-full font-mono text-[9px] md:text-[10px] text-gray-400 tracking-wider shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <span className="relative w-1.5 h-1.5 rounded-full bg-[#C6FF34] shadow-[0_0_6px_#C6FF34]">
                <motion.span
                  animate={{
                    scale: [1, 1.4],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-full bg-[#C6FF34]"
                />
              </span>
              <span className="text-white font-bold">{pill.value}</span> {pill.label}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bouncing scroll indicator chevron */}
      <AnimatePresence>
        {!scrollPast100 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer z-10"
            onClick={() => {
              const el = document.getElementById('problem');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="text-white w-6 h-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default Hero;
