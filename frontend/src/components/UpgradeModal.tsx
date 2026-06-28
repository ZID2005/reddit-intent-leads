import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Loader2, CheckCircle, ShieldAlert, Crown } from 'lucide-react';
import { cn } from '../lib/utils';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: 'free' | 'pro';
  currentPlan: string;
  onConfirm: () => Promise<void>;
}

const BENEFITS = [
  'Unlimited AI outreach generations',
  'Unlimited lead history & exports',
  'Full analytics & sentiment insights',
  'Real-time browser notifications',
  'Pipeline management & custom stages',
  'Priority feature updates & support',
  'REST API access',
];

export function UpgradeModal({
  isOpen,
  onClose,
  targetPlan,
  currentPlan,
  onConfirm,
}: UpgradeModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // ESC key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, submitting, onClose]);

  // Auto-close countdown after success
  useEffect(() => {
    if (!success) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setSuccess(false);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 833); // ~2.5s total
    return () => clearInterval(interval);
  }, [success, onClose]);

  const handleUpgrade = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      await onConfirm();
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Transaction failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isUpgrading = targetPlan === 'pro';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={submitting ? undefined : onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal — bottom sheet on mobile, centered card on desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="relative w-full sm:max-w-lg overflow-hidden sm:rounded-3xl rounded-t-3xl border border-white/10 z-10 select-none"
            style={{
              background: 'linear-gradient(135deg, rgba(18,18,20,0.97) 0%, rgba(8,8,10,0.99) 100%)',
              backdropFilter: 'blur(40px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Top lime glow line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-lime to-transparent opacity-70" />

            {/* Close */}
            {!submitting && !success && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer outline-none z-10"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="p-8">
              <AnimatePresence mode="wait">
                {success ? (
                  /* ── Success State ── */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="py-10 flex flex-col items-center justify-center text-center space-y-5"
                  >
                    <motion.div
                      animate={{ scale: [0.8, 1.15, 1], rotate: [0, 8, 0] }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-lime/20 blur-2xl rounded-full scale-150" />
                      <CheckCircle className="relative w-20 h-20 text-lime" />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold font-display text-white tracking-tight">Pro Activated</h3>
                      <p className="text-sm text-gray-400 font-sans">
                        Welcome to <span className="text-lime font-semibold">SignalRadar Pro</span>. All limits are lifted.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                      Closing in {countdown}s
                    </div>
                  </motion.div>
                ) : (
                  /* ── Main Upgrade View ── */
                  <motion.div
                    key="main"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="p-2.5 rounded-2xl bg-lime/10 border border-lime/25 shrink-0"
                      >
                        <Zap className="w-5 h-5 text-lime fill-lime/20" />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold font-display text-white tracking-tight">
                          {isUpgrading ? 'Upgrade to Pro' : 'Confirm Plan Change'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {isUpgrading
                            ? 'Unlock the full SignalRadar experience.'
                            : 'Are you sure you want to change your plan?'}
                        </p>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                      <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest font-bold block">
                        Pro Tier Benefits
                      </span>
                      <ul className="space-y-2.5">
                        {BENEFITS.map(b => (
                          <li key={b} className="flex items-start gap-2.5 text-xs text-gray-300">
                            <div className="mt-0.5 w-3.5 h-3.5 rounded-full bg-lime/10 border border-lime/20 flex items-center justify-center shrink-0">
                              <Check className="w-2 h-2 text-lime" />
                            </div>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pricing row */}
                    <div className="flex items-center justify-between py-4 border-t border-b border-white/[0.06] font-mono">
                      <div>
                        <div className="text-xs text-gray-500">SignalRadar Pro (Monthly)</div>
                        <div className="text-[10px] text-gray-700 mt-0.5">Billed monthly · Cancel anytime</div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-lime">₹699</span>
                        <span className="text-xs text-gray-500 ml-1">/mo</span>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 py-3 px-4 rounded-xl border border-white/[0.08] hover:bg-white/5 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer outline-none disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <motion.button
                        whileHover={{ boxShadow: '0 0 24px rgba(198,255,52,0.3)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleUpgrade}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-lime hover:brightness-110 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer outline-none disabled:opacity-60"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Processing…
                          </>
                        ) : (
                          <>
                            <Crown className="w-3.5 h-3.5" />
                            Continue to Payment
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
