import React from 'react';
import { motion } from 'framer-motion';

export type TimeFilterType = 'today' | '7days' | '30days' | 'all';

interface AnalyticsFiltersProps {
  value: TimeFilterType;
  onChange: (filter: TimeFilterType) => void;
}

export function AnalyticsFilters({ value, onChange }: AnalyticsFiltersProps) {
  const options: { id: TimeFilterType; label: string }[] = [
    { id: 'today',   label: 'Today'       },
    { id: '7days',   label: 'Last 7 Days' },
    { id: '30days',  label: 'Last 30 Days'},
    { id: 'all',     label: 'All Time'    },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl sm:rounded-full p-1 flex flex-wrap sm:inline-flex gap-1 justify-center sm:justify-start select-none w-full sm:w-auto">
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="relative cursor-pointer outline-none border-none bg-transparent p-0 flex-1 sm:flex-initial text-center"
          >
            {isActive && (
              <motion.div
                layoutId="analytics-time-filter"
                className="absolute inset-0 z-0 bg-[#C6FF34] rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 font-mono text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 block rounded-full transition-colors text-center ${
                isActive
                  ? 'text-black font-semibold'
                  : 'text-white/40 hover:text-white/65'
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
