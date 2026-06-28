import React from 'react';
import { motion } from 'framer-motion';

export type TimeFilterType = 'today' | '7days' | '30days' | 'all';

const NOHEMI = "'Nohemi', sans-serif";
const LIME = '#C6FF34';

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
    <div
      className="flex items-center gap-1 p-1 select-none self-start"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 12,
      }}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="relative cursor-pointer outline-none"
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontFamily: NOHEMI,
              fontSize: 11,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? '#0a0a0a' : 'rgba(255,255,255,0.45)',
              transition: 'color 0.2s',
              letterSpacing: '0.02em',
              border: 'none',
              background: 'transparent',
            }}
          >
            {/* Sliding active background */}
            {isActive && (
              <motion.div
                layoutId="activeTimeTab"
                className="absolute inset-0 z-0"
                style={{ background: LIME, borderRadius: 8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {/* Hover shimmer for inactive */}
            {!isActive && (
              <motion.div
                className="absolute inset-0 z-0 opacity-0 hover:opacity-100 transition-opacity duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
