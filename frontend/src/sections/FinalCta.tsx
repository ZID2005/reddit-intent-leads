import React from 'react';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const STAGGER = 0.035;

const TextRoll: React.FC<{
  children: string;
  className?: string;
  center?: boolean;
  charIndexOffset: number;
  totalLength: number;
}> = ({ children, className, center = false, charIndexOffset, totalLength }) => {
  return (
    <span
      className={`relative inline-block overflow-hidden ${className || ""}`}
      style={{
        lineHeight: 0.85,
      }}
    >
      <span className="block">
        {children.split("").map((l, i) => {
          const globalIdx = i + charIndexOffset;
          const delay = center
            ? STAGGER * Math.abs(globalIdx - (totalLength - 1) / 2)
            : STAGGER * globalIdx;

          return (
            <motion.span
              variants={{
                initial: {
                  y: 0,
                },
                hovered: {
                  y: "-100%",
                },
              }}
              transition={{
                ease: "easeInOut",
                delay,
              }}
              className="inline-block"
              key={i}
            >
              {l}
            </motion.span>
          );
        })}
      </span>
      <span className="absolute inset-0 block">
        {children.split("").map((l, i) => {
          const globalIdx = i + charIndexOffset;
          const delay = center
            ? STAGGER * Math.abs(globalIdx - (totalLength - 1) / 2)
            : STAGGER * globalIdx;

          return (
            <motion.span
              variants={{
                initial: {
                  y: "100%",
                },
                hovered: {
                  y: 0,
                },
              }}
              transition={{
                ease: "easeInOut",
                delay,
              }}
              className="inline-block"
              key={i}
            >
              {l}
            </motion.span>
          );
        })}
      </span>
    </span>
  );
};

interface FinalCtaProps {
  onStart: () => void;
}

export function FinalCta({ onStart }: FinalCtaProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }
    }
  };

  return (
    <section className="py-32 px-6 md:px-12 relative select-none z-10 overflow-hidden bg-[#070708] w-full flex items-center justify-center">
      {/* Dynamic Ambient Background Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none z-0 opacity-40 blur-[120px]" 
        style={{
          background: 'radial-gradient(circle, rgba(198,255,52,0.15) 0%, transparent 70%)',
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="w-full max-w-4xl rounded-3xl p-12 md:p-20 text-center relative overflow-hidden border border-white/[0.08] backdrop-blur-3xl bg-white/[0.02] shadow-[0_32px_80px_rgba(0,0,0,0.8)] z-10"
      >
        {/* Subtle dot grid overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

        {/* Liquid Glass Animated Blobs Inside Card */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            animate={prefersReducedMotion ? {} : {
              x: [0, 40, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.15, 0.9, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#C6FF34]/[0.05] blur-[80px]"
          />
          <motion.div
            animate={prefersReducedMotion ? {} : {
              x: [0, -50, 30, 0],
              y: [0, 40, -30, 0],
              scale: [1, 1.2, 0.85, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#C6FF34]/[0.04] blur-[100px]"
          />
        </div>

        {/* Content Wrapper */}
        <div className="max-w-2xl mx-auto space-y-8 relative z-10 flex flex-col items-center">
          
          {/* Eyebrow Pill Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C6FF34] shadow-[0_0_8px_rgba(198,255,52,0.3)] animate-pulse" />
            <span className="font-mono text-[9px] md:text-[10px] text-[#C6FF34] font-bold tracking-widest uppercase">
              Start Monitoring Free
            </span>
          </motion.div>

          {/* Headline - Clash Display */}
          <motion.h2 
            variants={itemVariants}
            whileHover="hovered"
            className="text-3xl md:text-[56px] font-bold font-display tracking-tight leading-[1.08] text-white select-none max-w-xl mx-auto flex flex-wrap justify-center cursor-pointer py-1"
            style={{ letterSpacing: '-0.02em' }}
          >
            {(() => {
              const headline = "Start finding buyers while they're still deciding.";
              const words = headline.split(" ");
              let accumulatedLength = 0;
              return words.map((word, idx) => {
                const offset = accumulatedLength;
                accumulatedLength += word.length + 1;
                return (
                  <TextRoll 
                    key={idx} 
                    charIndexOffset={offset}
                    totalLength={headline.length}
                    center
                    className="mr-[0.25em] last:mr-0"
                  >
                    {word}
                  </TextRoll>
                );
              });
            })()}
          </motion.h2>

          {/* Subtext */}
          <motion.p 
            variants={itemVariants}
            className="font-sans text-sm md:text-base text-gray-400 select-none max-w-md mx-auto"
          >
            SignalRadar runs in real-time, delivering qualified Reddit purchase intent leads with draft replies straight to your dashboard.
          </motion.p>

          {/* CTA Button & Secondary Subtext */}
          <motion.div 
            variants={itemVariants}
            className="space-y-4 pt-4 flex flex-col items-center"
          >
            <motion.button
              whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: '0 0 32px rgba(198,255,52,0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="px-8 py-4 rounded-xl bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(198,255,52,0.2)] border border-[#C6FF34]/10 transition-all duration-200"
              style={{ minHeight: '48px' }}
            >
              Start Free Today
              <ArrowRight className="w-4 h-4 text-[#070708]" />
            </motion.button>
            
            <p className="font-mono text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest select-none pt-2">
              No credit card required &bull; Cancel anytime &bull; 50 free leads
            </p>
          </motion.div>

        </div>
      </motion.div>
    </section>
  );
}

export default FinalCta;
