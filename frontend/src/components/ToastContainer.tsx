import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast, ToastType } from '../hooks/useToast';
import { X, Flame } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none md:max-w-md">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="pointer-events-auto relative w-full glass-panel border-l-2 border-l-lime bg-carbon-card/90 overflow-hidden flex flex-col"
    >
      <div className="flex gap-4 p-4 items-start">
        <div className="flex-shrink-0 p-1.5 glass-panel rounded-lg border-lime/20 text-lime bg-lime/10">
          <Flame className="w-5 h-5 fill-current" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-white tracking-wide">
              New High Intent Signal
            </span>
            <span className="font-mono text-xs text-lime bg-lime/10 border border-lime/30 px-1.5 py-0.5 rounded">
              {toast.score}
            </span>
          </div>
          <p className="text-sm text-gray-200 line-clamp-1 mb-1 font-sans">
            {toast.title}
          </p>
          <div className="font-mono text-[10px] text-lime/80 uppercase tracking-widest">
            r/{toast.subreddit}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-150"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Shrinking progress bar */}
      <div className="h-0.5 w-full bg-white/5 mt-auto">
        <div
          className="h-full bg-lime transition-all ease-linear"
          style={{ width: `${progress}%`, transitionDuration: '30ms' }}
        />
      </div>
    </motion.div>
  );
}
