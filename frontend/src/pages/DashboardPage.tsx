import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLeads } from '../hooks/useLeads';
import { User } from '@supabase/supabase-js';
import { usePreferences } from '../hooks/usePreferences';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { useFilters } from '../hooks/useFilters';
import { Sidebar } from '../components/Sidebar';
import { LiveSignalFeed } from '../components/LiveSignalFeed';
import { ToastContainer } from '../components/ToastContainer';
import { useHealthMonitor } from '../hooks/useHealthMonitor';
import { LoadingState, ErrorState } from '../components/EmptyStates';
import { 
  RotateCw, 
  LogOut, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Flame, 
  Users, 
  Target,
  Star,
  PhoneCall,
  Download,
  Kanban,
  List,
  Bell,
  Settings,
  CheckSquare,
  Trash2,
  BellOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Lead, CategoryType } from '../types/lead';

// ─── Notification Types & Cache Helpers ─────────────────────────────────────

export interface AppNotification {
  id: string; // post_id
  subreddit: string;
  title: string;
  intent_score: number;
  category: string;
  timestamp: string; // ISO string
  read: boolean;
  lead: Lead;
}

export interface NotificationPrefs {
  enabled: boolean;
  threshold: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  threshold: 80,
};

const getNotificationPrefs = (): NotificationPrefs => {
  try {
    const cached = localStorage.getItem('signalradar_notification_prefs');
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {}
  return DEFAULT_PREFS;
};

const setNotificationPrefs = (prefs: NotificationPrefs) => {
  localStorage.setItem('signalradar_notification_prefs', JSON.stringify(prefs));
};

const getCachedNotifications = (): AppNotification[] => {
  try {
    const cached = localStorage.getItem('signalradar_notifications');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const setCachedNotifications = (notifications: AppNotification[]) => {
  try {
    localStorage.setItem('signalradar_notifications', JSON.stringify(notifications));
  } catch {}
};

// Lazy load heavy components to optimize initial bundle size
const AnalyticsPage = React.lazy(() => import('./AnalyticsPage'));
const PipelineBoard = React.lazy(() => import('../components/PipelineBoard'));
const LeadDetailsDrawer = React.lazy(() => import('../components/LeadDetailsDrawer'));

const AnalyticsLoadingFallback = () => (
  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
    <div className="flex justify-between items-center h-12 animate-pulse">
      <div className="h-8 w-48 bg-white/5 rounded" />
      <div className="h-8 w-24 bg-white/5 rounded" />
    </div>
    <div className="h-10 w-full bg-white/5 rounded animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-panel p-6 h-28 flex flex-col justify-between overflow-hidden relative">
          <div className="h-4 w-24 bg-white/5 rounded shimmer" />
          <div className="h-8 w-16 bg-white/10 rounded shimmer mt-2" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="glass-panel p-6 h-[350px] relative overflow-hidden">
        <div className="h-6 w-32 bg-white/10 rounded shimmer" />
        <div className="absolute inset-x-6 bottom-6 top-16 bg-white/5 rounded shimmer" />
      </div>
      <div className="glass-panel p-6 h-[350px] relative overflow-hidden">
        <div className="h-6 w-32 bg-white/10 rounded shimmer" />
        <div className="absolute inset-x-6 bottom-6 top-16 bg-white/5 rounded shimmer" />
      </div>
    </div>
  </div>
);

const PipelineLoadingFallback = () => (
  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
    <div className="flex justify-between items-center h-12 animate-pulse">
      <div className="h-8 w-48 bg-white/5 rounded" />
      <div className="h-8 w-24 bg-white/5 rounded" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
      {['New Leads', 'Saved Leads', 'Contacted Leads'].map((title, idx) => (
        <div key={idx} className="glass-panel p-4 flex flex-col space-y-4 h-full relative overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="h-5 w-28 bg-white/10 rounded shimmer" />
            <div className="h-5 w-8 bg-white/5 rounded shimmer" />
          </div>
          <div className="flex-1 space-y-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel p-4 space-y-3 relative overflow-hidden">
                <div className="h-4 w-3/4 bg-white/10 rounded shimmer" />
                <div className="h-3 w-1/4 bg-white/5 rounded shimmer" />
                <div className="h-3 w-full bg-white/5 rounded shimmer" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface DashboardPageProps {
  currentView: 'dashboard' | 'analytics' | 'saved' | 'contacts' | 'pipeline';
  onBackToMarketing: () => void;
  user: User | null;
  onLogout: () => void;
}

const routeToSidebarView = {
  dashboard: 'all',
  saved: 'saved',
  contacts: 'contacted',
  analytics: 'analytics',
  pipeline: 'pipeline'
} as const;

const sidebarViewToRoute = {
  all: 'dashboard',
  saved: 'saved',
  contacted: 'contacts',
  analytics: 'analytics',
  pipeline: 'pipeline'
} as const;

const ALL_CATEGORIES: CategoryType[] = ['buying_intent', 'comparison', 'pain_point', 'research', 'uncategorized'];

export function DashboardPage({ currentView, onBackToMarketing, user, onLogout }: DashboardPageProps) {
  const navigate = useNavigate();
  const health = useHealthMonitor();
  const { preferences, updatePreferences } = usePreferences();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // ── Database Fetch Layer ──────────────────────────────────────────────────
  const {
    allLeads,
    loading,
    error,
    retryFetch,
    setCurrentView,
    totalLeadsCount,
    savedLeadsCount,
    contactedLeadsCount,
    toggleSaveLead,
    toggleContactedLead,
    updateLeadNotes,
    updateLeadStatus,
  } = useLeads();

  // ─── Notification States ──────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [prefEnabled, setPrefEnabled] = useState(true);
  const [prefThreshold, setPrefThreshold] = useState(80);

  // Initialize notifications on load
  useEffect(() => {
    setNotifications(getCachedNotifications());
  }, []);

  // Sync popover preference inputs with global preferences
  useEffect(() => {
    setPrefEnabled(preferences.browserNotificationsEnabled);
    setPrefThreshold(preferences.highIntentThreshold);
  }, [preferences, isNotifOpen]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Observer to trigger notifications on new qualified leads
  const prevLeadsRef = useRef<Lead[]>([]);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (loading) return;

    if (isInitialLoadRef.current) {
      prevLeadsRef.current = allLeads;
      isInitialLoadRef.current = false;
      return;
    }

    const newLeads = allLeads.filter(
      l => !prevLeadsRef.current.some(pl => pl.post_id === l.post_id)
    );

    if (newLeads.length > 0) {
      const cached = getCachedNotifications();
      let updatedNotifications = [...cached];
      let hasUpdates = false;

      newLeads.forEach(lead => {
        const isHighIntent =
          lead.intent_score >= preferences.highIntentThreshold ||
          lead.category === 'buying_intent';

        if (isHighIntent) {
          const alreadyNotified = cached.some(n => n.id === lead.post_id);
          if (!alreadyNotified) {
            const newNotif: AppNotification = {
              id: lead.post_id,
              subreddit: lead.subreddit,
              title: lead.title,
              intent_score: lead.intent_score,
              category: lead.category,
              timestamp: new Date().toISOString(),
              read: false,
              lead: lead,
            };

            updatedNotifications = [newNotif, ...updatedNotifications];
            hasUpdates = true;

            // Trigger Browser Notification
            if (preferences.browserNotificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                const browserNotif = new Notification('🚀 High-Intent Lead Detected', {
                  body: `r/${lead.subreddit}\n${lead.title}`,
                  tag: lead.post_id,
                });

                browserNotif.onclick = () => {
                  window.focus();
                  handleSelectLeadFromNotification(lead);
                  browserNotif.close();
                };
              } catch (err) {
                console.error('Failed to display browser notification:', err);
              }
            }
          }
        }
      });

      if (hasUpdates) {
        const sliced = updatedNotifications.slice(0, 100);
        setCachedNotifications(sliced);
        setNotifications(sliced);
      }
    }

    prevLeadsRef.current = allLeads;
  }, [allLeads, loading, preferences.highIntentThreshold, preferences.browserNotificationsEnabled]);

  // ── Dashboard Background Polling ──────────────────────────────────────────
  useEffect(() => {
    if (loading || !preferences.autoRefreshInterval) return;

    const intervalId = setInterval(() => {
      console.log(`Polling leads feed every ${preferences.autoRefreshInterval}s...`);
      retryFetch();
    }, preferences.autoRefreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [retryFetch, preferences.autoRefreshInterval, loading]);

  const handleSelectLeadFromNotification = (lead: Lead) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === lead.post_id ? { ...n, read: true } : n);
      setCachedNotifications(updated);
      return updated;
    });

    openDrawer(lead);

    setTimeout(() => {
      const el = document.getElementById(`lead-row-${lead.post_id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-lime/10');
        setTimeout(() => {
          el.classList.remove('bg-lime/10');
        }, 2000);
      }
    }, 150);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      setCachedNotifications(updated);
      return updated;
    });
  };

  const handleClearAllNotifs = () => {
    setNotifications([]);
    setCachedNotifications([]);
  };

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: !n.read } : n);
      setCachedNotifications(updated);
      return updated;
    });
  };

  const handleSavePreferences = () => {
    updatePreferences({
      browserNotificationsEnabled: prefEnabled,
      highIntentThreshold: prefThreshold
    });
    setShowNotifPrefs(false);

    if (prefEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission();
    }
  };


  // Sync Supabase query view with active URL route
  const sidebarView = routeToSidebarView[currentView];
  useEffect(() => {
    setCurrentView(sidebarView);
  }, [sidebarView, setCurrentView]);

  // ── Sidebar Navigation Handler ────────────────────────────────────────────
  const handleSetView = (viewId: 'all' | 'saved' | 'contacted' | 'analytics' | 'pipeline') => {
    const route = sidebarViewToRoute[viewId];
    navigate(`/${route}`);
  };

  // ── Filter State (Synchronized with Sidebar and useFilters) ───────────────
  const {
    filters,
    setSearchQuery,
    toggleCategory,
    toggleSubreddit,
    setIntentRange,
    setConfidenceRange,
    resetFilters,
    availableSubreddits,
    filteredLeads,
    hasActiveFilters,
  } = useFilters(allLeads);

  // Local Sort and Pagination states
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Drawer State ──────────────────────────────────────────────────────────
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const liveDrawerLead = useMemo(() => {
    if (!drawerLead) return null;
    return allLeads.find(l => l.post_id === drawerLead.post_id) || drawerLead;
  }, [allLeads, drawerLead]);

  const openDrawer = (lead: Lead) => {
    setDrawerLead(lead);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerLead(null), 300);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchQuery, filters.categories, filters.subreddits, filters.intentRange, sortBy]);

  // ── KPI Metrics (computed from loaded allLeads dataset) ───────────────────
  const totalLeads = allLeads.length;

  const avgIntentScore = useMemo(() => {
    if (allLeads.length === 0) return 0;
    const sum = allLeads.reduce((acc, lead) => acc + lead.intent_score, 0);
    return Math.round(sum / allLeads.length);
  }, [allLeads]);

  const buyingIntentCount = useMemo(() => {
    return allLeads.filter(l => l.category === 'buying_intent').length;
  }, [allLeads]);

  const painPointCount = useMemo(() => {
    return allLeads.filter(l => l.category === 'pain_point').length;
  }, [allLeads]);

  // ── Filters Synchronization Helpers ───────────────────────────────────────
  const displayCategory = useMemo(() => {
    if (filters.categories.size === 1) {
      return Array.from(filters.categories)[0];
    }
    return 'all';
  }, [filters.categories]);

  const displaySubreddit = useMemo(() => {
    if (filters.subreddits.size === 1) {
      return Array.from(filters.subreddits)[0];
    }
    return 'all';
  }, [filters.subreddits]);

  const handleCategorySelect = (cat: string) => {
    if (cat === 'all') {
      ALL_CATEGORIES.forEach(c => {
        if (!filters.categories.has(c)) toggleCategory(c);
      });
    } else {
      ALL_CATEGORIES.forEach(c => {
        const isSelected = c === cat;
        const isActive = filters.categories.has(c);
        if (isSelected && !isActive) {
          toggleCategory(c);
        } else if (!isSelected && isActive) {
          toggleCategory(c);
        }
      });
    }
  };

  const handleSubredditSelect = (sub: string) => {
    if (sub === 'all') {
      availableSubreddits.forEach(s => {
        if (filters.subreddits.has(s)) toggleSubreddit(s);
      });
    } else {
      availableSubreddits.forEach(s => {
        const isSelected = s === sub;
        const isActive = filters.subreddits.has(s);
        if (isSelected && !isActive) {
          toggleSubreddit(s);
        } else if (!isSelected && isActive) {
          toggleSubreddit(s);
        }
      });
    }
  };

  // ── Local Sort & Pagination Slice ─────────────────────────────────────────
  const sortedLeads = useMemo(() => {
    const result = [...filteredLeads];
    if (sortBy === 'date_desc') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'date_asc') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'intent_desc') {
      result.sort((a, b) => b.intent_score - a.intent_score);
    } else if (sortBy === 'intent_asc') {
      result.sort((a, b) => a.intent_score - b.intent_score);
    }
    return result;
  }, [filteredLeads, sortBy]);

  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedLeads.slice(start, start + itemsPerPage);
  }, [sortedLeads, currentPage, itemsPerPage]);

  const handleClearFilters = () => {
    resetFilters();
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (sortedLeads.length === 0) return;

    const headers = ['created_at', 'subreddit', 'title', 'category', 'intent_score', 'lead_summary', 'draft_reply', 'url'];
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const escaped = String(val).replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')
        ? `"${escaped}"`
        : escaped;
    };

    const rows = sortedLeads.map(lead => [
      lead.created_at,
      lead.subreddit,
      lead.title,
      lead.category,
      lead.intent_score,
      lead.lead_summary || '',
      lead.draft_reply || '',
      lead.url
    ].map(escapeCSV).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('download', `signalradar_leads_${currentView}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper formatting functions
  function formatDateTime(isoString: string) {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }

  function getCategoryLabel(cat: string): string {
    switch (cat) {
      case 'buying_intent': return 'Buying Intent';
      case 'comparison': return 'Comparison';
      case 'pain_point': return 'Pain Point';
      case 'research': return 'Research';
      case 'uncategorized': return 'Uncategorized';
      default: return cat;
    }
  }

  function getCategoryStyle(cat: string): string {
    switch (cat) {
      case 'buying_intent': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'comparison': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'pain_point': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'research': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-gray-400 bg-white/5 border-white/10';
    }
  }

  function getIntentColor(score: number): string {
    if (score >= 80) return 'bg-lime';
    if (score >= 60) return 'bg-amberAccent';
    return 'bg-gray-500';
  }

  const monitoredSubs = ['SaaS', 'smallbusiness', 'startups', 'marketing', 'shopify'];

  return (
    <div className="h-screen bg-carbon-dark text-white select-none relative flex flex-col font-sans overflow-hidden">
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 h-16 glass-panel border-t-0 border-r-0 border-l-0 bg-carbon-dark/80 backdrop-blur-md z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lime animate-pulse shadow-[0_0_6px_#C6FF34]" />
          <span className="font-mono text-sm font-bold tracking-wider text-white">SignalRadar</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="text-[10px] font-mono text-mutedText uppercase tracking-widest mr-1">monitoring:</span>
          {monitoredSubs.map(sub => (
            <span key={sub} className="px-2.5 py-0.5 rounded-full glass-panel border-white/5 bg-white/[0.01] font-mono text-[9px] text-lime/90 font-medium">
              r/{sub}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Health Indicators */}
          <div className="hidden xl:flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider">
            <div className="flex items-center gap-1.5 glass-panel border-white/5 px-2.5 py-1 rounded-full">
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_4px_currentColor]", health.api ? "bg-lime text-lime" : "bg-red-500 text-red-500")} />
              <span className={cn(health.api ? "text-white/80" : "text-red-400 font-bold")}>API</span>
            </div>
            <div className="flex items-center gap-1.5 glass-panel border-white/5 px-2.5 py-1 rounded-full">
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_4px_currentColor]", health.scheduler ? "bg-lime text-lime" : "bg-red-500 text-red-500")} />
              <span className={cn(health.scheduler ? "text-white/80" : "text-red-400 font-bold")}>SCHEDULER</span>
            </div>
            <div className="flex items-center gap-1.5 glass-panel border-white/5 px-2.5 py-1 rounded-full">
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_4px_currentColor]", health.db ? "bg-lime text-lime" : "bg-red-500 text-red-500")} />
              <span className={cn(health.db ? "text-white/80" : "text-red-400 font-bold")}>DB</span>
            </div>
            <div className="flex items-center gap-1.5 glass-panel border-white/5 px-2.5 py-1 rounded-full">
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_4px_currentColor]", health.groq ? "bg-lime text-lime" : "bg-red-500 text-red-500")} />
              <span className={cn(health.groq ? "text-white/80" : "text-red-400 font-bold")}>GROQ</span>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
            health.scheduler 
              ? "glass-panel border-white/5 bg-white/[0.01] text-lime" 
              : "border-red-500/20 bg-red-500/10 text-red-400 font-bold"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", health.scheduler ? "bg-lime pulse-dot" : "bg-red-500 shadow-[0_0_6px_#ef4444]")} />
            <span className="font-mono text-[9px] tracking-widest uppercase">
              {health.scheduler ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setShowNotifPrefs(false);
              }}
              className={cn(
                "p-1.5 rounded-lg glass-panel border-white/5 transition-colors duration-150 relative cursor-pointer",
                isNotifOpen ? "text-lime border-lime/30 bg-lime/5" : "text-gray-400 hover:text-white"
              )}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold text-[8px] h-4 w-4 rounded-full flex items-center justify-center border border-carbon-dark shadow-lg">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-80 glass-panel border-white/10 bg-carbon-card/95 shadow-2xl rounded-2xl overflow-hidden z-[50] flex flex-col font-sans"
                >
                  {/* Preferences View */}
                  {showNotifPrefs ? (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-lime">
                          Notification Prefs
                        </h4>
                        <button
                          onClick={() => setShowNotifPrefs(false)}
                          className="text-[10px] font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Back
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Toggle enabled */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-300 font-medium">Browser Alerts</span>
                          <button
                            onClick={() => setPrefEnabled(!prefEnabled)}
                            className={cn(
                              "px-2.5 py-1 text-[9px] font-mono rounded-lg border transition-all cursor-pointer",
                              prefEnabled 
                                ? "bg-lime/10 border-lime/30 text-lime font-bold" 
                                : "bg-white/5 border-white/10 text-gray-400"
                            )}
                          >
                            {prefEnabled ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        {/* Slider threshold */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-mutedText">
                            <span>Min Score Threshold</span>
                            <span className="text-lime font-bold font-mono">{prefThreshold}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={prefThreshold}
                            onChange={(e) => setPrefThreshold(Number(e.target.value))}
                            className="w-full accent-lime bg-white/10 h-1 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSavePreferences}
                        className="w-full py-2 bg-lime hover:bg-lime/90 text-carbon-dark text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
                      >
                        Save Preferences
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Notifications List View */}
                      <div className="flex items-center justify-between p-3.5 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-lime" />
                          <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-white">
                            Notifications
                          </h4>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowNotifPrefs(true)}
                            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Notification Settings"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          {notifications.length > 0 && (
                            <>
                              <button
                                onClick={handleMarkAllRead}
                                className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="Mark all read"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleClearAllNotifs}
                                className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                title="Clear all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Items (Latest 20) */}
                      <div className="max-h-64 overflow-y-auto divide-y divide-white/5 pr-0.5">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2">
                            <BellOff className="w-7 h-7 text-gray-600" />
                            <span className="text-xs font-mono text-gray-500">No new high-intent leads</span>
                          </div>
                        ) : (
                          notifications.slice(0, 20).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                handleSelectLeadFromNotification(n.lead);
                                setIsNotifOpen(false);
                              }}
                              className={cn(
                                "p-3 flex items-start gap-2.5 hover:bg-white/[0.02] cursor-pointer transition-colors relative group",
                                !n.read && "bg-lime/[0.01]"
                              )}
                            >
                              {/* Unread indicator */}
                              {!n.read && (
                                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-lime" />
                              )}

                              <div className="flex-1 min-w-0 pl-1">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[9px] font-mono font-medium text-lime/90 truncate max-w-[120px]">
                                    r/{n.subreddit}
                                  </span>
                                  <span className="text-[8px] font-mono text-gray-500">
                                    {new Date(n.timestamp).toLocaleTimeString(undefined, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}
                                  </span>
                                </div>
                                <p className="text-[11px] font-sans text-gray-200 line-clamp-2 leading-relaxed font-medium">
                                  {n.title}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-[8px] font-mono text-gray-400 border border-white/10 px-1 py-0.2 rounded uppercase">
                                    {n.category.replace('_', ' ')}
                                  </span>
                                  <span className="text-[8px] font-mono text-lime font-bold bg-lime/10 px-1 py-0.2 rounded">
                                    {n.intent_score}% Score
                                  </span>
                                </div>
                              </div>

                              {/* Toggle Read Dot manually on hover */}
                              <button
                                onClick={(e) => handleToggleRead(n.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-all cursor-pointer flex-shrink-0"
                                title={n.read ? "Mark unread" : "Mark read"}
                              >
                                <div className={cn("w-1.5 h-1.5 rounded-full", n.read ? "border border-gray-400" : "bg-lime")} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-lime flex items-center justify-center font-mono text-black font-bold text-xs cursor-pointer hover:brightness-110 active:scale-95 transition-all outline-none"
              title="User Profile & Settings"
            >
              {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </motion.button>
          )}

          <button
            onClick={onBackToMarketing}
            className="p-1.5 rounded-lg glass-panel border-white/5 text-gray-400 hover:text-white transition-colors duration-150"
            title="Landing Page"
          >
            <LogOut className="w-4 h-4 transform rotate-180" />
          </button>
        </div>
      </nav>

      {/* ── Live signal marquee ─────────────────────────────────────────────── */}
      <div className="fixed top-16 left-0 right-0 z-30">
        <LiveSignalFeed />
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row pt-[108px] h-screen overflow-hidden">
        
        {/* Sidebar Navigation & Filters */}
        <Sidebar
          currentView={sidebarView}
          setView={handleSetView}
          totalLeads={totalLeadsCount}
          savedCount={savedLeadsCount}
          contactedCount={contactedLeadsCount}
          filters={filters}
          availableSubreddits={availableSubreddits}
          togglePriority={() => {}} // Not needed for lead dashboard
          toggleCategory={toggleCategory}
          toggleSubreddit={toggleSubreddit}
          setIntentRange={setIntentRange}
          setConfidenceRange={setConfidenceRange}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />

        {/* ── Main Content Area ──────────────────────────────────────────────── */}
        {currentView === 'analytics' ? (
          <React.Suspense fallback={<AnalyticsLoadingFallback />}>
            <AnalyticsPage
              leads={allLeads}
              loading={loading}
              error={error}
              retryFetch={retryFetch}
            />
          </React.Suspense>
        ) : currentView === 'pipeline' ? (
          <React.Suspense fallback={<PipelineLoadingFallback />}>
            <PipelineBoard
              leads={filteredLeads}
              loading={loading}
              error={error}
              retryFetch={retryFetch}
              updateLeadStatus={updateLeadStatus}
              onOpenDrawer={openDrawer}
            />
          </React.Suspense>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            
            {/* Title & Reload button */}
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold font-syne text-white tracking-tight capitalize">
                  {currentView === 'dashboard' ? 'Lead Dashboard' : currentView === 'saved' ? 'Bookmarked Leads' : 'Outreach History'}
                </h1>
                <p className="text-xs text-mutedText font-mono">
                  {currentView === 'dashboard' && 'View and filter qualified Reddit leads in real-time'}
                  {currentView === 'saved' && 'Review and draft replies for bookmarked opportunities'}
                  {currentView === 'contacts' && 'Track outreach velocity and history logs'}
                </p>
              </div>
              {!loading && (
                <div className="flex items-center gap-2">
                  {currentView === 'dashboard' && (
                    <button
                      onClick={() => navigate('/pipeline')}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-lg glass-panel border-white/5 text-gray-400 hover:text-white hover:border-white/10 transition-colors cursor-pointer"
                      title="Switch to Pipeline View"
                    >
                      <Kanban className="w-4 h-4" />
                      <span className="hidden sm:inline">Pipeline View</span>
                    </button>
                  )}
                  <button
                    onClick={handleExportCSV}
                    disabled={sortedLeads.length === 0}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-lg glass-panel border-white/5 text-gray-400 hover:text-white hover:border-white/10 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Export filtered leads to CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>
                  <button
                    onClick={retryFetch}
                    className="p-2 rounded-lg glass-panel border-white/5 text-gray-400 hover:text-white hover:border-white/10 transition-colors"
                    title="Refresh Leads"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* ── KPI Cards Section ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Total Leads */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="glass-panel p-6 flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono uppercase tracking-widest text-mutedText">
                    Total Leads
                  </span>
                  <Users className="w-4 h-4 text-lime/75" />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-white">
                    <CountUp target={totalLeadsCount} />
                  </span>
                  <div className="h-1 w-8 bg-lime rounded-full ml-1" />
                </div>
              </motion.div>

              {/* Card 2: Saved Leads */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="glass-panel p-6 flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono uppercase tracking-widest text-mutedText">
                    Saved Leads
                  </span>
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400/10" />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-white">
                    <CountUp target={savedLeadsCount} />
                  </span>
                  <div className="h-1 w-8 bg-yellow-400 rounded-full ml-1" />
                </div>
              </motion.div>

              {/* Card 3: Contacted Leads */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="glass-panel p-6 flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono uppercase tracking-widest text-mutedText">
                    Contacted Leads
                  </span>
                  <PhoneCall className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-white">
                    <CountUp target={contactedLeadsCount} />
                  </span>
                  <div className="h-1 w-8 bg-cyan-400 rounded-full ml-1" />
                </div>
              </motion.div>

              {/* Card 4: Average Intent Score */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="glass-panel p-6 flex flex-col justify-between min-h-[110px]"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono uppercase tracking-widest text-mutedText">
                    Average Intent Score
                  </span>
                  <TrendingUp className="w-4 h-4 text-lime/75" />
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-white">
                    <CountUp target={avgIntentScore} />
                    <span className="text-sm text-lime font-mono font-medium ml-0.5">%</span>
                  </span>
                  <div className="h-1 w-8 bg-lime rounded-full ml-1" />
                </div>
              </motion.div>
            </div>

            {/* ── Search & Filters Section ───────────────────────────────────── */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search by title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-mutedText flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-lime" />
                    Search Title
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search..."
                      value={filters.searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#0A0A0A]/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-lime/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-mutedText">Category</label>
                  <select
                    value={displayCategory}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#0A0A0A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-lime/50 transition-colors"
                  >
                    <option value="all" className="bg-[#0A0A0A]">All Categories</option>
                    <option value="buying_intent" className="bg-[#0A0A0A]">Buying Intent</option>
                    <option value="comparison" className="bg-[#0A0A0A]">Comparison</option>
                    <option value="pain_point" className="bg-[#0A0A0A]">Pain Point</option>
                    <option value="research" className="bg-[#0A0A0A]">Research</option>
                    <option value="uncategorized" className="bg-[#0A0A0A]">Uncategorized</option>
                  </select>
                </div>

                {/* Subreddit Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-mutedText">Subreddit</label>
                  <select
                    value={displaySubreddit}
                    onChange={(e) => handleSubredditSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#0A0A0A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-lime/50 transition-colors"
                  >
                    <option value="all" className="bg-[#0A0A0A]">All Subreddits</option>
                    {availableSubreddits.map(sub => (
                      <option key={sub} value={sub} className="bg-[#0A0A0A]">r/{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Sort selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-mutedText">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#0A0A0A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-lime/50 transition-colors"
                  >
                    <option value="date_desc" className="bg-[#0A0A0A]">Date: Newest First</option>
                    <option value="date_asc" className="bg-[#0A0A0A]">Date: Oldest First</option>
                    <option value="intent_desc" className="bg-[#0A0A0A]">Intent Score: Highest</option>
                    <option value="intent_asc" className="bg-[#0A0A0A]">Intent Score: Lowest</option>
                  </select>
                </div>
              </div>

              {/* Intent Score Range Sliders */}
              <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-mutedText">
                    <span className="flex items-center gap-1.5">
                      <Filter className="w-3 h-3 text-lime" />
                      Intent Score Range
                    </span>
                    <span className="text-lime font-bold font-mono">{filters.intentRange[0]} - {filters.intentRange[1]}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[10px] text-mutedText font-mono">Min:</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filters.intentRange[0]}
                        onChange={(e) => {
                          setIntentRange([Math.min(Number(e.target.value), filters.intentRange[1]), filters.intentRange[1]]);
                        }}
                        className="w-full accent-lime bg-white/10 h-1 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[10px] text-mutedText font-mono">Max:</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filters.intentRange[1]}
                        onChange={(e) => {
                          setIntentRange([filters.intentRange[0], Math.max(Number(e.target.value), filters.intentRange[0])]);
                        }}
                        className="w-full accent-lime bg-white/10 h-1 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between md:justify-end md:gap-8 h-full">
                  <div className="text-xs text-mutedText font-mono">
                    Showing <span className="text-white">{sortedLeads.length}</span> of <span className="text-white">{allLeads.length}</span> leads
                  </div>
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-lime/80 hover:text-lime hover:underline transition-colors font-mono cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* ── Table Container ─────────────────────────────────────────────── */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-12">
                  <LoadingState />
                </div>
              ) : error ? (
                <div className="p-12">
                  <ErrorState message={error} onRetry={retryFetch} />
                </div>
              ) : sortedLeads.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl max-w-md mx-auto my-8 border-none bg-transparent">
                  <span className="text-xl block mb-4">🔍</span>
                  <h3 className="text-base font-semibold mb-1 text-white">No leads found</h3>
                  <p className="text-xs text-mutedText leading-relaxed">
                    Try adjusting your search queries or active filters.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse text-left text-sm text-gray-300">
                      <thead className="bg-white/[0.02] border-b border-white/5 font-mono text-xs uppercase text-mutedText tracking-wider">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Created At</th>
                          <th className="px-6 py-4 font-semibold">Title</th>
                          <th className="px-6 py-4 font-semibold">Subreddit</th>
                          <th className="px-6 py-4 font-semibold">Category</th>
                          <th className="px-6 py-4 font-semibold">Intent Score</th>
                          <th className="px-6 py-4 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {paginatedLeads.map((lead) => (
                          <tr
                            key={lead.post_id}
                            id={`lead-row-${lead.post_id}`}
                            className="hover:bg-white/[0.015] transition-colors cursor-pointer group"
                            onClick={() => openDrawer(lead)}
                          >
                            {/* Created At */}
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-mutedText font-mono">
                              {formatDateTime(lead.created_at)}
                            </td>
                            {/* Title & Summary preview */}
                            <td className="px-6 py-4">
                              <div className="space-y-1 max-w-[340px]">
                                <div className="font-semibold text-white group-hover:text-lime transition-colors truncate" title={lead.title}>
                                  {lead.title}
                                </div>
                                <div className="text-xs text-mutedText line-clamp-1 truncate" title={lead.lead_summary || lead.body}>
                                  {lead.lead_summary || lead.body || '—'}
                                </div>
                              </div>
                            </td>
                            {/* Subreddit */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono text-xs text-lime/90 px-2.5 py-1 rounded-full bg-lime/5 border border-lime/10">
                                r/{lead.subreddit}
                              </span>
                            </td>
                            {/* Category */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium border", getCategoryStyle(lead.category))}>
                                {getCategoryLabel(lead.category)}
                              </span>
                            </td>
                            {/* Intent Score */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-12 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full", getIntentColor(lead.intent_score))}
                                    style={{ width: `${lead.intent_score}%` }}
                                  />
                                </div>
                                <span className={cn("font-mono text-xs font-bold", lead.intent_score >= 80 ? 'text-lime' : lead.intent_score >= 60 ? 'text-amberAccent' : 'text-gray-400')}>
                                  {lead.intent_score}
                                </span>
                              </div>
                            </td>
                            {/* Action link */}
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDrawer(lead);
                                }}
                                className="text-xs text-lime border border-lime/20 bg-lime/5 hover:bg-lime/15 hover:border-lime/30 px-3 py-1.5 rounded-lg transition-colors font-mono cursor-pointer"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Pagination Controls ───────────────────────────────────── */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-white/[0.01] border-t border-white/5">
                      <div className="text-xs text-mutedText font-mono">
                        Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className={cn(
                            "p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer",
                            currentPage === 1 && "opacity-50 pointer-events-none"
                          )}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className={cn(
                            "p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer",
                            currentPage === totalPages && "opacity-50 pointer-events-none"
                          )}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Lead Details Drawer ─────────────────────────────────────────────── */}
      <React.Suspense fallback={null}>
        <LeadDetailsDrawer
          lead={liveDrawerLead}
          isOpen={drawerOpen}
          onClose={closeDrawer}
          isSaved={liveDrawerLead?.status === 'saved'}
          isContacted={liveDrawerLead?.status === 'contacted'}
          onToggleSave={() => liveDrawerLead && toggleSaveLead(liveDrawerLead.post_id)}
          onToggleContacted={() => liveDrawerLead && toggleContactedLead(liveDrawerLead.post_id)}
          onUpdateNotes={async (notes) => {
            if (liveDrawerLead) {
              await updateLeadNotes(liveDrawerLead.post_id, notes);
            }
          }}
        />
      </React.Suspense>

      <ToastContainer />

      {user && (
        <ProfileDrawer
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}

// ── Local CountUp Component ─────────────────────────────────────────────────
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

export default DashboardPage;
