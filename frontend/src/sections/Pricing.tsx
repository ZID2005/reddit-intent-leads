import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Check } from 'lucide-react';

interface PricingProps {
  onSelectTier: (tier: 'free' | 'pro') => void;
}

export function Pricing({ onSelectTier }: PricingProps) {
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

  return (
    <section id="pricing" className="py-32 px-6 md:px-12 max-w-5xl mx-auto space-y-16 select-none relative z-10">
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center space-y-4"
      >
        <span className="font-mono text-[9px] md:text-[10px] text-[#B8F200] font-bold tracking-widest block uppercase">
          SIMPLE PRICING
        </span>
        <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white">
          Choose Your Monitoring Scope
        </h2>
        <p className="text-sm md:text-base text-gray-500 max-w-sm mx-auto font-sans">
          Billing processed securely via Polar.sh. Cancel anytime.
        </p>
      </motion.div>

      {/* Cards Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto"
      >
        {/* Free Tier Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -6, transition: { duration: 0.2 } }}
          className="glass-panel bg-[#141414]/40 p-8 rounded-2xl border border-white/5 space-y-8 flex flex-col justify-between"
        >
          <div className="space-y-6">
            <div>
              <span className="font-mono text-[10px] text-gray-500 tracking-widest uppercase block mb-1">
                FREE TIER
              </span>
              <div className="flex items-baseline gap-1 select-none">
                <span className="text-4xl md:text-5xl font-bold font-display text-white">$0</span>
                <span className="text-xs text-gray-500 font-sans font-medium">/ forever</span>
              </div>
              <p className="text-xs text-gray-500 font-sans mt-3">
                Basic Reddit monitoring for solo developers testing ideas.
              </p>
            </div>

            <div className="h-px bg-white/5" />

            <ul className="space-y-4 font-sans text-xs md:text-sm text-gray-300">
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/10 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>1 Subreddit monitoring</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/10 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>24-Hour signal delay</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/10 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>10 Saved leads per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/10 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Basic priority filters</span>
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectTier('free')}
            className="w-full py-3 rounded-xl border border-white/10 glass-panel bg-white/[0.01] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer text-center"
          >
            Get Started Free
          </motion.button>
        </motion.div>

        {/* Pro Tier Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -6, transition: { duration: 0.2 } }}
          className="glass-panel border-2 border-[#B8F200] bg-[#141414]/65 p-8 rounded-2xl space-y-8 flex flex-col justify-between relative shadow-[0_8px_32px_rgba(184,242,0,0.05)]"
        >
          {/* MOST POPULAR BADGE */}
          <div className="absolute top-4 right-4 bg-[#B8F200]/10 border border-[#B8F200]/20 text-[#B8F200] font-mono text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider select-none">
            Most Popular
          </div>

          <div className="space-y-6">
            <div>
              <span className="font-mono text-[10px] text-[#B8F200] tracking-widest uppercase font-bold block mb-1">
                PRO ACCOUNT
              </span>
              <div className="flex items-baseline gap-1 select-none">
                <span className="text-4xl md:text-5xl font-bold font-display text-[#B8F200]">$29</span>
                <span className="text-xs text-gray-500 font-sans font-medium">/ month</span>
              </div>
              <p className="text-xs text-gray-500 font-sans mt-3">
                Complete AI signal extraction for agencies and startup marketing teams.
              </p>
            </div>

            <div className="h-px bg-white/5" />

            <ul className="space-y-4 font-sans text-xs md:text-sm text-gray-200">
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/20 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>10 Subreddits monitoring</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/20 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Near-real-time alerts</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/20 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Unlimited qualified leads</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/20 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Instant AI outreach draft replies</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#B8F200]/20 flex items-center justify-center text-[#B8F200] flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>REST API and webhook integrations</span>
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ y: -1, boxShadow: '0 0 20px rgba(184,242,0,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectTier('pro')}
            className="w-full py-3 rounded-xl bg-[#B8F200] text-[#0D0D0D] font-mono text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-[0_0_12px_rgba(184,242,0,0.15)] text-center"
          >
            Start Pro Trial
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
}
export default Pricing;
