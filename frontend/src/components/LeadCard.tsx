import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lead } from '../types/lead';
import { Star, PhoneCall, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface LeadCardProps {
  lead: Lead;
  isSaved: boolean;
  isContacted: boolean;
  contactedAt: string | null;
  onToggleSave?: () => void;
  onToggleContacted: () => void;
  fetchLeads?: () => void;
  /** Called when the card is clicked — opens the detail drawer */
  onOpenDrawer?: (lead: Lead) => void;
}

export function LeadCard({
  lead,
  isSaved,
  isContacted,
  contactedAt,
  onToggleSave,
  onToggleContacted,
  fetchLeads,
  onOpenDrawer,
}: LeadCardProps) {
  const handleSaveLead = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const nextStatus = isSaved ? 'new' : 'saved';

    const { data } = await supabase
      .from('posts')
      .update({ status: nextStatus })
      .eq('post_id', lead.post_id)
      .select();

    if (data && data.length > 0) {
      if (fetchLeads) fetchLeads();
    } else {
      if (onToggleSave) onToggleSave();
    }
  };

  const handleContactedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleContacted();
  };

  // Border/score colour per priority
  const priorityStyles = {
    high:   { border: 'border-l-[3px] border-l-lime',        scoreText: 'text-lime bg-lime/10 border-lime/30' },
    medium: { border: 'border-l-[3px] border-l-amberAccent', scoreText: 'text-amberAccent bg-amberAccent/10 border-amberAccent/30' },
    low:    { border: 'border-l-[3px] border-l-slateAccent', scoreText: 'text-gray-400 bg-white/5 border-white/10' },
  };
  const currentStyle = priorityStyles[lead.priority] ?? priorityStyles.low;

  const categoryLabels: Record<string, string> = {
    buying_intent: 'BUYING INTENT',
    comparison:    'COMPARISON',
    pain_point:    'PAIN POINT',
    research:      'RESEARCH',
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
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
      onClick={() => onOpenDrawer?.(lead)}
      className={cn(
        'glass-panel w-full bg-carbon-card/50 rounded-xl overflow-hidden cursor-pointer select-none',
        'transition-all duration-200 hover:border-lime/20 hover:translate-y-[-2px] relative',
        'group',
        currentStyle.border,
        isContacted && 'opacity-75 bg-carbon-card/20 border-l-slate-700'
      )}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
    >
      {/* Live pulse on high-intent */}
      {lead.priority === 'high' && !isContacted && (
        <div className="absolute top-4 right-4 z-20">
          <div className="pulse-dot" title="Live Hot Signal" />
        </div>
      )}

      {/* Card body */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 space-y-2.5 min-w-0 pr-6">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] font-bold tracking-widest text-lime bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              {categoryLabels[lead.category] ?? lead.category.toUpperCase()}
            </span>
            <span className="text-xs text-mutedText font-mono">r/{lead.subreddit}</span>
            <span className="text-[10px] text-mutedText/80 font-mono">
              • {formatTime(lead.created_at)}
            </span>
            {isContacted && (
              <span className="flex items-center gap-1 font-mono text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                <Calendar className="w-3 h-3" />
                CONTACTED
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[15px] md:text-base font-semibold text-white tracking-wide leading-relaxed font-sans">
            {lead.title}
          </h3>

          {/* Lead summary preview */}
          {lead.lead_summary && (
            <p className="text-xs text-mutedText leading-relaxed font-sans line-clamp-2">
              {lead.lead_summary}
            </p>
          )}
        </div>

        {/* Right: score + actions + arrow */}
        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleContactedClick}
              title={isContacted ? 'Unmark contacted' : 'Mark contacted'}
              className={cn(
                'p-1.5 rounded-lg border text-xs transition-colors',
                isContacted
                  ? 'border-slateAccent/40 bg-slateAccent/10 text-slateAccent'
                  : 'glass-panel border-white/5 text-gray-500 hover:border-lime/30 hover:text-lime'
              )}
            >
              <PhoneCall className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSaveLead}
              title={isSaved ? 'Unsave' : 'Save lead'}
              className={cn(
                'p-1.5 rounded-lg border text-xs transition-colors',
                isSaved
                  ? 'border-lime/40 bg-lime/10 text-lime'
                  : 'glass-panel border-white/5 text-gray-500 hover:border-lime/30 hover:text-lime'
              )}
            >
              <Star className={cn('w-3.5 h-3.5', isSaved && 'fill-lime')} />
            </button>
          </div>

          {/* Intent score */}
          <div className="text-right space-y-0.5">
            <div className={cn(
              'font-mono text-base font-bold px-2 py-0.5 border rounded-lg inline-block text-center min-w-[44px]',
              currentStyle.scoreText
            )}>
              {lead.intent_score}
            </div>
            <div className="font-mono text-[9px] text-mutedText uppercase tracking-widest block text-center">
              Intent
            </div>
          </div>

          {/* Arrow hint */}
          <div className="p-1.5 rounded-full glass-panel border-white/5 text-gray-600 group-hover:text-lime group-hover:border-lime/20 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default LeadCard;
