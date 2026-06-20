import React from 'react';
import { motion } from 'framer-motion';

export type TimeFilterType = 'today' | '7days' | '30days' | 'all';

interface AnalyticsFiltersProps {
  value: TimeFilterType;
  onChange: (filter: TimeFilterType) => void;
}

export function AnalyticsFilters({ value, onChange }: AnalyticsFiltersProps) {
  const options: { id: TimeFilterType; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7days', label: 'Last 7 Days' },
    { id: '30days', label: 'Last 30 Days' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-carbon-card/50 border border-white/5 rounded-xl glass-panel self-start select-none">
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`
              relative px-4 py-2 text-xs font-medium tracking-wide rounded-lg transition-colors duration-200 cursor-pointer
              ${isActive ? 'text-carbon-dark font-semibold' : 'text-gray-400 hover:text-white'}
            `}
          >
            {/* Active sliding background */}
            {isActive && (
              <motion.div
                layoutId="activeTimeTab"
                className="absolute inset-0 bg-lime rounded-lg z-0"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            
            {/* Label */}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
