import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowUpDown } from 'lucide-react';
import { SortKey } from '../../hooks/useFilters';
import { cn } from '../../lib/utils';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'intent_desc',    label: 'Highest Intent Score' },
  { key: 'confidence_desc', label: 'Highest Confidence' },
  { key: 'newest',         label: 'Newest First' },
  { key: 'oldest',         label: 'Oldest First' },
];

interface SortDropdownProps {
  value: SortKey;
  onChange: (k: SortKey) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find(o => o.key === value)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono tracking-wide transition-all duration-150',
          open
            ? 'bg-lime/10 border-lime/30 text-lime'
            : 'glass-panel border-white/8 text-gray-400 hover:border-white/20 hover:text-white'
        )}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">Sort</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-52 glass-panel border-white/10 rounded-xl overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
            >
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { onChange(opt.key); setOpen(false); }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-xs font-mono transition-colors duration-100',
                    value === opt.key
                      ? 'text-lime bg-lime/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/4'
                  )}
                >
                  {value === opt.key && <span className="text-lime mr-1.5">✓</span>}
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SortDropdown;
