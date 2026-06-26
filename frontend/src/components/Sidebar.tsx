import React from 'react';
import { Star, Phone, ListFilter, Cpu, BarChart3, Kanban } from 'lucide-react';
import { FilterPanel } from './filters/FilterPanel';
import { FilterState, SortKey } from '../hooks/useFilters';
import { PriorityType, CategoryType } from '../types/lead';

interface SidebarProps {
  currentView: 'all' | 'saved' | 'contacted' | 'analytics' | 'pipeline';
  setView: (view: 'all' | 'saved' | 'contacted' | 'analytics' | 'pipeline') => void;
  totalLeads: number;
  savedCount: number;
  contactedCount: number;
  // Filters (from useFilters)
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
  availableSubreddits,
  togglePriority,
  toggleCategory,
  toggleSubreddit,
  setIntentRange,
  setConfidenceRange,
  hasActiveFilters,
  onResetFilters,
}: SidebarProps) {

  const views = [
    { id: 'all'       as const, label: 'All Leads',   count: totalLeads,    icon: <ListFilter className="w-4 h-4" /> },
    { id: 'pipeline'  as const, label: 'Pipeline',    count: totalLeads,    icon: <Kanban     className="w-4 h-4" /> },
    { id: 'saved'     as const, label: 'Saved',        count: savedCount,    icon: <Star      className="w-4 h-4" /> },
    { id: 'contacted' as const, label: 'Contacted',    count: contactedCount, icon: <Phone    className="w-4 h-4" /> },
    { id: 'analytics' as const, label: 'Analytics',    count: totalLeads,    icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="
      w-full md:w-[260px] md:flex-shrink-0
      flex flex-col h-full
      bg-carbon-card/40 border border-white/5
      md:border-t-0 md:border-b-0 md:border-l-0
      glass-panel md:rounded-none
      overflow-hidden
    ">
      {/* Scrollable inner */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 select-none">

        {/* Navigation Tabs */}
        <div className="space-y-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-mutedText/70 block mb-2 px-0.5">
            Navigation
          </span>
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-200
                ${currentView === v.id
                  ? 'bg-lime/10 border-lime/30 text-lime font-medium'
                  : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'}
              `}
            >
              <div className="flex items-center gap-2.5">
                {v.icon}
                <span className="text-xs tracking-wide">{v.label}</span>
              </div>
              <span className="font-mono text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">
                {v.count}
              </span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-lime/20 via-white/5 to-transparent" />

        {/* Filter Panel */}
        {currentView !== 'analytics' && (
          <FilterPanel
            filters={filters}
            availableSubreddits={availableSubreddits}
            togglePriority={togglePriority}
            toggleCategory={toggleCategory}
            toggleSubreddit={toggleSubreddit}
            setIntentRange={setIntentRange}
            setConfidenceRange={setConfidenceRange}
            hasActiveFilters={hasActiveFilters}
            onReset={onResetFilters}
          />
        )}
      </div>

      {/* Fixed bottom panel */}
      <div className="shrink-0 p-4 border-t border-white/5">
        <div className="glass-inset p-3 rounded-xl space-y-2 select-none">
          <div className="flex items-center gap-2 text-lime mb-0.5">
            <Cpu className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold">AI Engine</span>
          </div>
          <div className="space-y-1.5 font-mono text-[9px] text-gray-500">
            <div className="flex justify-between">
              <span>MODEL:</span>
              <span className="text-white/70">GROQ LLAMA 3</span>
            </div>
            <div className="flex justify-between">
              <span>SOURCES:</span>
              <span className="text-white/70">24 SUBREDDITS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
