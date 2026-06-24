import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, Variants } from 'framer-motion';
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

// Unique directions for cards entering the viewport
const card1Variants = {
  hidden: { opacity: 0, x: -80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: 'easeOut' as const }
  }
} as const;

const card2Variants = {
  hidden: { opacity: 0, y: 80 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' as const }
  }
} as const;

const card3Variants = {
  hidden: { opacity: 0, x: 80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: 'easeOut' as const }
  }
} as const;

interface StepData {
  num: string;
  title: string;
  desc: string;
}

function StepCard({ 
  step, 
  variants, 
  prefersReducedMotion 
}: { 
  step: StepData; 
  variants: Variants; 
  prefersReducedMotion: boolean 
}) {
  return (
    <motion.div
      variants={prefersReducedMotion ? {} : variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      whileHover={prefersReducedMotion ? {} : { y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex-1 relative z-10 group cursor-default h-full"
    >
      <div
        className="glass-panel sheen-card corner-ticks bg-[#070708]/85 p-8 rounded-2xl border border-white/[0.08] h-full flex flex-col justify-between text-left shadow-2xl"
      >
        <div className="space-y-4">
          {/* Step number - DM Mono large */}
          <span className="font-mono text-4xl md:text-5xl text-[#C6FF34] font-bold block select-none">
            {step.num}
          </span>

          {/* Step Title - Clash Display */}
          <h4 className="text-lg md:text-xl font-bold text-white tracking-wide font-display">
            {step.title}
          </h4>

          {/* Description - DM Sans */}
          <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-sans select-none">
            {step.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // SVG connector line: starts at full dashoffset, animates to 0 as the section enters viewport
  const { scrollYProgress } = useScroll({ 
    target: sectionRef, 
    offset: ['start end', 'center center'] 
  });
  
  const pathLength = useTransform(scrollYProgress, [0.15, 0.75], [0, 1]);
  const smoothPathLength = useSpring(pathLength, { stiffness: 40, damping: 15 });

  // Ghost Numeral Parallax
  const { scrollYProgress: ghostScrollProgress } = useScroll({ 
    target: sectionRef,
    offset: ['start end', 'end start']
  });
  
  const ghostY = useTransform(ghostScrollProgress, [0, 1], [-80, 80]);
  const smoothGhostY = useSpring(ghostY, { stiffness: 50, damping: 22 });

  const steps: StepData[] = [
    {
      num: "01",
      title: "Define Your ICP",
      desc: "Input description about your ideal customer, target products, subreddits, and keywords.",
    },
    {
      num: "02",
      title: "AI Scans Reddit",
      desc: "Our background pipeline monitors posts and scores them for buying intent using custom language models.",
    },
    {
      num: "03",
      title: "Act on Hot Leads",
      desc: "Review scored signals in your dashboard and copy personalized draft replies instantly.",
    },
  ];

  return (
    <section 
      ref={sectionRef}
      id="how-it-works" 
      className="py-32 bg-[#070708] border-y border-white/5 relative z-10 select-none overflow-hidden flex flex-col items-center justify-center min-h-[600px]"
    >
      {/* Oversized Ghost Numeral - 20% Opacity in volt-lime drifting on parallax */}
      <motion.div
        style={{ y: prefersReducedMotion ? 0 : smoothGhostY }}
        className="absolute text-[320px] font-bold font-display text-[#C6FF34] opacity-20 select-none pointer-events-none z-0 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        03
      </motion.div>

      {/* Container */}
      <div className="max-w-6xl w-full mx-auto px-6 md:px-12 space-y-20 relative z-10">
        
        {/* Heading */}
        <div className="text-center space-y-4">
          <span className="font-mono text-[9px] md:text-[10px] text-[#C6FF34] font-bold tracking-widest block uppercase">
            3-STEP AUTOMATION
          </span>
          
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={headlineContainer}
            className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white select-none py-1 overflow-hidden"
            style={{ letterSpacing: '-0.02em' }}
          >
            {"How SignalRadar Works".split(' ').map((w, i) => (
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
          
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto font-sans leading-relaxed select-none">
            Our autonomous intelligence agent connects you directly to active conversations.
          </p>
        </div>

        {/* Steps Flow Grid */}
        <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-6 mt-16 pb-6">
          
          {/* Animated SVG Line - draws itself on scroll */}
          <div className="hidden md:block absolute top-[60px] left-[12%] right-[12%] h-[2px] z-0 pointer-events-none w-[76%]">
            <svg className="w-full h-full" viewBox="0 0 100 2" preserveAspectRatio="none">
              <motion.line
                x1="0" y1="1" x2="100" y2="1"
                stroke="#C6FF34" strokeWidth="0.8" strokeDasharray="5 3"
                style={{ pathLength: smoothPathLength, opacity: 0.6 }}
              />
            </svg>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {/* Step 1: slides from left */}
            <StepCard 
              step={steps[0]} 
              variants={card1Variants} 
              prefersReducedMotion={prefersReducedMotion} 
            />
            {/* Step 2: slides from bottom */}
            <StepCard 
              step={steps[1]} 
              variants={card2Variants} 
              prefersReducedMotion={prefersReducedMotion} 
            />
            {/* Step 3: slides from right */}
            <StepCard 
              step={steps[2]} 
              variants={card3Variants} 
              prefersReducedMotion={prefersReducedMotion} 
            />
          </div>
        </div>

      </div>
    </section>
  );
}

export default HowItWorks;
