import React from 'react';
import { PriorityType, CategoryType } from '../types/lead';
import { Filter, Star, Phone, ListFilter, Cpu } from 'lucide-react';

interface SidebarProps {
  currentView: 'all' | 'saved' | 'contacted';
  setView: (view: 'all' | 'saved' | 'contacted') => void;
  selectedPriorities: Set<PriorityType>;
  togglePriority: (priority: PriorityType) => void;
  selectedCategories: Set<CategoryType>;
  toggleCategory: (category: CategoryType) => void;
  totalLeads: number;
  savedCount: number;
  contactedCount: number;
}

export function Sidebar({
  currentView,
  setView,
  selectedPriorities,
  togglePriority,
  selectedCategories,
  toggleCategory,
  totalLeads,
  savedCount,
  contactedCount,
}: SidebarProps) {

  const views = [
    { id: 'all' as const, label: 'All Leads', count: totalLeads, icon: <ListFilter className="w-4 h-4" /> },
    { id: 'saved' as const, label: 'Saved Leads', count: savedCount, icon: <Star className="w-4 h-4" /> },
    { id: 'contacted' as const, label: 'Contacted', count: contactedCount, icon: <Phone className="w-4 h-4" /> }
  ];

  const categoriesList: { id: CategoryType; label: string }[] = [
    { id: 'buying_intent', label: 'Buying Intent' },
    { id: 'pain_point', label: 'Pain Point' },
    { id: 'comparison', label: 'Comparison' },
    { id: 'research', label: 'Research' }
  ];

  const prioritiesList: { id: PriorityType; label: string }[] = [
    { id: 'high', label: 'High Priority' },
    { id: 'medium', label: 'Medium Priority' },
    { id: 'low', label: 'Low Priority' }
  ];

  return (
    <div className="w-full md:w-[260px] md:flex-shrink-0 flex flex-col justify-between h-full bg-carbon-card/40 border border-white/5 md:border-t-0 md:border-b-0 md:border-l-0 p-6 space-y-8 select-none z-10 glass-panel md:rounded-none">
      
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-mutedText block mb-2 px-1">
            Navigation
          </span>
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-200 ${
                currentView === v.id
                  ? 'bg-lime/10 border-lime/30 text-lime font-medium'
                  : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
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

        {/* Lime Divider */}
        <div className="h-px bg-gradient-to-r from-lime/20 via-white/5 to-transparent" />

        {/* Filters Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-mutedText px-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-widest">
              Priority Filter
            </span>
          </div>

          <div className="space-y-3 pl-1">
            {prioritiesList.map((p) => {
              const checked = selectedPriorities.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => togglePriority(p.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${
                      checked
                        ? 'border-lime bg-lime/10 text-carbon'
                        : 'border-white/20 bg-transparent group-hover:border-white/40'
                    }`}
                  >
                    {checked && (
                      <div className="w-2 h-2 rounded bg-lime" />
                    )}
                  </div>
                  <span className={`text-xs font-sans transition-colors duration-150 ${
                    checked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                  }`}>
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lime Divider */}
        <div className="h-px bg-gradient-to-r from-lime/20 via-white/5 to-transparent" />

        {/* Category Filters Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-mutedText px-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-widest">
              Category Filter
            </span>
          </div>

          <div className="space-y-3 pl-1">
            {categoriesList.map((c) => {
              const checked = selectedCategories.has(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleCategory(c.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${
                      checked
                        ? 'border-lime bg-lime/10 text-carbon'
                        : 'border-white/20 bg-transparent group-hover:border-white/40'
                    }`}
                  >
                    {checked && (
                      <div className="w-2 h-2 rounded bg-lime" />
                    )}
                  </div>
                  <span className={`text-xs font-sans transition-colors duration-150 ${
                    checked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                  }`}>
                    {c.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Signal Engine Stats Panel at Bottom */}
      <div className="glass-inset p-4 rounded-xl space-y-3 select-none">
        <div className="flex items-center gap-2 text-lime mb-1">
          <Cpu className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
            AI Signal Engine
          </span>
        </div>
        <div className="space-y-2 font-mono text-[10px] text-gray-400">
          <div className="flex justify-between">
            <span>MODEL:</span>
            <span className="text-white">GROQ LLAMA 3</span>
          </div>
          <div className="flex justify-between">
            <span>PROCESSED TODAY:</span>
            <span className="text-white">1,248</span>
          </div>
          <div className="flex justify-between">
            <span>AVG CONFIDENCE:</span>
            <span className="text-white">91%</span>
          </div>
        </div>
      </div>

    </div>
  );
}
export default Sidebar;
