import { useState, useMemo, useCallback, useEffect } from 'react';
import { Lead, PriorityType, CategoryType } from '../types/lead';

export type SortKey = 'intent_desc' | 'confidence_desc' | 'newest' | 'oldest';

export interface FilterState {
  searchQuery: string;
  priorities: Set<PriorityType>;
  categories: Set<CategoryType>;
  subreddits: Set<string>;
  intentRange: [number, number];
  confidenceRange: [number, number];
  sortKey: SortKey;
}

const ALL_PRIORITIES: PriorityType[] = ['high', 'medium', 'low'];
const ALL_CATEGORIES: CategoryType[] = ['buying_intent', 'comparison', 'pain_point', 'research', 'uncategorized'];

const DEFAULT_STATE: FilterState = {
  searchQuery: '',
  priorities: new Set(ALL_PRIORITIES),
  categories: new Set(ALL_CATEGORIES),
  subreddits: new Set<string>(),
  intentRange: [0, 100],
  confidenceRange: [0, 100],
  sortKey: 'intent_desc',
};

function isDefault(fs: FilterState): boolean {
  return (
    fs.searchQuery === '' &&
    fs.priorities.size === 3 &&
    fs.categories.size === 5 &&
    fs.subreddits.size === 0 &&
    fs.intentRange[0] === 0 &&
    fs.intentRange[1] === 100 &&
    fs.confidenceRange[0] === 0 &&
    fs.confidenceRange[1] === 100 &&
    fs.sortKey === 'intent_desc'
  );
}

export interface UseFiltersReturn {
  // Raw state
  filters: FilterState;

  // Setters
  setSearchQuery: (q: string) => void;
  togglePriority: (p: PriorityType) => void;
  toggleCategory: (c: CategoryType) => void;
  toggleSubreddit: (s: string) => void;
  setIntentRange: (r: [number, number]) => void;
  setConfidenceRange: (r: [number, number]) => void;
  setSortKey: (k: SortKey) => void;
  resetFilters: () => void;

  // Derived
  availableSubreddits: string[];
  filteredLeads: Lead[];
  totalCount: number;        // total unfiltered
  filteredCount: number;     // after all filters
  hasActiveFilters: boolean;
  activeChips: ActiveChip[];
  removeChip: (chipId: string) => void;
}

export interface ActiveChip {
  id: string;
  label: string;
}

export function useFilters(allLeads: Lead[]): UseFiltersReturn {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_STATE });

  // Derive available subreddits from the loaded lead dataset (sorted alpha)
  const availableSubreddits = useMemo(() => {
    const subs = new Set(allLeads.map(l => l.subreddit).filter(Boolean));
    return Array.from(subs).sort((a, b) => a.localeCompare(b));
  }, [allLeads]);

  // ── Setters ────────────────────────────────────────────────────────────────

  const setSearchQuery = useCallback((q: string) => {
    setFilters(prev => ({ ...prev, searchQuery: q }));
  }, []);

  const togglePriority = useCallback((p: PriorityType) => {
    setFilters(prev => {
      const next = new Set(prev.priorities);
      next.has(p) ? next.delete(p) : next.add(p);
      return { ...prev, priorities: next };
    });
  }, []);

  const toggleCategory = useCallback((c: CategoryType) => {
    setFilters(prev => {
      const next = new Set(prev.categories);
      next.has(c) ? next.delete(c) : next.add(c);
      return { ...prev, categories: next };
    });
  }, []);

  const toggleSubreddit = useCallback((s: string) => {
    setFilters(prev => {
      const next = new Set(prev.subreddits);
      next.has(s) ? next.delete(s) : next.add(s);
      return { ...prev, subreddits: next };
    });
  }, []);

  const setIntentRange = useCallback((r: [number, number]) => {
    setFilters(prev => ({ ...prev, intentRange: r }));
  }, []);

  const setConfidenceRange = useCallback((r: [number, number]) => {
    setFilters(prev => ({ ...prev, confidenceRange: r }));
  }, []);

  const setSortKey = useCallback((k: SortKey) => {
    setFilters(prev => ({ ...prev, sortKey: k }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_STATE });
  }, []);

  // ── Filtered + sorted leads ────────────────────────────────────────────────

  const filteredLeads = useMemo(() => {
    const { searchQuery, priorities, categories, subreddits, intentRange, confidenceRange, sortKey } = filters;
    const q = searchQuery.toLowerCase().trim();

    let result = allLeads.filter(lead => {
      // Search
      if (q) {
        const kwMatch = Array.isArray(lead.keywords)
          ? lead.keywords.some(k => String(k).toLowerCase().includes(q))
          : false;
        if (
          !lead.title.toLowerCase().includes(q) &&
          !lead.body.toLowerCase().includes(q) &&
          !lead.subreddit.toLowerCase().includes(q) &&
          !kwMatch
        ) return false;
      }

      // Priority
      if (!priorities.has(lead.priority)) return false;

      // Category
      if (!categories.has(lead.category)) return false;

      // Subreddit (empty set = all)
      if (subreddits.size > 0 && !subreddits.has(lead.subreddit)) return false;

      // Intent score range
      const score = lead.intent_score ?? 0;
      if (score < intentRange[0] || score > intentRange[1]) return false;

      // Confidence range (stored as 0-1 or 0-100 — normalise)
      const conf = lead.confidence <= 1 ? lead.confidence * 100 : lead.confidence;
      if (conf < confidenceRange[0] || conf > confidenceRange[1]) return false;

      return true;
    });

    // Sort
    switch (sortKey) {
      case 'intent_desc':
        result = result.sort((a, b) => (b.intent_score ?? 0) - (a.intent_score ?? 0));
        break;
      case 'confidence_desc':
        result = result.sort((a, b) => {
          const ca = a.confidence <= 1 ? a.confidence * 100 : a.confidence;
          const cb = b.confidence <= 1 ? b.confidence * 100 : b.confidence;
          return cb - ca;
        });
        break;
      case 'newest':
        result = result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result = result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
    }

    return result;
  }, [allLeads, filters]);

  // ── Active filter chips ────────────────────────────────────────────────────

  const PRIORITY_LABELS: Record<PriorityType, string> = { high: 'High', medium: 'Medium', low: 'Low' };
  const CATEGORY_LABELS: Record<CategoryType, string> = {
    buying_intent: 'Buying Intent',
    comparison: 'Comparison',
    pain_point: 'Pain Point',
    research: 'Research',
    uncategorized: 'Uncategorized',
  };

  const activeChips = useMemo((): ActiveChip[] => {
    const chips: ActiveChip[] = [];
    const { priorities, categories, subreddits, intentRange, confidenceRange, searchQuery, sortKey } = filters;

    // Missing priorities (deselected ones are the "active" exclusions)
    ALL_PRIORITIES.forEach(p => {
      if (!priorities.has(p)) chips.push({ id: `priority:${p}`, label: `No ${PRIORITY_LABELS[p]}` });
    });

    // Missing categories
    ALL_CATEGORIES.forEach(c => {
      if (!categories.has(c)) chips.push({ id: `category:${c}`, label: `No ${CATEGORY_LABELS[c]}` });
    });

    // Subreddits
    subreddits.forEach(s => chips.push({ id: `sub:${s}`, label: `r/${s}` }));

    // Intent range
    if (intentRange[0] > 0 || intentRange[1] < 100) {
      chips.push({ id: 'intent_range', label: `Intent ${intentRange[0]}–${intentRange[1]}` });
    }

    // Confidence range
    if (confidenceRange[0] > 0 || confidenceRange[1] < 100) {
      chips.push({ id: 'conf_range', label: `Conf ${confidenceRange[0]}–${confidenceRange[1]}%` });
    }

    // Search
    if (searchQuery.trim()) {
      chips.push({ id: 'search', label: `"${searchQuery.trim()}"` });
    }

    // Sort (non-default)
    const sortLabels: Record<SortKey, string> = {
      intent_desc: '',
      confidence_desc: 'Sort: Confidence',
      newest: 'Sort: Newest',
      oldest: 'Sort: Oldest',
    };
    if (sortLabels[sortKey]) chips.push({ id: `sort:${sortKey}`, label: sortLabels[sortKey] });

    return chips;
  }, [filters]);

  const removeChip = useCallback((chipId: string) => {
    setFilters(prev => {
      const next = { ...prev };

      if (chipId.startsWith('priority:')) {
        const p = chipId.replace('priority:', '') as PriorityType;
        next.priorities = new Set([...prev.priorities, p]);
      } else if (chipId.startsWith('category:')) {
        const c = chipId.replace('category:', '') as CategoryType;
        next.categories = new Set([...prev.categories, c]);
      } else if (chipId.startsWith('sub:')) {
        const s = chipId.replace('sub:', '');
        const subs = new Set(prev.subreddits);
        subs.delete(s);
        next.subreddits = subs;
      } else if (chipId === 'intent_range') {
        next.intentRange = [0, 100];
      } else if (chipId === 'conf_range') {
        next.confidenceRange = [0, 100];
      } else if (chipId === 'search') {
        next.searchQuery = '';
      } else if (chipId.startsWith('sort:')) {
        next.sortKey = 'intent_desc';
      }

      return next;
    });
  }, []);

  return {
    filters,
    setSearchQuery,
    togglePriority,
    toggleCategory,
    toggleSubreddit,
    setIntentRange,
    setConfidenceRange,
    setSortKey,
    resetFilters,
    availableSubreddits,
    filteredLeads,
    totalCount: allLeads.length,
    filteredCount: filteredLeads.length,
    hasActiveFilters: !isDefault(filters),
    activeChips,
    removeChip,
  };
}
