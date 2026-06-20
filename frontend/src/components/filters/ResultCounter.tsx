import React from 'react';
import { motion } from 'framer-motion';

interface ResultCounterProps {
  filtered: number;
  total: number;
  loading?: boolean;
}

export function ResultCounter({ filtered, total, loading }: ResultCounterProps) {
  if (loading) {
    return (
      <div className="h-4 w-32 shimmer rounded" />
    );
  }

  const allShowing = filtered === total;

  return (
    <motion.p
      key={`${filtered}-${total}`}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="text-[11px] font-mono text-mutedText shrink-0"
    >
      {allShowing ? (
        <>
          <span className="text-white font-medium">{total}</span>
          <span> leads</span>
        </>
      ) : (
        <>
          Showing{' '}
          <span className="text-lime font-medium">{filtered}</span>
          {' '}of{' '}
          <span className="text-white font-medium">{total}</span>
          {' '}leads
        </>
      )}
    </motion.p>
  );
}

export default ResultCounter;
