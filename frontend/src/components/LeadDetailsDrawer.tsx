import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink, Copy, Check, Star, PhoneCall,
  Zap, Target, MessageSquare, Tag, FileText, Brain,
  AlertTriangle, ChevronRight, Loader2, Save,
  Mail, RotateCw, Send, Bookmark, CheckCircle
} from 'lucide-react';
import { Lead, LeadDetail, QualificationReason } from '../types/lead';
import { User } from '@supabase/supabase-js';
import { useLeadDetail } from '../hooks/useLeadDetail';
import { useOutreachGenerator, OutreachChannel } from '../hooks/useOutreachGenerator';
import { cn } from '../lib/utils';
import { glassStyle } from '../lib/glass';
import { fadeUp, stagger } from '../lib/animations';

// ─── Timeline Types & Serialization Helpers ─────────────────────────────────

export interface TimelineEvent {
  timestamp: string; // ISO string
  type: 'collected' | 'saved' | 'unsaved' | 'contacted' | 'notes_updated' | 'reddit_reply' | 'linkedin_msg' | 'email_msg';
  text: string;
}

function parseNotesAndTimeline(rawNotes: string): { userNotes: string; timeline: TimelineEvent[] } {
  if (!rawNotes) return { userNotes: '', timeline: [] };
  
  const markerStart = '===TIMELINE===';
  const markerEnd = '===END_TIMELINE===';
  
  const startIndex = rawNotes.indexOf(markerStart);
  const endIndex = rawNotes.indexOf(markerEnd);
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const userNotes = rawNotes.slice(0, startIndex).trim();
    const timelineJson = rawNotes.slice(startIndex + markerStart.length, endIndex).trim();
    try {
      const timeline = JSON.parse(timelineJson);
      if (Array.isArray(timeline)) {
        return { userNotes, timeline };
      }
    } catch (e) {
      console.error('Failed to parse timeline from notes:', e);
    }
  }
  
  return { userNotes: rawNotes.trim(), timeline: [] };
}

function serializeNotesAndTimeline(userNotes: string, timeline: TimelineEvent[]): string {
  const markerStart = '===TIMELINE===';
  const markerEnd = '===END_TIMELINE===';
  return `${userNotes.trim()}\n\n${markerStart}\n${JSON.stringify(timeline)}\n${markerEnd}`;
}

const getCachedTimeline = (postId: string): TimelineEvent[] => {
  try {
    const cached = localStorage.getItem(`signalradar_timeline_${postId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to get cached timeline:', e);
  }
  return [];
};

const setCachedTimeline = (postId: string, timeline: TimelineEvent[]) => {
  try {
    localStorage.setItem(`signalradar_timeline_${postId}`, JSON.stringify(timeline));
  } catch (e) {
    console.error('Failed to set cached timeline:', e);
  }
};

const mergeTimelines = (a: TimelineEvent[], b: TimelineEvent[]): TimelineEvent[] => {
  const seen = new Set<string>();
  const merged: TimelineEvent[] = [];
  
  const getEventKey = (ev: TimelineEvent) => `${ev.type}_${new Date(ev.timestamp).getTime()}`;

  [...a, ...b].forEach(ev => {
    const key = getEventKey(ev);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(ev);
    }
  });

  return merged.sort((x, y) => new Date(x.timestamp).getTime() - new Date(y.timestamp).getTime());
};

const getTimelineEventConfig = (type: TimelineEvent['type']) => {
  switch (type) {
    case 'collected':
      return {
        icon: <div className="text-[10px] leading-none">🟢</div>,
        text: 'Lead collected',
      };
    case 'saved':
      return {
        icon: <span className="text-yellow-400 text-xs leading-none">⭐</span>,
        text: 'Saved',
      };
    case 'unsaved':
      return {
        icon: <span className="text-gray-500 text-xs leading-none">☆</span>,
        text: 'Unsaved',
      };
    case 'contacted':
      return {
        icon: <span className="text-cyan-400 text-[10px] leading-none">📧</span>,
        text: 'Marked contacted',
      };
    case 'notes_updated':
      return {
        icon: <span className="text-amberAccent text-[10px] leading-none">📝</span>,
        text: 'Note updated',
      };
    case 'reddit_reply':
      return {
        icon: <span className="text-lime text-[10px] leading-none">💬</span>,
        text: 'Reddit reply generated',
      };
    case 'linkedin_msg':
      return {
        icon: <span className="text-blue-400 text-[10px] leading-none">🔗</span>,
        text: 'LinkedIn message generated',
      };
    case 'email_msg':
      return {
        icon: <span className="text-purple-400 text-[10px] leading-none">✉️</span>,
        text: 'Cold email generated',
      };
    default:
      return {
        icon: <span className="text-gray-400 text-[10px] leading-none">ℹ️</span>,
        text: 'Activity recorded',
      };
  }
};

interface LeadDetailsDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  isContacted: boolean;
  onToggleSave: () => void;
  onToggleContacted: () => void;
  onUpdateNotes: (notes: string) => Promise<void>;
  user?: User | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const categoryConfig = {
  buying_intent: { label: 'Buying Intent', color: 'text-lime bg-lime/10 border-lime/30' },
  comparison:    { label: 'Comparison',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  pain_point:    { label: 'Pain Point',    color: 'text-amberAccent bg-amberAccent/10 border-amberAccent/30' },
  research:      { label: 'Research',      color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  uncategorized: { label: 'Uncategorized', color: 'text-gray-400 bg-white/5 border-white/10' },
};

const priorityConfig = {
  high:   { label: 'High',   color: 'text-lime   bg-lime/10   border-lime/40' },
  medium: { label: 'Medium', color: 'text-amberAccent bg-amberAccent/10 border-amberAccent/40' },
  low:    { label: 'Low',    color: 'text-gray-400 bg-white/5 border-white/10' },
};

const actionConfig: Record<string, { label: string; color: string }> = {
  reply_immediately: { label: 'Reply Immediately', color: 'text-lime bg-lime/10 border-lime/40' },
  monitor:           { label: 'Monitor',           color: 'text-amberAccent bg-amberAccent/10 border-amberAccent/40' },
  ignore:            { label: 'Ignore',            color: 'text-gray-400 bg-white/5 border-white/10' },
};

const qualSignalConfig: Record<QualificationReason, { label: string; icon: string; color: string }> = {
  recommendation_request: { label: 'Recommendation Request', icon: '💬', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  comparison_signal:      { label: 'Comparison Signal',      icon: '⚖️', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  pricing_signal:         { label: 'Pricing Signal',         icon: '💰', color: 'text-amberAccent bg-amberAccent/10 border-amberAccent/30' },
  migration_signal:       { label: 'Migration Signal',       icon: '🔄', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' },
  problem_signal:         { label: 'Problem Signal',         icon: '⚠️', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  tool_search:            { label: 'Tool Search',            icon: '🔍', color: 'text-lime bg-lime/10 border-lime/30' },
};

function formatTime(iso: string) {
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-lime/70">{icon}</span>
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-lime/70">
        {label}
      </span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#C6FF34' : score >= 60 ? '#FFB347' : '#555';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" className="rotate-[-90deg]">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <span
        className="absolute font-mono font-bold text-lg"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-3 bg-white/5 rounded w-1/3" />
        <div className="h-5 bg-white/8 rounded w-4/5" />
        <div className="flex gap-2">
          <div className="h-5 bg-white/5 rounded-full w-20" />
          <div className="h-5 bg-white/5 rounded-full w-16" />
          <div className="h-5 bg-white/5 rounded-full w-14" />
        </div>
      </div>
      <div className="h-px bg-white/5" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-lime/10 rounded w-1/4" />
          <div className="h-16 bg-white/4 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── Hover Glass Card Component ──────────────────────────────────────────────

interface HoverGlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

function HoverGlassCard({ children, className, glowColor = 'rgba(198,255,52,0.06)' }: HoverGlassCardProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
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
        background: hovered
          ? `radial-gradient(circle 180px at ${pos.x}px ${pos.y}px, ${glowColor} 0%, rgba(255,255,255,0.015) 70%)`
          : 'rgba(255, 255, 255, 0.015)',
        borderColor: hovered ? 'rgba(198,255,52,0.12)' : 'rgba(255, 255, 255, 0.05)',
        transition: 'border-color 0.3s ease, background 0.08s ease-out',
      }}
      className={cn("p-5 border transition-all duration-300", className)}
    >
      {children}
    </motion.div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function LeadDetailsDrawer({
  lead,
  isOpen,
  onClose,
  isSaved,
  isContacted,
  onToggleSave,
  onToggleContacted,
  onUpdateNotes,
  user,
}: LeadDetailsDrawerProps) {
  const { detail, loading, error, fetchDetail, clearDetail, updateLocalNotes } = useLeadDetail();
  const {
    activeChannel,
    setActiveChannel,
    messages,
    loading: outreachLoading,
    error: outreachError,
    generateMessage,
    reset: resetOutreach,
  } = useOutreachGenerator();
  
  const [copied, setCopied] = useState(false);
  const [copiedChannel, setCopiedChannel] = useState<OutreachChannel | null>(null);
  const [notesText, setNotesText] = useState('');
  const [notesSavedStatus, setNotesSavedStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch full detail when drawer opens
  useEffect(() => {
    if (isOpen && lead?.post_id) {
      fetchDetail(lead.post_id);
    }
    if (!isOpen) {
      clearDetail();
      resetOutreach();
    }
  }, [isOpen, lead?.post_id, resetOutreach]);

  useEffect(() => {
    resetOutreach();
  }, [lead?.post_id, resetOutreach]);

  // Initial timeline load, merging localStorage cache and DB parsed notes
  useEffect(() => {
    const rawNotes = detail?.notes ?? lead?.notes ?? '';
    const { userNotes, timeline: parsedTimeline } = parseNotesAndTimeline(rawNotes);
    setNotesText(userNotes);
    setNotesSavedStatus('idle');

    if (lead?.post_id && isOpen) {
      const localTimeline = getCachedTimeline(lead.post_id);
      const merged = mergeTimelines(parsedTimeline, localTimeline);
      if (merged.length === 0) {
        merged.push({
          timestamp: lead.created_at || new Date().toISOString(),
          type: 'collected',
          text: 'Lead collected',
        });
      }
      setTimeline(merged);
      setCachedTimeline(lead.post_id, merged);
    }
  }, [detail, lead, isOpen]);

  const originalNotes = useMemo(() => {
    const raw = detail?.notes ?? lead?.notes ?? '';
    return parseNotesAndTimeline(raw).userNotes;
  }, [detail?.notes, lead?.notes]);
  
  const isNotesChanged = notesText !== originalNotes;

  const handleSaveNotes = async () => {
    if (!lead?.post_id || notesSavedStatus === 'saving') return;
    if (!isNotesChanged) return;

    setNotesSavedStatus('saving');
    try {
      const newEvent: TimelineEvent = {
        timestamp: new Date().toISOString(),
        type: 'notes_updated',
        text: 'Note updated',
      };
      const updatedTimeline = mergeTimelines(timeline, [newEvent]);
      const finalNotes = serializeNotesAndTimeline(notesText, updatedTimeline);
      
      await onUpdateNotes(finalNotes);
      updateLocalNotes(finalNotes);
      setTimeline(updatedTimeline);
      setCachedTimeline(lead.post_id, updatedTimeline);
      
      setNotesSavedStatus('saved');
      setTimeout(() => {
        setNotesSavedStatus('idle');
      }, 2500);
    } catch (err) {
      console.error(err);
      setNotesSavedStatus('error');
    }
  };

  const handleToggleSave = async () => {
    onToggleSave();
    const nextSaved = !isSaved;
    const type = nextSaved ? 'saved' : 'unsaved';
    const text = nextSaved ? 'Saved' : 'Unsaved';
    
    const newEvent: TimelineEvent = {
      timestamp: new Date().toISOString(),
      type,
      text,
    };
    const updatedTimeline = mergeTimelines(timeline, [newEvent]);
    setTimeline(updatedTimeline);
    if (lead?.post_id) {
      setCachedTimeline(lead.post_id, updatedTimeline);
      const finalNotes = serializeNotesAndTimeline(notesText, updatedTimeline);
      try {
        await onUpdateNotes(finalNotes);
        updateLocalNotes(finalNotes);
      } catch (e) {
        console.error('Failed to sync save event to Supabase notes:', e);
      }
    }
  };

  const handleToggleContacted = async () => {
    onToggleContacted();
    const nextContacted = !isContacted;
    const type = nextContacted ? 'contacted' : 'unsaved';
    const text = nextContacted ? 'Marked contacted' : 'Unmarked contacted';
    
    const newEvent: TimelineEvent = {
      timestamp: new Date().toISOString(),
      type,
      text,
    };
    const updatedTimeline = mergeTimelines(timeline, [newEvent]);
    setTimeline(updatedTimeline);
    if (lead?.post_id) {
      setCachedTimeline(lead.post_id, updatedTimeline);
      const finalNotes = serializeNotesAndTimeline(notesText, updatedTimeline);
      try {
        await onUpdateNotes(finalNotes);
        updateLocalNotes(finalNotes);
      } catch (e) {
        console.error('Failed to sync contacted event to Supabase notes:', e);
      }
    }
  };

  const prevMessagesRef = useRef<Record<OutreachChannel, string>>({ reddit: '', linkedin: '', email: '' });
  
  useEffect(() => {
    if (!lead?.post_id || !isOpen) return;
    
    let updated = false;
    const newEvents: TimelineEvent[] = [];
    
    (['reddit', 'linkedin', 'email'] as OutreachChannel[]).forEach(chan => {
      const current = messages[chan];
      const prev = prevMessagesRef.current[chan];
      
      if (current && current !== prev) {
        let type: TimelineEvent['type'] = 'reddit_reply';
        let text = '';
        if (chan === 'reddit') {
          type = 'reddit_reply';
          text = 'Reddit reply generated';
        } else if (chan === 'linkedin') {
          type = 'linkedin_msg';
          text = 'LinkedIn message generated';
        } else {
          type = 'email_msg';
          text = 'Cold email generated';
        }
        
        const nowMs = Date.now();
        const isDuplicate = timeline.some(ev => 
          ev.type === type && 
          (nowMs - new Date(ev.timestamp).getTime()) < 5000
        );
        
        if (!isDuplicate) {
          newEvents.push({
            timestamp: new Date().toISOString(),
            type,
            text,
          });
          updated = true;
        }
      }
    });
    
    if (updated && newEvents.length > 0) {
      const updatedTimeline = mergeTimelines(timeline, newEvents);
      setTimeline(updatedTimeline);
      setCachedTimeline(lead.post_id, updatedTimeline);
      const finalNotes = serializeNotesAndTimeline(notesText, updatedTimeline);
      onUpdateNotes(finalNotes).then(() => {
        updateLocalNotes(finalNotes);
      }).catch(e => {
        console.error('Failed to sync outreach generation event:', e);
      });
    }
    
    prevMessagesRef.current = { ...messages };
  }, [messages, lead?.post_id, isOpen, timeline, notesText, onUpdateNotes, updateLocalNotes]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleCopyReply = async () => {
    const text = detail?.draft_reply || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const d = detail;
  const catCfg = categoryConfig[d?.category ?? 'research'] ?? categoryConfig.research;
  const priCfg = priorityConfig[d?.priority ?? 'low'] ?? priorityConfig.low;
  const actRaw = (d?.recommended_action ?? '').toLowerCase().replace(/\s+/g, '_');
  const actCfg = actionConfig[actRaw] ?? { label: d?.recommended_action ?? '—', color: 'text-gray-400 bg-white/5 border-white/10' };
  const confidencePct = d ? Math.round((d.confidence <= 1 ? d.confidence * 100 : d.confidence)) : 0;

  // Intent score badge color
  let scoreColorClass = 'text-white/50';
  if (d && d.intent_score > 70) {
    scoreColorClass = 'text-[#C6FF34]';
  } else if (d && d.intent_score >= 50) {
    scoreColorClass = 'text-amber-400';
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            key="drawer"
            ref={drawerRef}
            variants={{
              hidden: isMobile ? { y: '100%' } : { x: '100%' },
              visible: { 
                x: 0, 
                y: 0,
                transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
              },
              exit: isMobile ? { y: '100%' } : { x: '100%' }
            }}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={cn(
              'fixed z-50 flex flex-col overflow-y-auto md:overflow-hidden',
              'inset-x-0 bottom-0 rounded-t-3xl border-t border-white/[0.08] max-h-[88vh]',
              'md:inset-y-0 md:left-auto md:right-0 md:bottom-auto md:h-full md:w-full md:max-w-xl md:rounded-none md:border-t-0 md:border-l md:max-h-none'
            )}
            style={{
              background: 'rgba(7, 7, 8, 0.95)',
              borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
              borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: '-24px 0 80px rgba(0, 0, 0, 0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            {isMobile && (
              <div className="flex-shrink-0 flex justify-center pt-4 pb-2 select-none">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
            )}

            {/* Drawer Header */}
            <div className="shrink-0 border-b border-white/[0.06] px-6 py-5 space-y-3 relative select-none">
              {/* Top row: Subreddit name and Close Button */}
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-[#C6FF34]/75 font-medium tracking-wide">
                  r/{lead?.subreddit}
                </span>
                
                {/* Close Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  style={{
                    ...glassStyle,
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                  }}
                  className="flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all border border-transparent bg-transparent outline-none cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              {/* Title & Score Row */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <h2 className="font-body font-semibold text-white text-base leading-snug pr-2">
                    {lead?.title}
                  </h2>
                  <span className="text-[10px] text-white/35 font-mono">
                    • {lead?.created_at ? formatTime(lead.created_at) : ''}
                  </span>
                </div>
                
                {d && !loading && (
                  <div className="flex flex-col items-end shrink-0 select-none">
                    <span className="font-mono text-[9px] text-white/35 uppercase tracking-widest block mb-0.5">
                      INTENT
                    </span>
                    <span className={cn("font-mono text-3xl font-bold leading-none", scoreColorClass)}>
                      {d.intent_score}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 pb-28 md:pb-24">
              {loading && <DrawerSkeleton />}

              {error && !loading && (
                <div className="p-8 flex flex-col items-center gap-3 text-center">
                  <AlertTriangle className="w-8 h-8 text-amberAccent" />
                  <p className="text-sm text-gray-400">{error}</p>
                  <button
                    onClick={() => lead?.post_id && fetchDetail(lead.post_id)}
                    className="text-xs font-mono text-lime hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {d && !loading && (
                <>
                  {/* Post Details Card */}
                  <HoverGlassCard glowColor="rgba(198,255,52,0.06)">
                    <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase mb-3 block select-none">
                      POST DETAILS
                    </span>
                    
                    <motion.div 
                      variants={stagger} 
                      initial="hidden" 
                      animate="visible" 
                      className="space-y-2.5"
                    >
                      {/* Row 1: Subreddit */}
                      <motion.div variants={fadeUp} className="flex justify-between items-center py-0.5">
                        <span className="font-mono text-[10px] text-white/45 uppercase tracking-widest select-none">
                          Subreddit
                        </span>
                        <span className="font-mono text-xs text-[#C6FF34]/75">
                          r/{lead?.subreddit}
                        </span>
                      </motion.div>

                      {/* Row 2: Category */}
                      <motion.div variants={fadeUp} className="flex justify-between items-center py-0.5">
                        <span className="font-mono text-[10px] text-white/45 uppercase tracking-widest select-none">
                          Category
                        </span>
                        <span className={cn('text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider select-none', catCfg.color)}>
                          {catCfg.label}
                        </span>
                      </motion.div>

                      {/* Row 3: Date */}
                      <motion.div variants={fadeUp} className="flex justify-between items-center py-0.5">
                        <span className="font-mono text-[10px] text-white/45 uppercase tracking-widest select-none">
                          Created At
                        </span>
                        <span className="font-mono text-xs text-white/80">
                          {lead?.created_at ? formatTime(lead.created_at) : '—'}
                        </span>
                      </motion.div>

                      {/* Row 4: Priority */}
                      <motion.div variants={fadeUp} className="flex justify-between items-center py-0.5">
                        <span className="font-mono text-[10px] text-white/45 uppercase tracking-widest select-none">
                          Priority
                        </span>
                        <div className="flex items-center gap-1.5 select-none">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0", 
                            lead?.priority === 'high' ? 'bg-[#C6FF34]' : lead?.priority === 'medium' ? 'bg-amber-400' : 'bg-white/28'
                          )} />
                          <span className={cn('text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', priCfg.color)}>
                            {priCfg.label}
                          </span>
                        </div>
                      </motion.div>
                    </motion.div>
                  </HoverGlassCard>

                  {/* Signal Analysis */}
                  {d.reason && (
                    <HoverGlassCard glowColor="rgba(251,191,36,0.06)">
                      <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase mb-3 block select-none">
                        SIGNAL ANALYSIS
                      </span>
                      <p className="font-body text-sm text-white/80 leading-relaxed">
                        {d.reason}
                      </p>
                    </HoverGlassCard>
                  )}

                  {/* Lead Summary */}
                  {d.lead_summary && (
                    <HoverGlassCard glowColor="rgba(198,255,52,0.06)">
                      <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase mb-3 block select-none">
                        LEAD SUMMARY
                      </span>
                      <p className="font-body text-sm text-white/80 leading-relaxed">
                        {d.lead_summary}
                      </p>
                    </HoverGlassCard>
                  )}

                  {/* Suggested Action */}
                  {d.recommended_action && (
                    <HoverGlassCard glowColor="rgba(198,255,52,0.06)">
                      <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase mb-3 block select-none">
                        SUGGESTED ACTION
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider select-none',
                        actCfg.color
                      )}>
                        <ChevronRight className="w-3 h-3" />
                        {actCfg.label}
                      </span>
                    </HoverGlassCard>
                  )}

                  {/* Suggested Reply / Draft Reply */}
                  {d.draft_reply && (
                    <HoverGlassCard glowColor="rgba(198,255,52,0.06)">
                      <div className="flex items-center justify-between mb-3 select-none">
                        <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase block">
                          DRAFT REPLY
                        </span>
                        <button
                          onClick={handleCopyReply}
                          className={cn(
                            'flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest transition-colors outline-none bg-transparent border-none cursor-pointer',
                            copied ? 'text-[#C6FF34]' : 'text-white/35 hover:text-[#C6FF34]'
                          )}
                        >
                          <AnimatePresence mode="wait">
                            {copied ? (
                              <motion.span
                                key="check"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="text-[#C6FF34] flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 mr-1" />
                              </motion.span>
                            ) : (
                              <motion.span
                                key="copy"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="flex items-center justify-center"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="bg-black/50 border border-white/[0.05] rounded-xl px-4 py-3 font-mono text-xs text-[#C6FF34]/75 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {d.draft_reply}
                      </div>
                    </HoverGlassCard>
                  )}

                  {/* AI Outreach Hub */}
                  <HoverGlassCard glowColor="rgba(198,255,52,0.06)" className="space-y-3">
                    <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase block select-none">
                      AI OUTREACH HUB
                    </span>
                    
                    {/* Tabs */}
                    <div className="flex border border-white/5 bg-[#070708]/60 p-1 rounded-xl select-none">
                      {(['reddit', 'linkedin', 'email'] as OutreachChannel[]).map((chan) => (
                        <button
                          key={chan}
                          onClick={() => setActiveChannel(chan)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono rounded-lg transition-all capitalize cursor-pointer border border-transparent bg-transparent outline-none",
                            activeChannel === chan
                              ? "bg-[#C6FF34] text-black font-bold shadow-[0_0_6px_rgba(198,255,52,0.2)]"
                              : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
                          )}
                        >
                          {chan === 'reddit' && <MessageSquare className="w-3.5 h-3.5" />}
                          {chan === 'linkedin' && <Send className="w-3.5 h-3.5" />}
                          {chan === 'email' && <Mail className="w-3.5 h-3.5" />}
                          {chan === 'email' ? 'Cold Email' : chan}
                        </button>
                      ))}
                    </div>

                    {/* Output Panel */}
                    <div className="relative bg-black/50 border border-white/[0.05] rounded-xl p-4 min-h-[160px] flex flex-col justify-between">
                      {outreachLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-3 select-none">
                          <Loader2 className="w-6 h-6 text-[#C6FF34] animate-spin" />
                          <span className="text-xs font-mono text-gray-400">Drafting outreach message...</span>
                        </div>
                      ) : outreachError ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-4 space-y-3">
                          <AlertTriangle className="w-6 h-6 text-amber-400" />
                          <p className="text-xs text-red-400 max-w-xs">{outreachError}</p>
                          <button
                            onClick={() => {
                              if (lead && d) {
                                generateMessage(activeChannel, {
                                  post_id: lead.post_id,
                                  title: lead.title,
                                  body: d.body || '',
                                  subreddit: lead.subreddit,
                                  category: d.category,
                                  intent_score: d.intent_score,
                                  lead_summary: d.lead_summary,
                                  notes: notesText
                                }, user?.id);
                              }
                            }}
                            className="px-3 py-1.5 text-[10px] font-mono text-[#C6FF34] border border-[#C6FF34]/30 bg-[#C6FF34]/5 hover:bg-[#C6FF34]/15 rounded-lg transition-all cursor-pointer outline-none"
                          >
                            Retry Generation
                          </button>
                        </div>
                      ) : messages[activeChannel] ? (
                        <div className="space-y-3 flex-1 flex flex-col justify-between">
                          <div className="text-xs font-sans text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-1">
                            {messages[activeChannel]}
                          </div>
                          
                          <div className="flex gap-2 justify-end pt-2 border-t border-white/5 select-none">
                            {/* Copy Tab text */}
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(messages[activeChannel]);
                                  setCopiedChannel(activeChannel);
                                  setTimeout(() => setCopiedChannel(null), 2000);
                                } catch (err) {}
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer outline-none",
                                copiedChannel === activeChannel
                                  ? "border-[#C6FF34]/40 bg-[#C6FF34]/10 text-[#C6FF34]"
                                  : "border-white/8 hover:border-[#C6FF34]/30 hover:text-[#C6FF34] text-gray-400"
                              )}
                            >
                              {copiedChannel === activeChannel ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedChannel === activeChannel ? 'Copied' : 'Copy'}
                            </button>

                            {/* Regenerate Tab text */}
                            <button
                              onClick={() => {
                                if (lead && d) {
                                  generateMessage(activeChannel, {
                                    post_id: lead.post_id,
                                    title: lead.title,
                                    body: d.body || '',
                                    subreddit: lead.subreddit,
                                    category: d.category,
                                    intent_score: d.intent_score,
                                    lead_summary: d.lead_summary,
                                    notes: notesText
                                  }, user?.id);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 hover:border-[#C6FF34]/30 hover:text-[#C6FF34] text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-colors cursor-pointer outline-none bg-transparent"
                            >
                              <RotateCw className="w-3 h-3" />
                              Regenerate
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-3">
                          <span className="text-[10px] font-mono text-gray-500 italic select-none">
                            No draft generated for {activeChannel === 'email' ? 'cold email' : activeChannel}.
                          </span>
                          <button
                            onClick={() => {
                              if (lead && d) {
                                generateMessage(activeChannel, {
                                  post_id: lead.post_id,
                                  title: lead.title,
                                  body: d.body || '',
                                  subreddit: lead.subreddit,
                                  category: d.category,
                                  intent_score: d.intent_score,
                                  lead_summary: d.lead_summary,
                                  notes: notesText
                                }, user?.id);
                              }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-[#C6FF34] border border-[#C6FF34]/20 bg-[#C6FF34]/5 hover:bg-[#C6FF34]/15 hover:border-[#C6FF34]/30 rounded-xl transition-all cursor-pointer outline-none"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            Generate {activeChannel === 'email' ? 'Cold Email' : activeChannel === 'reddit' ? 'Reddit Reply' : 'LinkedIn Message'}
                          </button>
                        </div>
                      )}
                    </div>
                  </HoverGlassCard>

                  {/* Lead Notes */}
                  <HoverGlassCard glowColor="rgba(198,255,52,0.06)" className="space-y-2">
                    <div className="flex justify-between items-center select-none">
                      <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase block">
                        LEAD NOTES
                      </span>
                      
                      <AnimatePresence mode="wait">
                        {notesSavedStatus === 'saving' && (
                          <motion.span
                            key="saving"
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] font-mono text-[#C6FF34]/70 flex items-center gap-1"
                          >
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                          </motion.span>
                        )}
                        {notesSavedStatus === 'saved' && (
                          <motion.span
                            key="saved"
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold"
                          >
                            <Check className="w-3 h-3" />
                            Saved!
                          </motion.span>
                        )}
                        {notesSavedStatus === 'error' && (
                          <motion.span
                            key="error"
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] font-mono text-red-400 flex items-center gap-1 font-semibold"
                          >
                            Error saving
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        onBlur={handleSaveNotes}
                        placeholder="Add notes about this lead (e.g. outreach angle, custom pitch ideas)..."
                        className="w-full h-24 px-3.5 py-2.5 text-xs bg-black/50 border border-white/10 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#C6FF34]/50 focus:ring-1 focus:ring-[#C6FF34]/30 transition-all font-sans resize-none"
                      />
                      <div className="flex justify-between items-center select-none">
                        <span className="text-[9px] font-mono text-white/35">
                          Autosaves on blur
                        </span>
                        {isNotesChanged && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={handleSaveNotes}
                            disabled={notesSavedStatus === 'saving'}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C6FF34]/20 bg-[#C6FF34]/5 hover:bg-[#C6FF34]/15 hover:border-[#C6FF34]/30 text-[10px] font-mono text-[#C6FF34] uppercase tracking-wider transition-colors cursor-pointer outline-none"
                          >
                            <Save className="w-3 h-3" />
                            Save Notes
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </HoverGlassCard>

                  {/* Activity Timeline */}
                  <HoverGlassCard glowColor="rgba(198,255,52,0.06)" className="space-y-3">
                    <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase block select-none">
                      ACTIVITY TIMELINE
                    </span>
                    
                    {timeline.length === 0 ? (
                      <div className="text-center py-4 text-xs text-white/20 font-mono italic select-none">
                        No activity yet.
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-4 py-2">
                        {/* Connecting Line */}
                        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-white/5" />
                        
                        {timeline.map((event, idx) => {
                          const config = getTimelineEventConfig(event.type);
                          const timeStr = (() => {
                            try {
                              const d = new Date(event.timestamp);
                              return d.toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              });
                            } catch {
                              return '—';
                            }
                          })();
                          
                          return (
                            <div key={idx} className="relative flex flex-col gap-1">
                              {/* Event Bullet */}
                              <div className="absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#070708] border border-white/5 shadow-sm">
                                {config.icon}
                              </div>
                              
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-white/35 leading-none select-none">
                                  {timeStr}
                                </span>
                                <span className="text-xs font-sans text-gray-200 font-medium mt-0.5">
                                  {event.text || config.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </HoverGlassCard>

                  {/* Keywords */}
                  {d.keywords && d.keywords.length > 0 && (
                    <HoverGlassCard glowColor="rgba(198,255,52,0.06)">
                      <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase mb-3 block select-none">
                        KEYWORDS
                      </span>
                      <div className="flex flex-wrap gap-1.5 select-none">
                        {d.keywords.map((kw, i) => (
                          <span
                            key={`${kw}-${i}`}
                            className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-white/8 hover:border-[#C6FF34]/20 hover:text-[#C6FF34] text-gray-300 transition-colors"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </HoverGlassCard>
                  )}

                  {/* Original Reddit Post */}
                  <HoverGlassCard glowColor="rgba(198,255,52,0.06)">
                    <span className="font-mono text-[10px] text-white/45 tracking-widest uppercase mb-3 block select-none">
                      ORIGINAL REDDIT POST
                    </span>
                    <div className="bg-black/50 border border-white/[0.05] rounded-xl p-4 max-h-52 overflow-y-auto">
                      {d.body ? (
                        <p className="text-sm text-white/80 leading-relaxed font-sans whitespace-pre-wrap select-text">
                          {d.body}
                        </p>
                      ) : (
                        <p className="text-xs text-white/20 italic select-none">No post body available.</p>
                      )}
                    </div>
                  </HoverGlassCard>

                  {/* Processed time */}
                  {d.processed_at && (
                    <p className="text-[10px] font-mono text-white/35 text-center select-none">
                      Indexed {formatTime(d.processed_at)}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="shrink-0 border-t border-white/[0.06] px-6 py-4 bg-[#070708]/90 backdrop-blur-xl z-10 select-none">
              <div className={cn(
                "grid grid-cols-2 gap-2 w-full",
                "md:flex md:items-center md:gap-2 md:w-auto"
              )}>
                {/* Open Post */}
                <motion.a
                  href={lead?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.94 }}
                  style={{
                    ...glassStyle,
                    borderRadius: '10px',
                  }}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 font-body text-xs text-white/55 hover:text-white hover:border-white/15 transition-all outline-none border border-transparent bg-transparent cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Post
                </motion.a>

                {/* Copy Reply */}
                <motion.button
                  onClick={handleCopyReply}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    ...glassStyle,
                    borderRadius: '10px',
                  }}
                  className={cn(
                    'flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 font-body text-xs transition-all outline-none border border-transparent bg-transparent cursor-pointer',
                    copied
                      ? 'border-[#C6FF34]/40 bg-[#C6FF34]/10 text-[#C6FF34] hover:text-[#C6FF34] hover:border-[#C6FF34]/40'
                      : 'text-white/55 hover:text-white hover:border-white/15'
                  )}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="text-[#C6FF34] flex items-center justify-center"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex items-center justify-center"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {copied ? 'Copied' : 'Copy Reply'}
                </motion.button>

                {/* Mark Contacted */}
                <motion.button
                  onClick={handleToggleContacted}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    ...glassStyle,
                    borderRadius: '10px',
                  }}
                  className={cn(
                    'flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 font-body text-xs transition-all outline-none border border-transparent bg-transparent cursor-pointer',
                    isContacted
                      ? 'border-[#C6FF34]/25 text-[#C6FF34] bg-[#C6FF34]/5 hover:text-[#C6FF34]'
                      : 'text-white/55 hover:text-white hover:border-white/15'
                  )}
                  title={isContacted ? 'Unmark Contacted' : 'Mark as Contacted'}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isContacted ? 'Contacted' : 'Mark Contacted'}
                </motion.button>

                {/* Save Lead */}
                <motion.button
                  onClick={handleToggleSave}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    ...glassStyle,
                    borderRadius: '10px',
                  }}
                  className={cn(
                    'flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 font-body text-xs transition-all outline-none border border-transparent bg-transparent cursor-pointer',
                    isSaved
                      ? 'border-[#C6FF34]/40 bg-[#C6FF34]/10 text-[#C6FF34] hover:text-[#C6FF34] hover:border-[#C6FF34]/40'
                      : 'text-white/55 hover:text-white hover:border-white/15'
                  )}
                  title={isSaved ? 'Unsave Lead' : 'Save Lead'}
                >
                  <motion.div
                    animate={isSaved ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-center"
                  >
                    <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-[#C6FF34] text-[#C6FF34]')} />
                  </motion.div>
                  {isSaved ? 'Saved' : 'Save Lead'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default LeadDetailsDrawer;
