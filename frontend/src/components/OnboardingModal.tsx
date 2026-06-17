import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Search, Rss, ArrowRight, X } from 'lucide-react';

interface OnboardingModalProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function OnboardingModal({ step, onNext, onPrev, onSkip }: OnboardingModalProps) {
  const steps = [
    {
      title: "1. Define Subreddits to Monitor",
      desc: "Specify online communities relevant to your industry. SignalRadar scans these subreddits continuously to parse discussion threads for sales signals.",
      icon: <Rss className="w-8 h-8 text-lime" />,
    },
    {
      title: "2. Set Ideal Customer Profile (ICP)",
      desc: "Describe what your business does and set target keywords. Our AI uses this context to automatically qualify leads and filter out noise.",
      icon: <Target className="w-8 h-8 text-lime" />,
    },
    {
      title: "3. Access Scored Buying Signals",
      desc: "Get instantly scored leads with custom reasoning breakdown and a draft outreach message generated specifically to address their pain points.",
      icon: <Search className="w-8 h-8 text-lime" />,
    }
  ];

  const current = steps[step - 1];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#171717]/85 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg glass-panel bg-carbon-card p-8 rounded-2xl relative flex flex-col min-h-[380px]"
      >
        {/* Skip button */}
        <button
          onClick={onSkip}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors duration-150 text-xs font-mono tracking-widest uppercase flex items-center gap-1.5"
        >
          Skip Onboarding
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Modal content steps */}
        <div className="flex-1 mt-6">
          <AnimatePresence mode="wait" custom={step}>
            <motion.div
              key={step}
              custom={step}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-6 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl glass-panel border-lime/30 bg-lime/5 flex items-center justify-center mb-2">
                {current.icon}
              </div>
              <h2 className="text-xl font-semibold text-white tracking-wide">
                {current.title}
              </h2>
              <p className="text-sm text-mutedText leading-relaxed max-w-sm">
                {current.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8 border-t border-white/5 pt-6">
          {/* Progress dots */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i ? "w-6 bg-lime" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={onPrev}
                className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white uppercase transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="px-5 py-2.5 rounded-lg bg-lime hover:bg-lime/90 text-carbon font-mono text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-transform duration-150 active:scale-95"
            >
              {step === 3 ? "Complete Setup" : "Next Step"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
