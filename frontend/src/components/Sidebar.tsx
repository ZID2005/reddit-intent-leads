import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  PhoneCall, 
  ListFilter, 
  Cpu, 
  BarChart3, 
  Kanban, 
  Check 
} from 'lucide-react';
import { FilterState } from '../hooks/useFilters';
import { PriorityType, CategoryType } from '../types/lead';
import { glassStyle } from '../lib/glass';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: 'all' | 'saved' | 'contacted' | 'analytics' | 'pipeline';
  setView: (view: 'all' | 'saved' | 'contacted' | 'analytics' | 'pipeline') => void;
  totalLeads: number;
  savedCount: number;
  contactedCount: number;
  // Filters
  filters: FilterState;
  availableSubreddits: string[];
  togglePriority: (p: PriorityType) => void;
  toggleCategory: (c: CategoryType) => void;
  toggleSubreddit: (s: string) => void;
  setIntentRange: (r: [number, number]) => void;
  setConfidenceRange: (r: [number, number]) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function Sidebar({
  currentView,
  setView,
  totalLeads,
  savedCount,
  contactedCount,
  filters,
  togglePriority,
  toggleCategory,
  setIntentRange,
  availableSubreddits,
  toggleSubreddit,
}: SidebarProps) {

  const navItems = [
    { id: 'all' as const,       label: 'All Leads',  count: totalLeads,    icon: <ListFilter className="w-4 h-4" /> },
    { id: 'pipeline' as const,  label: 'Pipeline',   count: totalLeads,    icon: <Kanban className="w-4 h-4" /> },
    { id: 'saved' as const,     label: 'Saved',      count: savedCount,    icon: <Star className="w-4 h-4" /> },
    { id: 'contacted' as const, label: 'Contacted',  count: contactedCount, icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'analytics' as const, label: 'Analytics',  count: totalLeads,    icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Dynamic inline stylesheet to handle input range styling and hidden scrollbar */}
      <style>{`
        input[type=range].sidebar-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: #C6FF34;
          cursor: pointer;
          border: none;
          box-shadow: none;
        }
        input[type=range].sidebar-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: #C6FF34;
          cursor: pointer;
          border: none;
          box-shadow: none;
        }
        input[type=range].sidebar-slider {
          background: transparent;
        }
        .sidebar-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .sidebar-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div
        style={{
          ...glassStyle,
          background: 'rgba(7, 7, 8, 0.80)',
          borderLeft: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '0px',
          width: '180px',
        }}
        className="hidden md:flex flex-col h-full select-none relative overflow-hidden"
      >
        {/* Scrollable upper block */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scrollbar flex flex-col pb-4">
          
          {/* NAVIGATION SECTION */}
          <div className="font-mono text-[10px] text-white/45 tracking-widest px-4 pt-5 pb-2">
            NAVIGATION
          </div>

          <div className="space-y-1">
            {navItems.map(item => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className="w-[calc(100%-1rem)] flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-all duration-200 relative outline-none select-none border border-transparent bg-transparent group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-lime/10 border border-lime/20 rounded-xl z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  <span className={cn(
                    "z-10 relative flex items-center justify-center transition-colors duration-200",
                    isActive ? "text-[#C6FF34]" : "text-white/45 group-hover:text-white/70"
                  )}>
                    {item.icon}
                  </span>

                  <span className={cn(
                    "font-body text-sm z-10 relative transition-colors duration-200",
                    isActive ? "text-[#C6FF34] font-medium" : "text-white/45 group-hover:text-white/70"
                  )}>
                    {item.label}
                  </span>

                  <span className={cn(
                    "font-mono text-[10px] rounded-full px-2 py-0.5 z-10 relative ml-auto transition-colors duration-200 border",
                    isActive 
                      ? "bg-lime/15 border-lime/25 text-[#C6FF34]/80" 
                      : "bg-white/5 border-white/8 text-white/35"
                  )}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="mx-4 my-3 h-px bg-white/[0.05]" />

          {/* FILTERS SECTION (Hidden on Analytics page) */}
          {currentView !== 'analytics' && (
            <div className="flex flex-col">
              <div className="font-mono text-[10px] text-white/45 tracking-widest px-4 pb-2">
                FILTERS
              </div>

              {/* PRIORITY subsection */}
              <div className="mb-4">
                <div className="font-mono text-[10px] text-white/35 tracking-widest px-4 pb-1">
                  PRIORITY
                </div>
                <div className="space-y-0.5">
                  {(['high', 'medium', 'low'] as const).map(p => {
                    const labelMap = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };
                    const colorMap = { high: 'bg-[#C6FF34]', medium: 'bg-amber-400', low: 'bg-white/25' };
                    const checked = filters.priorities.has(p);
                    return (
                      <div
                        key={p}
                        onClick={() => togglePriority(p)}
                        className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-white/[0.03] rounded-lg cursor-pointer select-none group transition-colors"
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors duration-150",
                          checked ? "bg-[#C6FF34] border-[#C6FF34]" : "border-white/15 group-hover:border-white/30"
                        )}>
                          <AnimatePresence>
                            {checked && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              >
                                <Check className="w-2 h-2 text-black stroke-[3.5px]" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", colorMap[p])} />
                        <span className="font-body text-xs text-white/45 transition-colors group-hover:text-white/70">
                          {labelMap[p]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CATEGORY subsection */}
              <div className="mb-4">
                <div className="font-mono text-[10px] text-white/35 tracking-widest px-4 pb-1">
                  CATEGORY
                </div>
                <div className="space-y-0.5">
                  {([
                    { id: 'buying_intent', label: 'Buying Intent', color: 'bg-[#C6FF34]' },
                    { id: 'pain_point',    label: 'Pain Point',    color: 'bg-amber-400' },
                    { id: 'comparison',    label: 'Comparison',    color: 'bg-blue-400' },
                    { id: 'research',      label: 'Research',      color: 'bg-purple-400' },
                    { id: 'uncategorized',  label: 'Uncategorized',  color: 'bg-white/20' }
                  ] as const).map(c => {
                    const checked = filters.categories.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCategory(c.id)}
                        className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-white/[0.03] rounded-lg cursor-pointer select-none group transition-colors"
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors duration-150",
                          checked ? "bg-[#C6FF34] border-[#C6FF34]" : "border-white/15 group-hover:border-white/30"
                        )}>
                          <AnimatePresence>
                            {checked && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              >
                                <Check className="w-2 h-2 text-black stroke-[3.5px]" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.color)} />
                        <span className="font-body text-xs text-white/45 transition-colors group-hover:text-white/70">
                          {c.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* INTENT SCORE subsection */}
              <div className="mb-2 space-y-2">
                <div className="font-mono text-[10px] text-white/35 tracking-widest px-4">
                  INTENT SCORE
                </div>

                {/* Slider Component */}
                <div className="relative px-4 h-5 flex items-center">
                  <div className="w-full h-1 bg-white/10 rounded-full relative">
                    <div
                      className="absolute h-1 bg-[#C6FF34]/50 rounded-full"
                      style={{
                        left: `${filters.intentRange[0]}%`,
                        right: `${100 - filters.intentRange[1]}%`,
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={filters.intentRange[0]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setIntentRange([Math.min(v, filters.intentRange[1] - 1), filters.intentRange[1]]);
                    }}
                    className="sidebar-slider absolute left-4 right-4 appearance-none pointer-events-none cursor-pointer"
                    style={{ 
                      zIndex: filters.intentRange[0] > 90 ? 5 : 3,
                      WebkitAppearance: 'none',
                      pointerEvents: 'auto'
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={filters.intentRange[1]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setIntentRange([filters.intentRange[0], Math.max(v, filters.intentRange[0] + 1)]);
                    }}
                    className="sidebar-slider absolute left-4 right-4 appearance-none pointer-events-none cursor-pointer"
                    style={{ 
                      zIndex: 4,
                      WebkitAppearance: 'none',
                      pointerEvents: 'auto'
                    }}
                  />
                </div>

                {/* Range Display */}
                <div className="flex justify-between px-4 font-mono text-[10px] text-[#C6FF34]/60">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>

              {/* SUBREDDIT subsection */}
              {availableSubreddits && availableSubreddits.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between px-4 pb-1">
                    <span className="font-mono text-[10px] text-white/35 tracking-widest">
                      SUBREDDIT
                    </span>
                    {filters.subreddits.size > 0 && (
                      <button
                        onClick={() => filters.subreddits.forEach(s => toggleSubreddit(s))}
                        className="text-[9px] font-mono text-gray-500 hover:text-[#C6FF34] transition-colors cursor-pointer outline-none bg-transparent border-none"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5 max-h-36 overflow-y-auto sidebar-scrollbar pr-1">
                    {availableSubreddits.map(sub => {
                      const checked = filters.subreddits.has(sub);
                      return (
                        <div
                          key={sub}
                          onClick={() => toggleSubreddit(sub)}
                          className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-white/[0.03] rounded-lg cursor-pointer select-none group transition-colors"
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors duration-150",
                            checked ? "bg-[#C6FF34] border-[#C6FF34]" : "border-white/15 group-hover:border-white/30"
                        )}>
                          <AnimatePresence>
                            {checked && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              >
                                <Check className="w-2 h-2 text-black stroke-[3.5px]" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <span className="font-body text-xs text-white/45 transition-colors group-hover:text-white/70">
                          r/{sub}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            </div>
          )}

        </div>

        {/* AI ENGINE panel */}
        <div className="shrink-0 pt-2 pb-4 px-3 select-none">
          <motion.div
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-xl p-3 bg-black/40 border border-white/[0.06]"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] text-[#C6FF34]/50 tracking-widest">AI ENGINE</span>
              <Cpu className="w-3 h-3 text-[#C6FF34]/40 ml-auto" />
            </div>
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-white/25">Model</span>
                <span className="text-white/50">GROQ LLAMA 3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/25">Sources</span>
                <span className="text-white/50">24 SUBREDDITS</span>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </>
  );
}

export default Sidebar;
