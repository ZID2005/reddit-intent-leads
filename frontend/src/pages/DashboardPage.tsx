import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useLeads } from '../hooks/useLeads';
import { User } from '@supabase/supabase-js';
import { usePreferences } from '../hooks/usePreferences';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradeModal } from '../components/UpgradeModal';
import { useFilters } from '../hooks/useFilters';
import { Sidebar } from '../components/Sidebar';
import { LiveSignalFeed } from '../components/LiveSignalFeed';
import { ToastContainer } from '../components/ToastContainer';
import { useHealthMonitor } from '../hooks/useHealthMonitor';
import { LoadingState, ErrorState } from '../components/EmptyStates';
import AmbientBackground from '../components/AmbientBackground';
import { glassStyle } from '../lib/glass';
import { CountUp } from '../components/CountUp';
import { fadeUp, stagger, staggerFast, slideFromLeft } from '../lib/animations';
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
  Bookmark,
  Phone,
  ChevronDown,
  ChevronUp,
  Bell,
  Settings,
  CheckSquare,
  Trash2,
  BellOff,
  Zap,
  Crown,
  BarChart3,
  LayoutDashboard,
  Cpu,
  Layers,
  GitBranch,
  Terminal,
  User as UserIcon,
  Menu,
  X,
  ArrowUpRight
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

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  colorClass?: string;
}

function StatCard({ label, value, suffix = '', icon, colorClass = 'text-white' }: StatCardProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassStyle,
        borderRadius: '16px',
        cursor: 'default',
        background: hovered
          ? `radial-gradient(circle at ${pos.x}px ${pos.y}px, rgba(198,255,52,0.06) 0%, rgba(255,255,255,0.035) 55%)`
          : glassStyle.background,
      }}
      className="p-5 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start select-none">
        <span className="font-mono text-[10px] text-white/28 tracking-widest uppercase">
          {label}
        </span>
        <span className="text-white/18">
          {icon}
        </span>
      </div>
      <div className="mt-2">
        <span className={cn("font-display text-4xl font-bold tracking-tight block", colorClass)}>
          <CountUp to={value} suffix={suffix} />
        </span>
        <div className="w-8 h-0.5 bg-[#C6FF34]/55 rounded-full mt-2" />
      </div>
    </motion.div>
  );
}

function IntentScoreCell({ score }: { score: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  let barColor = 'bg-white/28';
  let textColor = 'text-white/38';
  if (score > 70) {
    barColor = 'bg-[#C6FF34]';
    textColor = 'text-[#C6FF34]';
  } else if (score >= 50) {
    barColor = 'bg-amber-400';
    textColor = 'text-amber-400';
  }

  return (
    <div ref={ref} className="shrink-0 w-32 flex items-center gap-2.5 select-none">
      <div className="w-20 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isInView ? `${score}%` : 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn("h-full rounded-full", barColor)}
        />
      </div>
      <span className={cn("font-mono text-xs font-medium shrink-0", textColor)}>
        {score}
      </span>
    </div>
  );
}

export function DashboardPage({ currentView, onBackToMarketing, user, onLogout }: DashboardPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const health = useHealthMonitor();
  const {
    subscription,
    isPro,
    canExportCSV,
    incrementUsage,
    upgradePlan,
  } = useSubscription(user?.id);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { preferences, updatePreferences } = usePreferences();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [rotateCount, setRotateCount] = useState(0);

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
    if (!isPro) return; // Silent early-return if Free tier: disable notifications

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
    togglePriority,
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

  const handleExportCSV = async () => {
    if (!canExportCSV) {
      setUpgradeModalOpen(true);
      return;
    }

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

    // Record usage
    await incrementUsage('csv_exports');
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
    <div className={cn("h-screen text-white select-none relative flex flex-col font-sans overflow-hidden", currentView === 'pipeline' ? 'bg-[#070708]' : 'bg-carbon-dark')}>
      <AmbientBackground />
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <nav 
        style={{
          ...glassStyle,
          height: '52px',
          borderRadius: '0px',
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}
        className="fixed top-0 left-0 right-0 z-40 w-full flex items-center justify-between px-6 bg-[#070708]/85 backdrop-blur-md select-none"
      >
        
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsNotifOpen(false);
              setIsUserMenuOpen(false);
            }}
            className="w-8 h-8 bg-white/[0.04] border border-white/[0.07] rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors cursor-pointer outline-none"
          >
            {isMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>

          {/* Wordmark and Pulse */}
          <div className="flex items-center gap-1 select-none">
            <span className="font-display font-bold text-white text-base tracking-tight">SignalRadar</span>
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-2 h-2 rounded-full bg-[#C6FF34] ml-1 inline-block"
            />
          </div>
        </div>

        {/* Center: Navigation Container */}
        <div className="hidden md:flex items-center bg-white/[0.03] border border-white/[0.06] rounded-full px-1 py-1 gap-1 relative select-none">
          {[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Pipeline', path: '/pipeline' },
            { label: 'Analytics', path: '/analytics' },
          ].map(tab => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => {
                  navigate(tab.path);
                  setIsMenuOpen(false);
                }}
                className="relative px-4 py-1.5 rounded-full transition-colors cursor-pointer outline-none"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 bg-[#C6FF34] rounded-full z-0"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={cn(
                  "font-mono text-xs z-10 relative block",
                  isActive ? "text-black font-medium" : "text-white/40 hover:text-white/60"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Health Indicators (Desktop Only) */}
          <div className="hidden xl:flex items-center gap-2 font-mono text-[10px] select-none">
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-full px-2.5 py-1 inline-flex items-center gap-1.5">
              <motion.div 
                animate={health.api ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={cn("w-1.5 h-1.5 rounded-full", health.api ? "bg-[#C6FF34]" : "bg-red-400")} 
              />
              <span className="text-white/60">API</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-full px-2.5 py-1 inline-flex items-center gap-1.5">
              <motion.div 
                animate={health.scheduler ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={cn("w-1.5 h-1.5 rounded-full", health.scheduler ? "bg-[#C6FF34]" : "bg-red-400")} 
              />
              <span className="text-white/60">SCHEDULER</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-full px-2.5 py-1 inline-flex items-center gap-1.5">
              <motion.div 
                animate={health.db ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={cn("w-1.5 h-1.5 rounded-full", health.db ? "bg-[#C6FF34]" : "bg-red-400")} 
              />
              <span className="text-white/60">DB</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-full px-2.5 py-1 inline-flex items-center gap-1.5">
              <motion.div 
                animate={health.groq ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={cn("w-1.5 h-1.5 rounded-full", health.groq ? "bg-[#C6FF34]" : "bg-red-400")} 
              />
              <span className="text-white/60">GROQ</span>
            </div>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsMenuOpen(false);
                setIsUserMenuOpen(false);
                setShowNotifPrefs(false);
              }}
              className="w-8 h-8 bg-white/[0.04] border border-white/[0.07] rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors cursor-pointer outline-none relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white font-bold text-[8px] rounded-full flex items-center justify-center border border-[#070708]">
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
                  className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] notif-glass-panel rounded-2xl overflow-hidden z-[50] flex flex-col font-sans"
                >
                  {/* Preferences View */}
                  {showNotifPrefs ? (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#C6FF34]">
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
                          <Bell className="w-3.5 h-3.5 text-[#C6FF34]" />
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
                              {!n.read && (
                                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-lime" />
                              )}

                              <div className="flex-1 min-w-0 pl-1 text-left">
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

          {/* User Avatar */}
          <div className="relative">
            {user && (
              <button
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  setIsMenuOpen(false);
                  setIsNotifOpen(false);
                }}
                className="w-8 h-8 bg-[#C6FF34] rounded-full flex items-center justify-center text-black font-bold font-mono text-sm cursor-pointer hover:brightness-110 active:scale-95 transition-all outline-none"
                title="Account Menu"
              >
                {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </button>
            )}

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-[#0c0c0e]/95 p-1.5 shadow-2xl backdrop-blur-xl z-[50] text-left"
                >
                  <div className="px-2.5 py-1.5 text-[9px] font-mono text-gray-500 uppercase tracking-wider font-bold">
                    Account
                  </div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-mono text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer outline-none border border-transparent"
                  >
                    <UserIcon className="h-3.5 w-3.5" /> Profile
                  </button>
                  <div className="h-px bg-white/5 my-1" />
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left cursor-pointer outline-none border border-transparent"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sign Out Icon Button */}
          <button
            onClick={onLogout}
            className="w-8 h-8 bg-white/[0.04] border border-white/[0.07] rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors cursor-pointer outline-none"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mega Menu Popover Content */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                ...glassStyle,
                borderRadius: '32px',
                background: 'rgba(7, 7, 9, 0.92)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              }}
              className="absolute top-[58px] left-6 right-6 mx-auto w-[calc(100%-3rem)] max-h-[82vh] overflow-y-auto p-8 z-50 text-left select-none border border-transparent bg-transparent"
            >
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 divide-y divide-white/5 lg:divide-y-0 lg:divide-x lg:divide-white/5">
                {/* Column 1 */}
                <div className="flex flex-col pb-8 lg:pr-8 lg:pb-0 gap-2">
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-lime">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold font-mono text-white">
                    Radar Engine
                  </h4>
                  <p className="text-xs text-gray-500 font-sans leading-relaxed">
                    Scan subreddits, detect purchase intent signals, and score leads using custom Groq LLM configurations.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/pipeline');
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[10px] font-mono text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <Layers className="h-3 w-3 text-lime" />
                      Pipelines
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsProfileOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[10px] font-mono text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <Settings className="h-3 w-3 text-lime" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/analytics');
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[10px] font-mono text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <Terminal className="h-3 w-3 text-lime" />
                      Analytics
                    </button>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-3 pt-8 lg:pt-0 lg:pl-8">
                  <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">
                    Use Cases
                  </h4>
                  {[
                    { name: 'SaaS Intent Leads', desc: 'Find users complaining about tool gaps.' },
                    { name: 'Product Feedback Radar', desc: 'Identify feature requests.' },
                    { name: 'Competitor Mention Alerts', desc: 'Intercept queries about alternatives.' },
                    { name: 'Agency Outbound Pipeline', desc: 'Extract warm target audiences.' },
                  ].map(uc => (
                    <div key={uc.name} className="group cursor-pointer">
                      <div className="text-xs font-mono text-gray-300 group-hover:text-lime transition-colors">
                        {uc.name}
                      </div>
                      <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                        {uc.desc}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Column 3 */}
                <div className="flex flex-col gap-3 pt-8 lg:pt-0 lg:pl-8">
                  <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">
                    System Status
                  </h4>
                  <div className="space-y-2.5 mt-1 text-[10px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Database Connection</span>
                      <span className={health.db ? "text-lime" : "text-red-400"}>
                        {health.db ? "ACTIVE" : "ERROR"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Scheduler Daemon</span>
                      <span className={health.scheduler ? "text-lime" : "text-red-400"}>
                        {health.scheduler ? "RUNNING" : "OFFLINE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">LLM Inference Node</span>
                      <span className={health.groq ? "text-lime" : "text-red-400"}>
                        {health.groq ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Core REST API</span>
                      <span className={health.api ? "text-lime" : "text-red-400"}>
                        {health.api ? "OPERATIONAL" : "OFFLINE"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 4 */}
                <div className="flex flex-col pt-8 lg:pt-0 lg:pl-8">
                  <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold mb-4">
                    Featured Option
                  </h4>
                  <div
                    onClick={() => {
                      setIsMenuOpen(false);
                      setUpgradeModalOpen(true);
                    }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 border border-[#C6FF34]/20 hover:border-[#C6FF34]/40 bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-lime/5 via-transparent to-transparent group-hover:opacity-100" />
                    
                    <div className="relative">
                      <span className="inline-block mb-3 border border-lime/30 bg-lime/10 px-2 py-0.5 rounded text-[8px] font-mono text-lime font-bold uppercase tracking-wider">
                        Premium Tier
                      </span>
                      <h4 className="text-xs font-mono font-bold text-white mb-1.5 group-hover:text-lime transition-colors">
                        Activate SignalRadar Pro
                      </h4>
                      <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                        Unlock 10 subreddits, real-time alerts, unlimited qualified leads, and instant AI draft replies.
                      </p>
                    </div>

                    <div className="mt-4 flex items-center text-[10px] font-mono text-lime">
                      Upgrade now{' '}
                      <ArrowUpRight className="ml-1 w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Live signal marquee ─────────────────────────────────────────────── */}
      <div className="fixed top-[52px] left-0 right-0 z-30">
        <LiveSignalFeed />
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row pt-[88px] pb-0 h-screen overflow-hidden">
        
        {/* Sidebar Navigation & Filters — hidden on mobile, shown on md+ */}
        <div className="hidden md:flex md:flex-col md:h-full md:w-[180px] md:flex-shrink-0">
          <Sidebar
            currentView={sidebarView}
            setView={handleSetView}
            totalLeads={totalLeadsCount}
            savedCount={savedLeadsCount}
            contactedCount={contactedLeadsCount}
            filters={filters}
            availableSubreddits={availableSubreddits}
            togglePriority={togglePriority}
            toggleCategory={toggleCategory}
            toggleSubreddit={toggleSubreddit}
            setIntentRange={setIntentRange}
            setConfidenceRange={setConfidenceRange}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
          />
        </div>

        {/* ── Mobile Bottom Tab Bar — iOS Floating Liquid Glass ── */}
        <div 
          className="md:hidden fixed bottom-4 left-4 right-4 z-50 h-[56px] flex items-center justify-around px-2 bg-[#070708]/70 backdrop-blur-2xl rounded-full border border-white/[0.09] shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] select-none"
        >
          {[
            { id: 'all' as const,       path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
            { id: 'pipeline' as const,  path: '/pipeline',  icon: <Kanban           className="w-5 h-5" />, label: 'Pipeline' },
            { id: 'analytics' as const, path: '/analytics', icon: <BarChart3        className="w-5 h-5" />, label: 'Analytics' },
            { id: 'saved' as const,     path: '/saved',     icon: <Star             className="w-5 h-5" />, label: 'Saved' },
            { id: 'contacted' as const, path: '/contacts',  icon: <PhoneCall        className="w-5 h-5" />, label: 'Contacts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex items-center justify-center flex-1 h-full cursor-pointer outline-none transition-colors relative"
              style={{ minHeight: 44 }}
              aria-label={tab.label}
            >
              <span className={cn(
                'transition-colors duration-150 relative z-10',
                sidebarView === tab.id ? 'text-[#C6FF34]' : 'text-white/30 hover:text-white/50'
              )}>
                {tab.icon}
              </span>
              {sidebarView === tab.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-2 rounded-full bg-white/[0.04] border border-white/[0.05]"
                  transition={{ duration: 0.15 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Main Content Area ──────────────────────────────────────────────── */}
        {currentView === 'analytics' ? (
          <React.Suspense fallback={<AnalyticsLoadingFallback />}>
            <AnalyticsPage
              leads={allLeads}
              loading={loading}
              error={error}
              retryFetch={retryFetch}
              isPro={isPro}
              onUpgrade={() => setUpgradeModalOpen(true)}
            />
          </React.Suspense>
        ) : currentView === 'pipeline' ? (
          <React.Suspense fallback={<PipelineLoadingFallback />}>
            <div className="flex-1 flex flex-col h-full overflow-hidden pb-20 md:pb-0">
              {!isPro && (
                <div className="mx-6 md:mx-8 mt-4 p-3 rounded-xl border border-lime/20 bg-lime/5 text-[#C6FF34] text-xs font-mono flex items-center justify-between gap-4 shrink-0">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 animate-pulse fill-lime/10" />
                    <span>Pipeline Board is in <strong>Read-Only Mode</strong>. Upgrade to Pro to custom-manage opportunity stages.</span>
                  </span>
                  <button 
                    onClick={() => setUpgradeModalOpen(true)}
                    className="px-3 py-1.5 bg-[#C6FF34] text-black font-bold font-mono text-[10px] rounded-lg hover:brightness-110 cursor-pointer transition-all active:scale-[0.98] outline-none"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}
              <PipelineBoard
                leads={filteredLeads}
                loading={loading}
                error={error}
                retryFetch={retryFetch}
                updateLeadStatus={async (postId, status) => {
                  if (!isPro) {
                    setUpgradeModalOpen(true);
                    return;
                  }
                  await updateLeadStatus(postId, status);
                }}
                onOpenDrawer={openDrawer}
              />
            </div>
          </React.Suspense>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-32 md:pb-8 space-y-6">
            
            {/* Dashboard Header */}
            <div className="flex justify-between items-start mb-5">
              <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold text-white tracking-tight capitalize select-none">
                  {currentView === 'dashboard' ? 'Lead Dashboard' : currentView === 'saved' ? 'Bookmarked Leads' : 'Outreach History'}
                </h1>
                <p className="font-body text-xs text-white/30 mt-0.5 select-none">
                  {currentView === 'dashboard' && 'View and filter qualified Reddit leads in real-time'}
                  {currentView === 'saved' && 'Review and draft replies for bookmarked opportunities'}
                  {currentView === 'contacts' && 'Track outreach velocity and history logs'}
                </p>
              </div>

              {!loading && (
                <div className="flex items-center gap-2 select-none">
                  {currentView === 'dashboard' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate('/pipeline')}
                      style={{
                        ...glassStyle,
                        borderRadius: '10px',
                      }}
                      className="px-4 py-2 font-body text-xs text-white/55 hover:text-white hover:border-white/15 transition-all flex items-center gap-2 cursor-pointer outline-none border border-transparent bg-transparent"
                      title="Switch to Pipeline View"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span className="hidden sm:inline">Pipeline View</span>
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExportCSV}
                    disabled={sortedLeads.length === 0}
                    style={{
                      ...glassStyle,
                      borderRadius: '10px',
                    }}
                    className="px-4 py-2 font-body text-xs text-white/55 hover:text-white hover:border-white/15 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer outline-none border border-transparent bg-transparent"
                    title="Export filtered leads to CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export CSV</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setRotateCount(prev => prev + 1);
                      retryFetch();
                    }}
                    style={{
                      ...glassStyle,
                      borderRadius: '10px',
                    }}
                    className="px-4 py-2 font-body text-xs text-white/55 hover:text-white hover:border-white/15 transition-all flex items-center gap-2 cursor-pointer outline-none border border-transparent bg-transparent"
                    title="Refresh Leads"
                  >
                    <motion.div
                      animate={{ rotate: rotateCount * 360 }}
                      transition={{ duration: 0.6, ease: 'easeInOut' }}
                      className="flex items-center justify-center"
                    >
                      <RotateCw className="w-4 h-4" />
                    </motion.div>
                  </motion.button>
                </div>
              )}
            </div>

            {/* Stat Cards Grid */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5"
            >
              <StatCard
                label="Total Leads"
                value={totalLeadsCount}
                icon={<Users className="w-4 h-4" />}
                colorClass="text-white"
              />
              <StatCard
                label="Saved Leads"
                value={savedLeadsCount}
                icon={<Bookmark className="w-4 h-4" />}
                colorClass="text-[#C6FF34]"
              />
              <StatCard
                label="Contacted Leads"
                value={contactedLeadsCount}
                icon={<Phone className="w-4 h-4" />}
                colorClass="text-amber-400"
              />
              <StatCard
                label="Average Intent Score"
                value={avgIntentScore}
                suffix="%"
                icon={<TrendingUp className="w-4 h-4" />}
                colorClass="text-white"
              />
            </motion.div>

            {/* Filter Bar */}
            <div 
              style={{
                ...glassStyle,
                borderRadius: '16px',
              }}
              className="p-4 mb-4 select-none"
            >
              {/* Top Row: Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Type to search..."
                    value={filters.searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/25 border border-white/[0.06] rounded-xl px-10 py-2.5 font-body text-sm text-white placeholder:text-white/20 outline-none w-full focus:border-[#C6FF34]/30 transition-colors duration-200"
                  />
                  <Search className="absolute left-3 w-4 h-4 text-white/25" />
                </div>

                {/* Category Select */}
                <div className="relative">
                  <select
                    value={displayCategory}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="bg-black/25 border border-white/[0.06] rounded-xl px-4 py-2.5 font-body text-sm text-white/60 appearance-none w-full outline-none focus:border-[#C6FF34]/30 transition-colors cursor-pointer"
                  >
                    <option value="all" className="bg-[#0c0c0e]">All Categories</option>
                    <option value="buying_intent" className="bg-[#0c0c0e]">Buying Intent</option>
                    <option value="comparison" className="bg-[#0c0c0e]">Comparison</option>
                    <option value="pain_point" className="bg-[#0c0c0e]">Pain Point</option>
                    <option value="research" className="bg-[#0c0c0e]">Research</option>
                    <option value="uncategorized" className="bg-[#0c0c0e]">Uncategorized</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                </div>

                {/* Subreddit Select */}
                <div className="relative">
                  <select
                    value={displaySubreddit}
                    onChange={(e) => handleSubredditSelect(e.target.value)}
                    className="bg-black/25 border border-white/[0.06] rounded-xl px-4 py-2.5 font-body text-sm text-white/60 appearance-none w-full outline-none focus:border-[#C6FF34]/30 transition-colors cursor-pointer"
                  >
                    <option value="all" className="bg-[#0c0c0e]">All Subreddits</option>
                    {availableSubreddits.map(sub => (
                      <option key={sub} value={sub} className="bg-[#0c0c0e]">r/{sub}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                </div>

                {/* Sort By Select */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-black/25 border border-white/[0.06] rounded-xl px-4 py-2.5 font-body text-sm text-white/60 appearance-none w-full outline-none focus:border-[#C6FF34]/30 transition-colors cursor-pointer"
                  >
                    <option value="date_desc" className="bg-[#0c0c0e]">Date: Newest First</option>
                    <option value="date_asc" className="bg-[#0c0c0e]">Date: Oldest First</option>
                    <option value="intent_desc" className="bg-[#0c0c0e]">Intent Score: Highest</option>
                    <option value="intent_asc" className="bg-[#0c0c0e]">Intent Score: Lowest</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="full-width flex items-center gap-4 mt-3">
                <span className="font-mono text-[10px] text-white/25 tracking-widest shrink-0">
                  INTENT SCORE RANGE
                </span>

                <span className="font-mono text-xs text-[#C6FF34]/65 shrink-0">
                  {filters.intentRange[0]} - {filters.intentRange[1]}
                </span>

                {/* Custom Dual Thumbs Slider */}
                <div className="flex-1 relative h-5 flex items-center select-none">
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
                    className="sidebar-slider absolute w-full appearance-none bg-transparent cursor-pointer pointer-events-none"
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
                    className="sidebar-slider absolute w-full appearance-none bg-transparent cursor-pointer pointer-events-none"
                    style={{ 
                      zIndex: 4,
                      WebkitAppearance: 'none',
                      pointerEvents: 'auto'
                    }}
                  />
                </div>

                <span className="font-mono text-xs text-white/28 shrink-0">
                  Showing <span className="text-white">{sortedLeads.length}</span> of <span className="text-white">{allLeads.length}</span> leads
                </span>

                <button
                  onClick={handleClearFilters}
                  className="font-mono text-xs text-[#C6FF34]/60 hover:text-[#C6FF34] border border-[#C6FF34]/20 hover:border-[#C6FF34]/40 rounded-full px-3 py-1 bg-[#C6FF34]/[0.04] transition-all cursor-pointer shrink-0 outline-none"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* ── Table Container ─────────────────────────────────────────────── */}
            {/* Table Container */}
            <div 
              style={{
                ...glassStyle,
                borderRadius: '16px',
              }}
              className="w-full overflow-x-auto scrollbar-thin"
            >
              {loading ? (
                <div className="p-12">
                  <LoadingState />
                </div>
              ) : error ? (
                <div className="p-12">
                  <ErrorState message={error} onRetry={retryFetch} />
                </div>
              ) : sortedLeads.length === 0 ? (
                <div className="p-12 text-center max-w-md mx-auto my-8 select-none">
                  <span className="text-xl block mb-4">🔍</span>
                  <h3 className="text-base font-semibold mb-1 text-white">No leads found</h3>
                  <p className="text-xs text-white/30 leading-relaxed">
                    Try adjusting your search queries or active filters.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col min-w-[800px]">
                  {/* Table Header Row */}
                  <div className="bg-black/25 border-b border-white/[0.06] flex items-center px-5 py-3 gap-4 select-none min-w-[800px]">
                    <div 
                      onClick={() => {
                        setSortBy(prev => prev === 'date_desc' ? 'date_asc' : 'date_desc');
                      }}
                      className="font-mono text-[10px] text-white/45 tracking-widest uppercase shrink-0 w-36 cursor-pointer hover:text-white/70 transition-colors flex items-center"
                    >
                      CREATED AT
                      {sortBy.startsWith('date') ? (
                        sortBy === 'date_desc' ? (
                          <ChevronDown className="w-3 h-3 text-[#C6FF34] inline ml-1" />
                        ) : (
                          <ChevronUp className="w-3 h-3 text-[#C6FF34] inline ml-1" />
                        )
                      ) : (
                        <ChevronDown className="w-3 h-3 text-white/35 inline ml-1" />
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-white/45 tracking-widest uppercase flex-1 min-w-0">
                      TITLE
                    </div>
                    <div className="font-mono text-[10px] text-white/45 tracking-widest uppercase shrink-0 w-32">
                      SUBREDDIT
                    </div>
                    <div className="font-mono text-[10px] text-white/45 tracking-widest uppercase shrink-0 w-36">
                      CATEGORY
                    </div>
                    <div 
                      onClick={() => {
                        setSortBy(prev => prev === 'intent_desc' ? 'intent_asc' : 'intent_desc');
                      }}
                      className="font-mono text-[10px] text-white/45 tracking-widest uppercase shrink-0 w-32 cursor-pointer hover:text-white/70 transition-colors flex items-center"
                    >
                      INTENT SCORE
                      {sortBy.startsWith('intent') ? (
                        sortBy === 'intent_desc' ? (
                          <ChevronDown className="w-3 h-3 text-[#C6FF34] inline ml-1" />
                        ) : (
                          <ChevronUp className="w-3 h-3 text-[#C6FF34] inline ml-1" />
                        )
                      ) : (
                        <ChevronDown className="w-3 h-3 text-white/35 inline ml-1" />
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-white/45 tracking-widest uppercase shrink-0 w-24 text-right">
                      ACTION
                    </div>
                  </div>

                  {/* Table Rows */}
                  <motion.div 
                    variants={staggerFast}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col divide-y divide-white/[0.04]"
                  >
                    {paginatedLeads.map((lead, index) => {
                      // Subreddit border/text colors mod 4 cycle
                      const borderColors = [
                        'rgba(198,255,52,0.2)',
                        'rgba(232,168,56,0.2)',
                        'rgba(96,165,250,0.2)',
                        'rgba(168,85,247,0.2)'
                      ];
                      const textColors = [
                        'rgba(198,255,52,0.85)',
                        'rgba(232,168,56,0.85)',
                        'rgba(96,165,250,0.85)',
                        'rgba(168,85,247,0.85)'
                      ];
                      const bgColors = [
                        'rgba(198,255,52,0.04)',
                        'rgba(232,168,56,0.04)',
                        'rgba(96,165,250,0.04)',
                        'rgba(168,85,247,0.04)'
                      ];

                      // Category styles map
                      let catClass = 'bg-white/5 border border-white/10 text-white/38';
                      if (lead.category === 'buying_intent') {
                        catClass = 'bg-[#C6FF34]/12 border-[#C6FF34]/22 text-[#C6FF34]/78';
                      } else if (lead.category === 'pain_point') {
                        catClass = 'bg-amber-400/12 border border-amber-400/22 text-amber-400/78';
                      } else if (lead.category === 'comparison') {
                        catClass = 'bg-blue-400/12 border border-blue-400/22 text-blue-400/78';
                      } else if (lead.category === 'research') {
                        catClass = 'bg-purple-400/12 border border-purple-400/22 text-purple-400/78';
                      }

                      return (
                        <motion.div
                          key={lead.post_id}
                          variants={slideFromLeft}
                          onClick={() => openDrawer(lead)}
                          className="flex items-center px-5 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025] transition-colors duration-150 gap-4 cursor-pointer min-w-[800px]"
                        >
                          {/* Created At */}
                          <div className="font-mono text-[11px] text-white/32 shrink-0 w-36 select-none">
                            {formatDateTime(lead.created_at)}
                          </div>

                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-sm text-white/78 truncate" title={lead.title}>
                              {lead.title}
                            </div>
                            <div className="font-body text-xs text-white/28 truncate mt-0.5" title={lead.lead_summary || lead.body}>
                              {lead.lead_summary || lead.body || '—'}
                            </div>
                          </div>

                          {/* Subreddit */}
                          <div className="shrink-0 w-32 select-none">
                            <span 
                              style={{
                                borderColor: borderColors[index % 4],
                                color: textColors[index % 4],
                                backgroundColor: bgColors[index % 4]
                              }}
                              className="font-mono text-[11px] rounded-full px-3 py-1 border"
                            >
                              r/{lead.subreddit}
                            </span>
                          </div>

                          {/* Category */}
                          <div className="shrink-0 w-36 select-none">
                            <span className={cn("rounded-full px-3 py-1 font-mono text-[10px] font-medium border", catClass)}>
                              {getCategoryLabel(lead.category)}
                            </span>
                          </div>

                          {/* Intent Score */}
                          <IntentScoreCell score={lead.intent_score} />

                          {/* Action Details Button */}
                          <div className="shrink-0 w-24 flex justify-end select-none">
                            <motion.button
                              whileTap={{ scale: 0.94 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDrawer(lead);
                              }}
                              style={{
                                ...glassStyle,
                                borderRadius: '10px',
                              }}
                              className="px-4 py-1.5 font-body text-xs text-white/52 hover:border-[#C6FF34]/28 hover:text-[#C6FF34]/78 hover:bg-[#C6FF34]/[0.04] transition-all duration-200 cursor-pointer outline-none border border-transparent bg-transparent"
                            >
                              Details
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {/* Pagination Row */}
                  {totalPages > 1 && (
                    <div className="px-5 py-4 border-t border-white/[0.06] flex justify-between items-center select-none">
                      <span className="font-mono text-xs text-white/28">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          style={{
                            ...glassStyle,
                            borderRadius: '8px',
                          }}
                          className={cn(
                            "px-3 py-1.5 font-body text-xs text-white/38 hover:text-white hover:border-white/18 transition-all cursor-pointer outline-none border border-transparent bg-transparent flex items-center justify-center",
                            currentPage === 1 && "opacity-30 cursor-not-allowed pointer-events-none"
                          )}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          style={{
                            ...glassStyle,
                            borderRadius: '8px',
                          }}
                          className={cn(
                            "px-3 py-1.5 font-body text-xs text-white/38 hover:text-white hover:border-white/18 transition-all cursor-pointer outline-none border border-transparent bg-transparent flex items-center justify-center",
                            currentPage === totalPages && "opacity-30 cursor-not-allowed pointer-events-none"
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
          user={user}
        />
      </React.Suspense>

      <ToastContainer />

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        targetPlan="pro"
        currentPlan={subscription?.plan || 'free'}
        onConfirm={async () => {
          await upgradePlan('pro');
        }}
      />

      {user && (
        <ProfileDrawer
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onLogout={onLogout}
          isPro={isPro}
          onUpgrade={() => {
            setIsProfileOpen(false);
            setUpgradeModalOpen(true);
          }}
        />
      )}
      </div>
    </div>
  );
}



export default DashboardPage;
