import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderSearch, 
  Zap, 
  AlertCircle, 
  Info, 
  Star, 
  PhoneCall, 
  Target, 
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Lead } from '../../types/lead';

interface AnalyticsCardsProps {
  leads: Lead[];
}

export function AnalyticsCards({ leads }: AnalyticsCardsProps) {
  const totalLeads = leads.length;
  
  const highPriority = leads.filter(l => l.priority === 'high').length;
  const mediumPriority = leads.filter(l => l.priority === 'medium').length;
  const lowPriority = leads.filter(l => l.priority === 'low').length;
  
  const savedLeads = leads.filter(l => l.status === 'saved').length;
  const contactedLeads = leads.filter(l => l.status === 'contacted').length;
  
  const leadsWithIntent = leads.filter(l => l.intent_score !== null && l.intent_score !== undefined && l.intent_score > 0);
  const avgIntent = leadsWithIntent.length > 0 
    ? Math.round(leadsWithIntent.reduce((sum, l) => sum + l.intent_score, 0) / leadsWithIntent.length) 
    : 0;
    
  const leadsCollectedToday = leads.filter(l => {
    const dateVal = l.created_at || l.processed_at;
    if (!dateVal) return false;
    const leadDate = new Date(dateVal);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return leadDate >= startOfToday;
  }).length;

  const cardData = [
    {
      title: 'Total Leads',
      value: totalLeads,
      icon: <FolderSearch className="w-4 h-4 text-lime" />,
      color: 'lime',
      glowColor: 'rgba(198, 255, 52, 0.15)',
    },
    {
      title: 'High Priority',
      value: highPriority,
      icon: <Zap className="w-4 h-4 text-red-500" />,
      color: 'red',
      glowColor: 'rgba(239, 68, 68, 0.15)',
    },
    {
      title: 'Medium Priority',
      value: mediumPriority,
      icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
      color: 'amber',
      glowColor: 'rgba(245, 158, 11, 0.15)',
    },
    {
      title: 'Low Priority',
      value: lowPriority,
      icon: <Info className="w-4 h-4 text-gray-400" />,
      color: 'gray',
      glowColor: 'rgba(156, 163, 175, 0.1)',
    },
    {
      title: 'Saved Leads',
      value: savedLeads,
      icon: <Star className="w-4 h-4 text-yellow-400 fill-yellow-400/10" />,
      color: 'yellow',
      glowColor: 'rgba(250, 204, 21, 0.15)',
    },
    {
      title: 'Contacted Leads',
      value: contactedLeads,
      icon: <PhoneCall className="w-4 h-4 text-cyan-400" />,
      color: 'cyan',
      glowColor: 'rgba(34, 211, 238, 0.15)',
    },
    {
      title: 'Avg Intent Score',
      value: avgIntent,
      isPercentage: true,
      icon: <Target className="w-4 h-4 text-lime" />,
      color: 'lime',
      glowColor: 'rgba(198, 255, 52, 0.15)',
      radial: true,
    },
    {
      title: 'Collected Today',
      value: leadsCollectedToday,
      icon: <Calendar className="w-4 h-4 text-emerald-400" />,
      color: 'emerald',
      glowColor: 'rgba(52, 211, 153, 0.15)',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full select-none">
      {cardData.map((card, idx) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.04 }}
          whileHover={{ y: -2, boxShadow: `0 8px 24px ${card.glowColor}` }}
          className="glass-panel p-4 md:p-5 rounded-2xl flex items-center justify-between min-h-[105px] border border-white/5 relative overflow-hidden group"
        >
          {/* Accent colored top highlight line */}
          <div className={`absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300 opacity-60 group-hover:opacity-100 ${
            card.color === 'lime' ? 'bg-lime' :
            card.color === 'red' ? 'bg-red-500' :
            card.color === 'amber' ? 'bg-amber-500' :
            card.color === 'yellow' ? 'bg-yellow-400' :
            card.color === 'cyan' ? 'bg-cyan-400' :
            card.color === 'emerald' ? 'bg-emerald-400' : 'bg-white/10'
          }`} />

          <div className="flex flex-col justify-between h-full space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-mutedText/80">
              {card.title}
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-white">
                <CountUp target={card.value} />
              </span>
              {card.isPercentage && (
                <span className={`text-xs font-mono font-medium ml-0.5 ${
                  card.color === 'lime' ? 'text-lime' : 'text-emerald-400'
                }`}>%</span>
              )}
            </div>
          </div>

          {card.radial ? (
            <div className="relative w-11 h-11 flex-shrink-0 ml-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/5"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  className={card.color === 'lime' ? 'text-lime' : 'text-emerald-400'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: `${card.value}, 100` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.05 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-white/60">
                {card.value}%
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 group-hover:bg-white/[0.04] transition-colors duration-200">
              {card.icon}
            </div>
          )}
        </motion.div>
      ))}
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

    const duration = 500; // ms
    const stepTime = Math.max(Math.floor(duration / Math.max(end, 1)), 10);
    
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 6);
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
