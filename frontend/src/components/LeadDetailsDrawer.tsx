import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink, Copy, Check, Star, PhoneCall,
  Zap, Target, MessageSquare, Tag, FileText, Brain,
  AlertTriangle, ChevronRight, Loader2, Save,
  Mail, RotateCw, Send
} from 'lucide-react';
import { Lead, LeadDetail, QualificationReason } from '../types/lead';
import { useLeadDetail } from '../hooks/useLeadDetail';
import { useOutreachGenerator, OutreachChannel } from '../hooks/useOutreachGenerator';
import { cn } from '../lib/utils';

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            ref={drawerRef}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={cn(
              'fixed top-0 right-0 h-full z-50 flex flex-col',
              'bg-[#111111] border-l border-white/8 shadow-2xl',
              'w-full sm:w-[500px]',
            )}
            style={{ boxShadow: '-8px 0 60px rgba(0,0,0,0.6), -1px 0 0 rgba(198,255,52,0.06)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="shrink-0 border-b border-white/6 p-5 space-y-3 bg-[#111111]">
              {/* Top row: subreddit + close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime shadow-[0_0_6px_#C6FF34]" />
                  <span className="font-mono text-xs text-lime font-semibold tracking-wider">
                    r/{lead?.subreddit}
                  </span>
                  <span className="text-[10px] text-mutedText font-mono">
                    • {lead?.created_at ? formatTime(lead.created_at) : ''}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <h2 className="text-base font-bold text-white leading-snug font-sans pr-2 line-clamp-3">
                {lead?.title}
              </h2>

              {/* Score row */}
              {d && !loading && (
                <div className="flex items-center gap-4 pt-1">
                  {/* Intent score ring */}
                  <ScoreRing score={d.intent_score} />

                  <div className="flex-1 space-y-2">
                    {/* Confidence bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-mutedText uppercase tracking-widest">Confidence</span>
                        <span className="text-[9px] font-mono text-white/70">{confidencePct}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-lime rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${confidencePct}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* Badge row */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn('text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', priCfg.color)}>
                        {priCfg.label}
                      </span>
                      <span className={cn('text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', catCfg.color)}>
                        {catCfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Skeleton metrics while loading */}
              {loading && (
                <div className="flex items-center gap-4 pt-1 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2 bg-white/5 rounded w-full" />
                    <div className="flex gap-2">
                      <div className="h-4 bg-white/5 rounded-full w-16" />
                      <div className="h-4 bg-white/5 rounded-full w-24" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto">
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
                <div className="p-5 space-y-5">

                  {/* ── AI Lead Summary ── */}
                  <section>
                    <SectionLabel icon={<Brain className="w-3.5 h-3.5" />} label="AI Lead Summary" />
                    <div className="glass-panel bg-lime/[0.02] border-lime/10 rounded-xl p-4">
                      <p className="text-sm text-gray-200 leading-relaxed font-sans">
                        {d.lead_summary || <span className="text-gray-500 italic">Summary unavailable.</span>}
                      </p>
                    </div>
                  </section>

                  {/* ── Lead Notes ── */}
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <SectionLabel icon={<FileText className="w-3.5 h-3.5" />} label="Lead Notes" />
                      
                      <AnimatePresence mode="wait">
                        {notesSavedStatus === 'saving' && (
                          <motion.span
                            key="saving"
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] font-mono text-lime/70 flex items-center gap-1"
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
                        className="w-full h-24 px-3.5 py-2.5 text-xs bg-[#0A0A0A]/50 border border-white/10 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-all font-sans resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-mutedText/40">
                          Autosaves on blur
                        </span>
                        {isNotesChanged && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={handleSaveNotes}
                            disabled={notesSavedStatus === 'saving'}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-lime/20 bg-lime/5 hover:bg-lime/15 hover:border-lime/30 text-[10px] font-mono text-lime uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            Save Notes
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* ── Activity Timeline ── */}
                  <section className="space-y-3 border-t border-white/5 pt-4">
                    <SectionLabel icon={<RotateCw className="w-3.5 h-3.5" />} label="Activity Timeline" />
                    
                    {timeline.length === 0 ? (
                      <div className="text-center py-4 text-xs text-mutedText/50 font-mono italic">
                        No activity yet.
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-4 py-2">
                        {/* Vertical line connecting events */}
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
                              {/* Circle Bullet */}
                              <div className="absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#0F0E0E] border border-white/5 shadow-sm">
                                {config.icon}
                              </div>
                              
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-mutedText/65 leading-none">
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
                  </section>

                  {/* ── Why This Is A Lead ── */}
                  <section>
                    <SectionLabel icon={<Target className="w-3.5 h-3.5" />} label="Why This Is a Lead" />
                    <div className="glass-panel border-amberAccent/10 bg-amberAccent/[0.02] rounded-xl p-4">
                      <p className="text-sm text-gray-300 leading-relaxed font-sans">
                        {d.reason || <span className="text-gray-500 italic">No analysis available.</span>}
                      </p>
                    </div>
                  </section>

                  {/* ── Qualification Signal ── */}
                  {d.qualification_reason && (() => {
                    const qCfg = qualSignalConfig[d.qualification_reason] ?? {
                      label: d.qualification_reason,
                      icon: '🎯',
                      color: 'text-gray-400 bg-white/5 border-white/10',
                    };
                    return (
                      <section>
                        <SectionLabel icon={<Zap className="w-3.5 h-3.5" />} label="Qualification Signal" />
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'inline-flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider',
                            qCfg.color
                          )}>
                            <span>{qCfg.icon}</span>
                            {qCfg.label}
                          </span>
                          <span className="text-[10px] font-mono text-mutedText/60">
                            pre-filter match
                          </span>
                        </div>
                      </section>
                    );
                  })()}

                  {/* ── Suggested Action ── */}
                  {d.recommended_action && (
                    <section>
                      <SectionLabel icon={<Zap className="w-3.5 h-3.5" />} label="Suggested Action" />
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider',
                        actCfg.color
                      )}>
                        <ChevronRight className="w-3 h-3" />
                        {actCfg.label}
                      </span>
                    </section>
                  )}

                  {/* ── Suggested Reply ── */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <SectionLabel icon={<MessageSquare className="w-3.5 h-3.5" />} label="Suggested Reply" />
                      <button
                        onClick={handleCopyReply}
                        className={cn(
                          'flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest transition-colors mb-2',
                          copied ? 'text-lime' : 'text-gray-500 hover:text-lime'
                        )}
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Copy Reply'}
                      </button>
                    </div>
                    <div className="glass-inset rounded-xl p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {d.draft_reply || <span className="text-gray-500 italic">No draft reply generated.</span>}
                    </div>
                  </section>

                  {/* ── AI Outreach Hub ── */}
                  <section className="space-y-3">
                    <SectionLabel icon={<Zap className="w-3.5 h-3.5" />} label="AI Outreach Hub" />
                    
                    {/* Channel Tabs */}
                    <div className="flex border border-white/5 bg-[#0A0A0A]/40 p-1 rounded-xl">
                      {(['reddit', 'linkedin', 'email'] as OutreachChannel[]).map((chan) => (
                        <button
                          key={chan}
                          onClick={() => setActiveChannel(chan)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono rounded-lg transition-all capitalize cursor-pointer",
                            activeChannel === chan
                              ? "bg-lime text-carbon-dark font-bold shadow-[0_0_6px_rgba(198,255,52,0.2)]"
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

                    {/* Content Box */}
                    <div className="relative glass-panel border-white/5 bg-white/[0.015] rounded-xl p-4 min-h-[160px] flex flex-col justify-between">
                      {outreachLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-3">
                          <Loader2 className="w-6 h-6 text-lime animate-spin" />
                          <span className="text-xs font-mono text-gray-400">Drafting outreach message...</span>
                        </div>
                      ) : outreachError ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-4 space-y-3">
                          <AlertTriangle className="w-6 h-6 text-amberAccent" />
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
                                });
                              }
                            }}
                            className="px-3 py-1.5 text-[10px] font-mono text-lime border border-lime/30 bg-lime/5 hover:bg-lime/15 rounded-lg transition-all cursor-pointer"
                          >
                            Retry Generation
                          </button>
                        </div>
                      ) : messages[activeChannel] ? (
                        <div className="space-y-3 flex-1 flex flex-col justify-between">
                          <div className="text-xs font-sans text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-1">
                            {messages[activeChannel]}
                          </div>
                          
                          <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                            {/* Copy button */}
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(messages[activeChannel]);
                                  setCopiedChannel(activeChannel);
                                  setTimeout(() => setCopiedChannel(null), 2000);
                                } catch (err) {}
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer",
                                copiedChannel === activeChannel
                                  ? "border-lime/40 bg-lime/10 text-lime"
                                  : "glass-panel border-white/8 hover:border-lime/30 hover:text-lime text-gray-400"
                              )}
                            >
                              {copiedChannel === activeChannel ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedChannel === activeChannel ? 'Copied' : 'Copy'}
                            </button>

                            {/* Regenerate button */}
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
                                  });
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel border-white/8 hover:border-lime/30 hover:text-lime text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              <RotateCw className="w-3 h-3" />
                              Regenerate
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-3">
                          <span className="text-[10px] font-mono text-gray-500 italic">
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
                                });
                              }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-lime border border-lime/20 bg-lime/5 hover:bg-lime/15 hover:border-lime/30 rounded-xl transition-all cursor-pointer"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            Generate {activeChannel === 'email' ? 'Cold Email' : activeChannel === 'reddit' ? 'Reddit Reply' : 'LinkedIn Message'}
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* ── Keywords ── */}
                  {d.keywords && d.keywords.length > 0 && (
                    <section>
                      <SectionLabel icon={<Tag className="w-3.5 h-3.5" />} label="Keywords" />
                      <div className="flex flex-wrap gap-1.5">
                        {d.keywords.map((kw, i) => (
                          <span
                            key={`${kw}-${i}`}
                            className="text-[10px] font-mono px-2.5 py-1 rounded-full glass-panel border-white/8 text-gray-300 hover:border-lime/20 hover:text-lime transition-colors"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── Original Post ── */}
                  <section>
                    <SectionLabel icon={<FileText className="w-3.5 h-3.5" />} label="Original Reddit Post" />
                    <div className="glass-inset rounded-xl p-4 max-h-52 overflow-y-auto">
                      {d.body ? (
                        <p className="text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                          {d.body}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No post body available.</p>
                      )}
                    </div>
                  </section>

                  {/* Processed time */}
                  {d.processed_at && (
                    <p className="text-[10px] font-mono text-mutedText/50 text-center">
                      Indexed {formatTime(d.processed_at)}
                    </p>
                  )}

                </div>
              )}
            </div>

            {/* ── Sticky Action Footer ── */}
            <div className="shrink-0 border-t border-white/6 p-4 bg-[#0f0f0f]">
              <div className="flex items-center gap-2">

                 {/* Open Reddit */}
                 <motion.a
                  href={lead?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg glass-panel border-white/8 hover:border-lime/30 hover:text-lime text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Post
                </motion.a>

                {/* Copy Reply */}
                <motion.button
                  onClick={handleCopyReply}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer',
                    copied
                      ? 'border-lime/40 bg-lime/10 text-lime'
                      : 'glass-panel border-white/8 hover:border-lime/30 hover:text-lime'
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Reply'}
                </motion.button>

                {/* Save */}
                <motion.button
                  onClick={handleToggleSave}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer',
                    isSaved
                      ? 'border-lime/40 bg-lime/10 text-lime'
                      : 'glass-panel border-white/8 hover:border-lime/30 hover:text-lime'
                  )}
                  title={isSaved ? 'Unsave Lead' : 'Save Lead'}
                >
                  <Star className={cn('w-3.5 h-3.5', isSaved && 'fill-lime')} />
                  {isSaved ? 'Saved' : 'Save'}
                </motion.button>

                {/* Mark Contacted */}
                <motion.button
                  onClick={handleToggleContacted}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer',
                    isContacted
                      ? 'border-slateAccent/40 bg-slateAccent/10 text-slateAccent'
                      : 'glass-panel border-white/8 hover:border-lime/30 hover:text-lime'
                  )}
                  title={isContacted ? 'Unmark Contacted' : 'Mark as Contacted'}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
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
