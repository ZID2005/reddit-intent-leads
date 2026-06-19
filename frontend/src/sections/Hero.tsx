import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Play, ArrowRight, ChevronDown } from 'lucide-react';
import { ThreeRadarField } from '../components/ThreeRadarField';

interface HeroProps {
  onStart: () => void;
  onWatchDemo: () => void;
}

export function Hero({ onStart, onWatchDemo }: HeroProps) {
  // Stagger configurations
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 md:px-12 bg-[#0D0D0D] overflow-hidden select-none">
      {/* 3D Particle Field Background */}
      <ThreeRadarField />

      {/* Atmospheric radial sweeps */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
        <div className="w-[450px] md:w-[700px] h-[450px] md:h-[700px] rounded-full bg-[#B8F200]/3 blur-[120px] radar-sweep-bg" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl space-y-8 z-10 relative mt-16 flex flex-col items-center"
      >
        {/* Eyebrow Pill */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel bg-white/[0.03] border-white/10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#B8F200] animate-pulse" />
          <span className="font-mono text-[9px] md:text-[10px] text-[#B8F200] font-bold tracking-widest uppercase">
            AI-POWERED INTENT MONITORING
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl md:text-7xl font-bold font-display tracking-tight leading-[1.05] text-white max-w-3xl select-none"
          style={{ letterSpacing: '-0.03em' }}
        >
          Find Buying Signals <br />
          <span className="text-[#B8F200]">Before Your Competitors</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="text-sm md:text-lg text-gray-400 font-sans max-w-2xl mx-auto leading-relaxed select-none"
        >
          SignalRadar monitors Reddit communities in real time, identifies purchase intent,
          and delivers qualified leads with AI-generated outreach suggestions.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          {/* Primary CTA */}
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 0 24px rgba(184,242,0,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#B8F200] text-[#0D0D0D] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(184,242,0,0.2)]"
          >
            Start Monitoring Signals
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          {/* Secondary CTA */}
          <motion.button
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onWatchDemo}
            className="w-full sm:w-auto px-6 py-4 rounded-xl border border-white/10 glass-panel bg-white/[0.02] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all duration-150"
          >
            <Play className="w-3.5 h-3.5 fill-current text-white" />
            Watch Demo
          </motion.button>
        </motion.div>

        {/* Social Proof Pills */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-3 pt-8 md:pt-12"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 glass-panel bg-white/[0.02] border-white/5 rounded-full font-mono text-[9px] md:text-[10px] text-gray-300 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8F200] animate-pulse" />
            <span className="text-white font-bold">1,200+</span> Signals Processed
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 glass-panel bg-white/[0.02] border-white/5 rounded-full font-mono text-[9px] md:text-[10px] text-gray-300 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8F200] animate-pulse" />
            <span className="text-white font-bold">94%</span> Accuracy Rate
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 glass-panel bg-white/[0.02] border-white/5 rounded-full font-mono text-[9px] md:text-[10px] text-gray-300 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8F200] animate-pulse" />
            <span className="text-white font-bold">Zero</span> Manual Monitoring
          </div>
        </motion.div>
      </motion.div>

      {/* Bouncing Scroll indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer pointer-events-auto"
        onClick={() => {
          document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span className="font-mono text-[9px] tracking-widest text-gray-500 uppercase">Scroll Down</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-4 h-4 text-[#B8F200]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
export default Hero;
