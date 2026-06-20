import React, { useCallback } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { PriorityType, CategoryType } from '../../types/lead';
import { FilterState, SortKey } from '../../hooks/useFilters';
import { cn } from '../../lib/utils';

interface FilterPanelProps {
  filters: FilterState;
  availableSubreddits: string[];
  togglePriority: (p: PriorityType) => void;
  toggleCategory: (c: CategoryType) => void;
  toggleSubreddit: (s: string) => void;
  setIntentRange: (r: [number, number]) => void;
  setConfidenceRange: (r: [number, number]) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}

// ─── Range Slider ──────────────────────────────────────────────────────────────
interface RangeSliderProps {
  label: string;
  value: [number, number];
  onChange: (r: [number, number]) => void;
  accentColor?: string;
}

function RangeSlider({ label, value, onChange, accentColor = '#C6FF34' }: RangeSliderProps) {
  const [min, max] = value;
  const pctMin = min;
  const pctMax = max;

  const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange([Math.min(v, max - 1), max]);
  };

  const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange([min, Math.max(v, min + 1)]);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono uppercase tracking-widest text-mutedText">{label}</span>
        <span className="text-[10px] font-mono text-white/70 tabular-nums">
          {min}–{max}
          {label.toLowerCase().includes('conf') ? '%' : ''}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-5 flex items-center">
        {/* Background rail */}
        <div className="absolute w-full h-1 bg-white/8 rounded-full" />

        {/* Active range fill */}
        <div
          className="absolute h-1 rounded-full"
          style={{
            left: `${pctMin}%`,
            right: `${100 - pctMax}%`,
            backgroundColor: accentColor,
            opacity: 0.6,
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={0}
          max={100}
          value={min}
          onChange={handleMin}
          className="range-thumb absolute w-full appearance-none bg-transparent cursor-pointer"
          style={{ zIndex: min > 90 ? 5 : 3 }}
        />

        {/* Max thumb */}
        <input
          type="range"
          min={0}
          max={100}
          value={max}
          onChange={handleMax}
          className="range-thumb absolute w-full appearance-none bg-transparent cursor-pointer"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}

// ─── Checkbox Row ──────────────────────────────────────────────────────────────
function CheckRow({ label, checked, onToggle, dot }: { label: string; checked: boolean; onToggle: () => void; dot?: string }) {
  return (
    <div onClick={onToggle} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
      <div className={cn(
        'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150',
        checked ? 'border-lime bg-lime/15' : 'border-white/20 group-hover:border-white/40'
      )}>
        {checked && <div className="w-1.5 h-1.5 rounded-sm bg-lime" />}
      </div>
      {dot && (
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
      )}
      <span className={cn(
        'text-xs font-sans transition-colors duration-100',
        checked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
      )}>
        {label}
      </span>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <span className="text-[9px] font-mono uppercase tracking-widest text-mutedText/70 block mb-2.5 px-0.5">
      {title}
    </span>
  );
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-lime/15 via-white/4 to-transparent my-1" />;
}

// ─── Main FilterPanel ──────────────────────────────────────────────────────────

export function FilterPanel({
  filters,
  availableSubreddits,
  togglePriority,
  toggleCategory,
  toggleSubreddit,
  setIntentRange,
  setConfidenceRange,
  hasActiveFilters,
  onReset,
}: FilterPanelProps) {

  const PRIORITIES: { id: PriorityType; label: string; dot: string }[] = [
    { id: 'high',   label: 'High Priority',   dot: '#C6FF34' },
    { id: 'medium', label: 'Medium Priority', dot: '#FFB347' },
    { id: 'low',    label: 'Low Priority',    dot: '#555555' },
  ];

  const CATEGORIES: { id: CategoryType; label: string }[] = [
    { id: 'buying_intent', label: 'Buying Intent' },
    { id: 'pain_point',    label: 'Pain Point' },
    { id: 'comparison',    label: 'Comparison' },
    { id: 'research',      label: 'Research' },
    { id: 'uncategorized',  label: 'Uncategorized' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-mutedText">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono uppercase tracking-widest">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-lime transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        )}
      </div>

      <Divider />

      {/* Priority */}
      <div>
        <SectionHeader title="Priority" />
        <div className="space-y-1">
          {PRIORITIES.map(p => (
            <CheckRow
              key={p.id}
              label={p.label}
              checked={filters.priorities.has(p.id)}
              onToggle={() => togglePriority(p.id)}
              dot={p.dot}
            />
          ))}
        </div>
      </div>

      <Divider />

      {/* Category */}
      <div>
        <SectionHeader title="Category" />
        <div className="space-y-1">
          {CATEGORIES.map(c => (
            <CheckRow
              key={c.id}
              label={c.label}
              checked={filters.categories.has(c.id)}
              onToggle={() => toggleCategory(c.id)}
            />
          ))}
        </div>
      </div>

      <Divider />

      {/* Intent Score Slider */}
      <div>
        <RangeSlider
          label="Intent Score"
          value={filters.intentRange}
          onChange={setIntentRange}
        />
      </div>

      <Divider />

      {/* Confidence Slider */}
      <div>
        <RangeSlider
          label="Confidence"
          value={filters.confidenceRange}
          onChange={setConfidenceRange}
          accentColor="#FFB347"
        />
      </div>

      {/* Subreddits */}
      {availableSubreddits.length > 0 && (
        <>
          <Divider />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <SectionHeader title="Subreddit" />
              {filters.subreddits.size > 0 && (
                <button
                  onClick={() => filters.subreddits.forEach(s => toggleSubreddit(s))}
                  className="text-[9px] font-mono text-gray-500 hover:text-lime transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {availableSubreddits.map(sub => (
                <CheckRow
                  key={sub}
                  label={`r/${sub}`}
                  checked={filters.subreddits.has(sub)}
                  onToggle={() => toggleSubreddit(sub)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FilterPanel;
