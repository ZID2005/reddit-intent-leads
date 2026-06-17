import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead } from '../types/lead';
import { 
  ChevronDown, ExternalLink, Copy, Check, Star, 
  PhoneCall, ShieldAlert, Calendar 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LeadCardProps {
  lead: Lead;
  isSaved: boolean;
  isContacted: boolean;
  contactedAt: string | null;
  onToggleSave: () => void;
  onToggleContacted: () => void;
}

export function LeadCard({
  lead,
  isSaved,
  isContacted,
  contactedAt,
  onToggleSave,
  onToggleContacted,
}: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Border and badge color mapping
  const priorityStyles = {
    high: {
      border: "border-l-[3px] border-l-lime",
      scoreText: "text-lime bg-lime/10 border-lime/30",
    },
    medium: {
      border: "border-l-[3px] border-l-amberAccent",
      scoreText: "text-amberAccent bg-amberAccent/10 border-amberAccent/30",
    },
    low: {
      border: "border-l-[3px] border-l-slateAccent",
      scoreText: "text-gray-400 bg-white/5 border-white/10",
    }
  };

  const currentStyle = priorityStyles[lead.priority] || priorityStyles.low;

  // Format category tags
  const categoryLabels = {
    buying_intent: "BUYING INTENT",
    comparison: "COMPARISON",
    pain_point: "PAIN POINT",
    research: "RESEARCH"
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card toggle
    try {
      await navigator.clipboard.writeText(lead.draft_reply);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Format created_at to clean relative timestamp or local date
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'just now';
    }
  };

  return (
    <motion.div
      layout="position"
      onClick={() => setIsExpanded(prev => !prev)}
      className={cn(
        "glass-panel w-full bg-carbon-card/50 rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-200 hover:border-lime/20 hover:translate-y-[-2px] relative",
        currentStyle.border,
        isContacted && "opacity-75 bg-carbon-card/20 border-l-slate-700"
      )}
      style={{
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)"
      }}
    >
      {/* Live Pulsing Dot on High Intent leads */}
      {lead.priority === 'high' && !isContacted && (
        <div className="absolute top-4 right-4 z-20">
          <div className="pulse-dot" title="Live Hot Signal" />
        </div>
      )}

      {/* Card Header Area */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 space-y-2.5 min-w-0 pr-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category badge */}
            <span className="font-mono text-[9px] font-bold tracking-widest text-lime bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              {categoryLabels[lead.category] || lead.category.toUpperCase()}
            </span>
            {/* Subreddit label */}
            <span className="text-xs text-mutedText font-mono">
              r/{lead.subreddit}
            </span>
            {/* Time badge */}
            <span className="text-[10px] text-mutedText/80 font-mono">
              • {formatTime(lead.created_at)}
            </span>
            {/* Contacted status */}
            {isContacted && (
              <span className="flex items-center gap-1 font-mono text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                <Calendar className="w-3 h-3" />
                CONTACTED
              </span>
            )}
          </div>

          <h3 className="text-[15px] md:text-base font-semibold text-white tracking-wide leading-relaxed font-sans">
            {lead.title}
          </h3>
        </div>

        {/* Score metrics */}
        <div className="flex items-center gap-4 self-end md:self-center">
          <div className="text-right space-y-0.5">
            <div className={cn(
              "font-mono text-base font-bold px-2 py-0.5 border rounded-lg inline-block text-center min-w-[44px]",
              currentStyle.scoreText
            )}>
              {lead.intent_score}
            </div>
            <div className="font-mono text-[9px] text-mutedText uppercase tracking-widest block text-center">
              Intent
            </div>
          </div>

          {/* Chevron indicator */}
          <div className={cn(
            "p-1.5 rounded-full glass-panel border-white/5 text-gray-400 hover:text-white transition-transform duration-200",
            isExpanded && "transform rotate-180"
          )}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Card Expanded Detail Section */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/5 bg-carbon-dark/30"
          >
            <div className="p-6 space-y-6" onClick={(e) => e.stopPropagation() /* Prevent close */}>
              
              {/* Post Body text */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-mutedText block">
                  Original Post Body
                </span>
                <p className="text-sm text-gray-200 leading-relaxed font-sans font-light">
                  {lead.body || <span className="italic text-gray-500">No description text provided.</span>}
                </p>
              </div>

              {/* Lead Summary callout */}
              <div className="glass-panel border-lime/10 bg-lime/[0.01] p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-lime/80 font-bold block">
                  Lead Summary
                </span>
                <p className="text-xs text-gray-200 font-sans leading-relaxed">
                  {lead.lead_summary || "AI Summary unavailable."}
                </p>
              </div>

              {/* Signal Analysis reasoning */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-lime">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                    Signal Analysis
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                  {lead.reason || "No diagnostic reasoning available."}
                </p>
              </div>

              {/* AI Draft Reply Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-mutedText">
                    AI Suggested Outreach Draft
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-lime hover:underline cursor-pointer"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-lime" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Draft
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-gray-300 p-4 rounded-lg bg-black/40 border border-white/5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {lead.draft_reply || "No draft outreach generated."}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
                {/* Open Post */}
                <a
                  href={lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg glass-panel border-white/5 hover:border-lime/30 hover:text-lime text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-transform duration-150 active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Post
                </a>

                {/* Copy Reply */}
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg glass-panel border-white/5 hover:border-lime/30 hover:text-lime text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-transform duration-150 active:scale-95"
                >
                  {copySuccess ? (
                    <Check className="w-3.5 h-3.5 text-lime" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Copy Reply
                </button>

                {/* Mark Contacted */}
                <button
                  onClick={onToggleContacted}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-transform duration-150 active:scale-95",
                    isContacted
                      ? "border-slateAccent/40 bg-slateAccent/10 text-slateAccent"
                      : "glass-panel border-white/5 hover:border-lime/30 hover:text-lime"
                  )}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  {isContacted ? "Contacted" : "Mark Contacted"}
                </button>

                {/* Save Lead */}
                <button
                  onClick={onToggleSave}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-transform duration-150 active:scale-95 ml-auto",
                    isSaved
                      ? "border-lime/40 bg-lime/10 text-lime"
                      : "glass-panel border-white/5 hover:border-lime/30 hover:text-lime"
                  )}
                >
                  <Star className={cn("w-3.5 h-3.5", isSaved && "fill-lime")} />
                  {isSaved ? "Saved" : "Save Lead"}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
export default LeadCard;
