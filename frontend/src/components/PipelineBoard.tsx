import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Phone, ArrowRight, ArrowLeft, Loader2, Sparkles, AlertTriangle, FileText, Check, List } from 'lucide-react';
import { Lead } from '../types/lead';
import { cn } from '../lib/utils';
import { LoadingState } from './EmptyStates';

interface PipelineBoardProps {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  retryFetch: () => void;
  updateLeadStatus: (postId: string, status: 'new' | 'saved' | 'contacted') => Promise<void>;
  onOpenDrawer: (lead: Lead) => void;
}

export function PipelineBoard({
  leads,
  loading,
  error,
  retryFetch,
  updateLeadStatus,
  onOpenDrawer,
}: PipelineBoardProps) {
  const navigate = useNavigate();

  const [visibleCounts, setVisibleCounts] = React.useState<Record<'new' | 'saved' | 'contacted', number>>({
    new: 50,
    saved: 50,
    contacted: 50,
  });

  // Reset pagination if the base leads array reference changes (meaning filters changed)
  React.useEffect(() => {
    setVisibleCounts({
      new: 50,
      saved: 50,
      contacted: 50,
    });
  }, [leads]);

  // Partition leads by status
  const columns = React.useMemo(() => {
    return {
      new: leads.filter(l => l.status === 'new'),
      saved: leads.filter(l => l.status === 'saved'),
      contacted: leads.filter(l => l.status === 'contacted'),
    };
  }, [leads]);

  const slicedLeads = React.useMemo(() => {
    return {
      new: columns.new.slice(0, visibleCounts.new),
      saved: columns.saved.slice(0, visibleCounts.saved),
      contacted: columns.contacted.slice(0, visibleCounts.contacted),
    };
  }, [columns, visibleCounts]);

  const hasMore = React.useMemo(() => {
    return {
      new: columns.new.length > visibleCounts.new,
      saved: columns.saved.length > visibleCounts.saved,
      contacted: columns.contacted.length > visibleCounts.contacted,
    };
  }, [columns, visibleCounts]);

  const handleLoadMore = React.useCallback((columnId: 'new' | 'saved' | 'contacted') => {
    setVisibleCounts(prev => ({
      ...prev,
      [columnId]: prev[columnId] + 50,
    }));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amberAccent" />
        <h3 className="text-lg font-bold">Failed to load pipeline</h3>
        <p className="text-sm text-gray-400 max-w-md">{error}</p>
        <button
          onClick={retryFetch}
          className="px-4 py-2 text-xs font-mono text-lime border border-lime/30 bg-lime/5 hover:bg-lime/15 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 md:p-8 space-y-6">
      <div className="flex justify-between items-center shrink-0">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold font-syne text-white tracking-tight">
            Outreach Pipeline
          </h1>
          <p className="text-xs text-mutedText font-mono">
            Visualize and move qualified opportunities through your sales stages
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-lg glass-panel border-white/5 text-gray-400 hover:text-white hover:border-white/10 transition-colors cursor-pointer"
          title="Switch to Table View"
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">Table View</span>
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 min-h-0 overflow-x-auto flex gap-6 pb-4 snap-x select-none">
        
        {/* Column 1: New */}
        <PipelineColumn
          title="New Opportunities"
          icon={<Sparkles className="w-4 h-4 text-purple-400" />}
          leads={slicedLeads.new}
          totalCount={columns.new.length}
          columnId="new"
          onOpenDrawer={onOpenDrawer}
          onMove={updateLeadStatus}
          hasMore={hasMore.new}
          onLoadMore={() => handleLoadMore('new')}
        />

        {/* Column 2: Shortlisted (Saved) */}
        <PipelineColumn
          title="Shortlisted (Saved)"
          icon={<Star className="w-4 h-4 text-yellow-400 fill-yellow-400/10" />}
          leads={slicedLeads.saved}
          totalCount={columns.saved.length}
          columnId="saved"
          onOpenDrawer={onOpenDrawer}
          onMove={updateLeadStatus}
          hasMore={hasMore.saved}
          onLoadMore={() => handleLoadMore('saved')}
        />

        {/* Column 3: Contacted */}
        <PipelineColumn
          title="Contacted"
          icon={<Phone className="w-4 h-4 text-cyan-400" />}
          leads={slicedLeads.contacted}
          totalCount={columns.contacted.length}
          columnId="contacted"
          onOpenDrawer={onOpenDrawer}
          onMove={updateLeadStatus}
          hasMore={hasMore.contacted}
          onLoadMore={() => handleLoadMore('contacted')}
        />

      </div>
    </div>
  );
}

// ─── PipelineColumn Component ──────────────────────────────────────────────────

interface PipelineColumnProps {
  title: string;
  icon: React.ReactNode;
  leads: Lead[];
  totalCount: number;
  columnId: 'new' | 'saved' | 'contacted';
  onOpenDrawer: (lead: Lead) => void;
  onMove: (postId: string, status: 'new' | 'saved' | 'contacted') => Promise<void>;
  hasMore: boolean;
  onLoadMore: () => void;
}

function PipelineColumn({
  title,
  icon,
  leads,
  totalCount,
  columnId,
  onOpenDrawer,
  onMove,
  hasMore,
  onLoadMore,
}: PipelineColumnProps) {
  return (
    <div className="w-full min-w-[280px] max-w-[360px] flex-shrink-0 flex flex-col h-full glass-panel rounded-2xl bg-carbon-card/20 border-white/5 snap-align-start overflow-hidden">
      {/* Column Header */}
      <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-syne font-bold text-sm text-white">{title}</h3>
        </div>
        <span className="font-mono text-xs text-mutedText bg-white/5 px-2 py-0.5 rounded-full font-bold">
          {totalCount}
        </span>
      </div>

      {/* Card List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {leads.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 italic text-xs">
              No leads in this stage
            </div>
          ) : (
            leads.map((lead) => (
              <PipelineCard
                key={lead.post_id}
                lead={lead}
                columnId={columnId}
                onOpenDrawer={onOpenDrawer}
                onMove={onMove}
              />
            ))
          )}
        </AnimatePresence>

        {hasMore && (
          <button
            onClick={onLoadMore}
            className="w-full py-2.5 mt-2 text-xs font-mono text-center text-lime border border-lime/10 hover:border-lime/30 bg-lime/5 hover:bg-lime/10 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            Load More (+50)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PipelineCard Component ────────────────────────────────────────────────────

interface PipelineCardProps {
  lead: Lead;
  columnId: 'new' | 'saved' | 'contacted';
  onOpenDrawer: (lead: Lead) => void;
  onMove: (postId: string, status: 'new' | 'saved' | 'contacted') => Promise<void>;
}

function PipelineCard({ lead, columnId, onOpenDrawer, onMove }: PipelineCardProps) {
  const [moving, setMoving] = React.useState(false);

  const handleMove = async (e: React.MouseEvent, dest: 'new' | 'saved' | 'contacted') => {
    e.stopPropagation();
    setMoving(true);
    try {
      await onMove(lead.post_id, dest);
    } finally {
      setMoving(false);
    }
  };

  const scoreColor = lead.intent_score >= 80 ? 'text-lime' : lead.intent_score >= 60 ? 'text-amberAccent' : 'text-gray-400';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={() => onOpenDrawer(lead)}
      className="glass-panel p-4 rounded-xl border border-white/5 bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/10 transition-colors duration-150 cursor-pointer space-y-3 relative group"
    >
      {/* Top details */}
      <div className="flex justify-between items-start gap-2">
        <span className="font-mono text-[9px] text-lime px-2 py-0.5 rounded bg-lime/5 border border-lime/10 truncate max-w-[120px]">
          r/{lead.subreddit}
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className={scoreColor}>{lead.intent_score}%</span>
          {lead.notes && (
            <span title="Has notes">
              <FileText className="w-3 h-3 text-lime" />
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2 pr-2">
        {lead.title}
      </h4>

      {/* Intent Score Bar */}
      <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            lead.intent_score >= 80 ? 'bg-lime' : lead.intent_score >= 60 ? 'bg-amberAccent' : 'bg-gray-500'
          )}
          style={{ width: `${lead.intent_score}%` }}
        />
      </div>

      {/* Action Row */}
      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        <span className="text-[9px] font-mono text-mutedText">
          {new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>

        <div className="flex items-center gap-1">
          {moving ? (
            <Loader2 className="w-3.5 h-3.5 text-lime animate-spin" />
          ) : (
            <>
              {columnId === 'new' && (
                <button
                  onClick={(e) => handleMove(e, 'saved')}
                  className="p-1 rounded bg-lime/10 border border-lime/20 text-lime hover:bg-lime hover:text-carbon-dark transition-colors duration-150 cursor-pointer"
                  title="Shortlist Lead"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {columnId === 'saved' && (
                <>
                  <button
                    onClick={(e) => handleMove(e, 'new')}
                    className="p-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-colors duration-150 cursor-pointer"
                    title="Move back to New"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleMove(e, 'contacted')}
                    className="p-1 rounded bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400 hover:text-carbon-dark transition-colors duration-150 cursor-pointer"
                    title="Mark as Contacted"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </>
              )}
              {columnId === 'contacted' && (
                <button
                  onClick={(e) => handleMove(e, 'saved')}
                  className="p-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-colors duration-150 cursor-pointer"
                  title="Move back to Saved"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default PipelineBoard;
