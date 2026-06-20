import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink, Copy, Check, Star, PhoneCall,
  Zap, Target, MessageSquare, Tag, FileText, Brain,
  AlertTriangle, ChevronRight, Loader2
} from 'lucide-react';
import { Lead, LeadDetail } from '../types/lead';
import { useLeadDetail } from '../hooks/useLeadDetail';
import { cn } from '../lib/utils';

interface LeadDetailsDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  isContacted: boolean;
  onToggleSave: () => void;
  onToggleContacted: () => void;
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
}: LeadDetailsDrawerProps) {
  const { detail, loading, error, fetchDetail, clearDetail } = useLeadDetail();
  const [copied, setCopied] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fetch full detail when drawer opens
  useEffect(() => {
    if (isOpen && lead?.post_id) {
      fetchDetail(lead.post_id);
    }
    if (!isOpen) {
      clearDetail();
    }
  }, [isOpen, lead?.post_id]);

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

                  {/* ── Why This Is A Lead ── */}
                  <section>
                    <SectionLabel icon={<Target className="w-3.5 h-3.5" />} label="Why This Is a Lead" />
                    <div className="glass-panel border-amberAccent/10 bg-amberAccent/[0.02] rounded-xl p-4">
                      <p className="text-sm text-gray-300 leading-relaxed font-sans">
                        {d.reason || <span className="text-gray-500 italic">No analysis available.</span>}
                      </p>
                    </div>
                  </section>

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
                <a
                  href={lead?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg glass-panel border-white/8 hover:border-lime/30 hover:text-lime text-xs font-mono uppercase tracking-wider transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Post
                </a>

                {/* Copy Reply */}
                <button
                  onClick={handleCopyReply}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors',
                    copied
                      ? 'border-lime/40 bg-lime/10 text-lime'
                      : 'glass-panel border-white/8 hover:border-lime/30 hover:text-lime'
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Reply'}
                </button>

                {/* Save */}
                <button
                  onClick={onToggleSave}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors',
                    isSaved
                      ? 'border-lime/40 bg-lime/10 text-lime'
                      : 'glass-panel border-white/8 hover:border-lime/30 hover:text-lime'
                  )}
                  title={isSaved ? 'Unsave Lead' : 'Save Lead'}
                >
                  <Star className={cn('w-3.5 h-3.5', isSaved && 'fill-lime')} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>

                {/* Mark Contacted */}
                <button
                  onClick={onToggleContacted}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors',
                    isContacted
                      ? 'border-slateAccent/40 bg-slateAccent/10 text-slateAccent'
                      : 'glass-panel border-white/8 hover:border-lime/30 hover:text-lime'
                  )}
                  title={isContacted ? 'Unmark Contacted' : 'Mark as Contacted'}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </button>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default LeadDetailsDrawer;
