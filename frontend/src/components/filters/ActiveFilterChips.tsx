import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ActiveChip } from '../../hooks/useFilters';

interface ActiveFilterChipsProps {
  chips: ActiveChip[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({ chips, onRemove, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap items-center gap-2"
    >
      <AnimatePresence mode="popLayout">
        {chips.map(chip => (
          <motion.span
            key={chip.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="
              flex items-center gap-1.5
              px-2.5 py-1 rounded-full
              text-[10px] font-mono font-medium tracking-wide
              bg-lime/8 border border-lime/20 text-lime/90
              select-none
            "
          >
            {chip.label}
            <button
              onClick={() => onRemove(chip.id)}
              className="text-lime/60 hover:text-lime transition-colors rounded-full"
              aria-label={`Remove filter ${chip.label}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </motion.span>
        ))}

        {chips.length > 1 && (
          <motion.button
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClearAll}
            className="
              text-[10px] font-mono text-gray-500 hover:text-white
              underline underline-offset-2 decoration-dotted
              transition-colors duration-150
            "
          >
            Clear all
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ActiveFilterChips;
