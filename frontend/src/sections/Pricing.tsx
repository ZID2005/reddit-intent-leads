import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Check } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface PricingProps {
  onSelectTier: (tier: 'free' | 'pro') => void;
}

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

export function Pricing({ onSelectTier }: PricingProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Cards stagger in from y:40 with 100ms delay
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
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
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section 
      id="pricing" 
      className="py-32 px-6 md:px-12 max-w-5xl mx-auto space-y-16 select-none relative z-10"
    >
      {/* Scroll trigger entrance wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-16 w-full"
      >
        {/* Heading */}
        <div className="text-center space-y-4">
          <span className="font-mono text-[9px] md:text-[10px] text-[#C6FF34] font-bold tracking-widest block uppercase">
            SIMPLE PRICING
          </span>
          
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={headlineContainer}
            className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white select-none py-1 overflow-hidden"
            style={{ letterSpacing: '-0.02em' }}
          >
            {"Choose Your Monitoring Scope".split(' ').map((w, i) => (
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
          
          <p className="text-sm md:text-base text-gray-500 max-w-sm mx-auto font-sans">
            Billing processed securely via Polar.sh. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto relative"
        >
          {/* Free Tier Card */}
          <motion.div
            variants={cardVariants}
            whileHover={prefersReducedMotion ? {} : { y: -4 }}
            className="glass-panel sheen-card corner-ticks bg-white/[0.04] border border-white/[0.08] p-8 rounded-2xl space-y-8 flex flex-col justify-between"
          >
            <div className="space-y-6 text-left">
              <div>
                <span className="font-mono text-[9px] md:text-[10px] text-gray-500 tracking-widest uppercase block mb-1">
                  FREE TIER
                </span>
                <div className="flex flex-col select-none">
                  <span className="text-4xl md:text-5xl font-bold font-display text-white">$0</span>
                  <span className="text-xs text-gray-500 font-sans mt-1">Forever Free</span>
                </div>
                <p className="text-xs text-gray-500 font-sans mt-3">
                  Basic Reddit monitoring for solo developers testing ideas.
                </p>
              </div>

              <div className="h-px bg-white/5" />

              {/* Feature List with Volt-Lime Check Icons */}
              <ul className="space-y-4 font-sans text-xs md:text-sm text-gray-300">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#C6FF34]/10 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>1 Monitored Subreddit</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#C6FF34]/10 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>24-Hour signal scanning delay</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#C6FF34]/10 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>10 Saved leads per day</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#C6FF34]/10 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Basic priority filtering</span>
                </li>
              </ul>
            </div>

            <motion.button
              whileHover={prefersReducedMotion ? {} : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectTier('free')}
              className="w-full py-3 rounded-xl border border-white/10 glass-panel bg-white/[0.01] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer text-center"
              style={{ minHeight: '44px' }}
            >
              Get Started Free
            </motion.button>
          </motion.div>

          {/* Pro Tier Card (Elevated with Radial Glow) */}
          <div className="relative h-full">
            {/* Ambient Volt Lime Glow */}
            <div 
              className="absolute inset-0 pointer-events-none z-0" 
              style={{
                background: 'radial-gradient(ellipse at center, rgba(198,255,52,0.06) 0%, transparent 70%)',
              }}
            />

            <motion.div
              variants={cardVariants}
              whileHover={prefersReducedMotion ? {} : { y: -4 }}
              className="glass-panel sheen-card corner-ticks border border-[#C6FF34]/40 bg-white/[0.04] p-8 rounded-2xl space-y-8 flex flex-col justify-between relative shadow-[0_8px_32px_rgba(198,255,52,0.08)] z-10 h-full"
            >
              {/* MOST POPULAR BADGE */}
              <div className="absolute top-4 right-4 bg-[#C6FF34]/10 border border-[#C6FF34]/30 text-[#C6FF34] font-mono text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider select-none shadow-[0_0_8px_rgba(198,255,52,0.1)]">
                Most Popular
              </div>

              <div className="space-y-6 text-left">
                <div>
                  <span className="font-mono text-[9px] md:text-[10px] text-[#C6FF34] tracking-widest uppercase font-bold block mb-1">
                    PRO ACCOUNT
                  </span>
                  <div className="flex items-baseline gap-1 select-none">
                    <span className="text-4xl md:text-5xl font-bold font-display text-[#C6FF34]">₹699</span>
                    <span className="text-xs text-gray-500 font-sans font-medium">/ month</span>
                  </div>
                  <p className="text-xs text-gray-500 font-sans mt-3">
                    Complete AI signal extraction for agencies and startup marketing teams.
                  </p>
                </div>

                <div className="h-px bg-white/5" />

                {/* Feature list with Lime Check icons */}
                <ul className="space-y-4 font-sans text-xs md:text-sm text-gray-200">
                  <li className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#C6FF34]/20 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>10 Monitored Subreddits</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#C6FF34]/20 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>Near-real-time alerts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#C6FF34]/20 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>Unlimited qualified leads</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#C6FF34]/20 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>Instant AI outreach draft replies</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#C6FF34]/20 flex items-center justify-center text-[#C6FF34] flex-shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>REST API and webhook integrations</span>
                  </li>
                </ul>
              </div>

              <motion.button
                whileHover={prefersReducedMotion ? {} : { filter: 'brightness(1.1)', boxShadow: '0 0 20px rgba(198,255,52,0.3)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectTier('pro')}
                className="w-full py-3 rounded-xl bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-[0_0_12px_rgba(198,255,52,0.15)] text-center border border-[#C6FF34]/10"
                style={{ minHeight: '44px' }}
              >
                Start Pro Trial
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default Pricing;
