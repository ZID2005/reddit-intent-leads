import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lead } from '../types/lead';

interface StatBarProps {
  leads: Lead[];
}

export function StatBar({ leads }: StatBarProps) {
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.priority === 'high').length;
  
  const avgScore = totalLeads > 0 
    ? Math.round(leads.reduce((acc, curr) => acc + curr.intent_score, 0) / totalLeads) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full select-none">
      {/* Total Leads Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="glass-panel p-6 flex flex-col justify-between min-h-[110px]"
      >
        <span className="text-xs font-mono uppercase tracking-widest text-mutedText">
          Signals Today
        </span>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-bold font-mono tracking-tight text-white">
            <CountUp target={totalLeads} />
          </span>
          <div className="h-1 w-8 bg-lime rounded-full ml-1" />
        </div>
      </motion.div>

      {/* Hot Leads Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="glass-panel p-6 flex flex-col justify-between min-h-[110px] relative overflow-hidden"
      >
        {/* Pulsing radar ping */}
        <div className="absolute top-6 right-6">
          <div className="pulse-dot" />
        </div>

        <span className="text-xs font-mono uppercase tracking-widest text-mutedText">
          Hot Leads
        </span>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-bold font-mono tracking-tight text-white">
            <CountUp target={hotLeads} />
          </span>
          <div className="h-1 w-8 bg-lime rounded-full ml-1" />
        </div>
      </motion.div>

      {/* Average Intent Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className="glass-panel p-6 flex items-center justify-between min-h-[110px]"
      >
        <div className="flex flex-col justify-between h-full">
          <span className="text-xs font-mono uppercase tracking-widest text-mutedText">
            Average Intent
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-white">
              <CountUp target={avgScore} />
              <span className="text-sm text-lime font-mono font-medium ml-0.5">%</span>
            </span>
            <div className="h-1 w-8 bg-lime rounded-full ml-1" />
          </div>
        </div>

        {/* Circular Progress Arc */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-white/5"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              className="text-lime"
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${avgScore}, 100` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-lime/90 font-bold">
            {avgScore}%
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CountUp({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) {
      setCount(end);
      return;
    }

    const duration = 600; // ms
    const stepTime = Math.max(Math.floor(duration / Math.max(end, 1)), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 5);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target]);

  return <>{count}</>;
}
export default StatBar;
