import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Phone, ArrowRight, ArrowLeft, Loader2, Sparkles, AlertTriangle, FileText, Check, List, CalendarDays } from 'lucide-react';
import { Lead } from '../types/lead';
import { cn } from '../lib/utils';
import { LoadingState } from './EmptyStates';
import { glassStyle } from '../lib/glass';
import { fadeUp } from '../lib/animations';

interface PipelineBoardProps {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  retryFetch: () => void;
  updateLeadStatus: (postId: string, status: 'new' | 'saved' | 'contacted') => Promise<void>;
  onOpenDrawer: (lead: Lead) => void;
  isReadOnly?: boolean;
}

export function PipelineBoard({
  leads,
  loading,
  error,
  retryFetch,
  updateLeadStatus,
  onOpenDrawer,
  isReadOnly = false,
}: PipelineBoardProps) {
  const navigate = useNavigate();

  const isInitialRef = React.useRef(true);
  React.useEffect(() => {
    isInitialRef.current = false;
  }, []);

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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 md:p-8 space-y-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-start mb-6 shrink-0"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Outreach Pipeline
          </h1>
          <p className="font-sans text-xs text-white/35 mt-1">
            Visualize and move qualified opportunities through your sales stages
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/dashboard')}
          style={{
            ...glassStyle,
            borderRadius: '10px',
          }}
          className="px-4 py-2 flex items-center gap-2 font-sans text-xs text-white/55 hover:text-white hover:border-white/15 transition-all cursor-pointer bg-transparent border border-transparent outline-none"
          title="Switch to Table View"
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">Table View</span>
        </motion.button>
      </motion.div>

      {/* Kanban Board Container */}
      <motion.div
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        initial="hidden"
        animate="visible"
        className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-4 select-none pb-4"
      >
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
          isReadOnly={isReadOnly}
          isInitial={isInitialRef.current}
        />

        {/* Column 2: Shortlisted (Saved) */}
        <PipelineColumn
          title="Shortlisted"
          icon={<Star className="w-4 h-4 text-amber-400" />}
          leads={slicedLeads.saved}
          totalCount={columns.saved.length}
          columnId="saved"
          onOpenDrawer={onOpenDrawer}
          onMove={updateLeadStatus}
          hasMore={hasMore.saved}
          onLoadMore={() => handleLoadMore('saved')}
          isReadOnly={isReadOnly}
          isInitial={isInitialRef.current}
        />

        {/* Column 3: Contacted */}
        <PipelineColumn
          title="Contacted"
          icon={<Phone className="w-4 h-4 text-blue-400" />}
          leads={slicedLeads.contacted}
          totalCount={columns.contacted.length}
          columnId="contacted"
          onOpenDrawer={onOpenDrawer}
          onMove={updateLeadStatus}
          hasMore={hasMore.contacted}
          onLoadMore={() => handleLoadMore('contacted')}
          isReadOnly={isReadOnly}
          isInitial={isInitialRef.current}
        />
      </motion.div>
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
  isReadOnly?: boolean;
  isInitial: boolean;
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
  isReadOnly = false,
  isInitial,
}: PipelineColumnProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    setIsDragOver(false);
    const postId = e.dataTransfer.getData('text/plain');
    const originColumn = e.dataTransfer.getData('origin-column');
    if (postId && originColumn !== columnId) {
      await onMove(postId, columnId);
    }
  };

  let accentClass = '';
  if (columnId === 'new') {
    accentClass = 'bg-gradient-to-r from-transparent via-purple-400/30 to-transparent';
  } else if (columnId === 'saved') {
    accentClass = 'bg-gradient-to-r from-transparent via-amber-400/30 to-transparent';
  } else if (columnId === 'contacted') {
    accentClass = 'bg-gradient-to-r from-transparent via-blue-400/30 to-transparent';
  }

  const dragStyle = isDragOver ? {
    borderColor: 'rgba(198, 255, 52, 0.25)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.055), inset 0 0 12px rgba(198, 255, 52, 0.02)',
    transition: 'all 0.2s ease',
  } : {
    transition: 'all 0.2s ease',
  };

  return (
    <motion.div
      variants={fadeUp}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...glassStyle,
        ...dragStyle,
      }}
      className="w-full flex flex-col h-[60vh] md:h-full md:max-h-[calc(100vh-200px)] overflow-hidden relative"
    >
      {/* Decorative top accent */}
      <div className={cn("absolute top-0 left-0 right-0 h-px z-20", accentClass)} />

      {/* Column Header */}
      <div className="px-4 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-display text-base font-semibold text-white">{title}</h3>
        </div>
        <span className="font-mono text-xs bg-white/5 border border-white/[0.08] rounded-full px-2.5 py-1 text-white/50">
          {totalCount}
        </span>
      </div>

      {/* Card List Container */}
      <div 
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin relative z-10"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)'
        }}
      >
        <AnimatePresence mode="popLayout">
          {leads.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center text-center"
            >
              {columnId === 'new' && <Sparkles className="w-8 h-8 text-purple-400/20" />}
              {columnId === 'saved' && <Star className="w-8 h-8 text-amber-400/20" />}
              {columnId === 'contacted' && <Phone className="w-8 h-8 text-blue-400/20" />}
              <span className="font-sans text-xs text-white/20 mt-3">No leads in this stage</span>
            </motion.div>
          ) : (
            leads.map((lead, idx) => (
              <PipelineCard
                key={lead.post_id}
                lead={lead}
                columnId={columnId}
                onOpenDrawer={onOpenDrawer}
                onMove={onMove}
                isReadOnly={isReadOnly}
                index={idx}
                isInitial={isInitial}
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
    </motion.div>
  );
}

// ─── PipelineCard Component ────────────────────────────────────────────────────

interface PipelineCardProps {
  lead: Lead;
  columnId: 'new' | 'saved' | 'contacted';
  onOpenDrawer: (lead: Lead) => void;
  onMove: (postId: string, status: 'new' | 'saved' | 'contacted') => Promise<void>;
  isReadOnly?: boolean;
  index: number;
  isInitial: boolean;
}

function PipelineCard({
  lead,
  columnId,
  onOpenDrawer,
  onMove,
  isReadOnly = false,
  index,
  isInitial,
}: PipelineCardProps) {
  const [moving, setMoving] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMove = async (e: React.MouseEvent, dest: 'new' | 'saved' | 'contacted') => {
    e.stopPropagation();
    setMoving(true);
    try {
      await onMove(lead.post_id, dest);
    } finally {
      setMoving(false);
    }
  };

  const delay = isInitial ? index * 0.05 : 0.1;

  const scoreColor = lead.intent_score >= 80 
    ? 'text-lime' 
    : lead.intent_score >= 50 
      ? 'text-amber-400' 
      : 'text-white/40';

  const scoreBarColor = lead.intent_score >= 80 
    ? 'bg-lime' 
    : lead.intent_score >= 50 
      ? 'bg-amber-400' 
      : 'bg-white/40';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, x: 20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileDrag={{ 
        scale: 1.04, 
        rotate: 1.5, 
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(198,255,52,0.25)', 
        zIndex: 50 
      }}
      draggable={!isReadOnly}
      onDragStart={(e: any) => {
        if (isReadOnly) return;
        e.dataTransfer.setData('text/plain', lead.post_id);
        e.dataTransfer.setData('origin-column', columnId);
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onClick={() => onOpenDrawer(lead)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative rounded-xl p-4 cursor-grab active:cursor-grabbing group overflow-hidden border transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: isHovered 
          ? '1px solid rgba(255,255,255,0.13)' 
          : isDragging 
            ? '1px solid rgba(198,255,52,0.25)' 
            : '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {/* Card hover sheen effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle at top right, rgba(198,255,52,0.04) 0%, transparent 60%)'
        }}
      />

      {/* Card top row */}
      <div className="flex justify-between items-start mb-2.5 gap-2 relative z-10">
        <span className="font-mono text-[10px] bg-lime/10 border border-lime/20 text-lime/75 rounded-full px-2.5 py-1 truncate max-w-[140px]">
          r/{lead.subreddit}
        </span>
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold shrink-0">
          <span className={scoreColor}>{lead.intent_score}%</span>
          {(lead.draft_reply || lead.notes) && (
            <span title="Has draft reply or notes">
              <FileText className="w-3 h-3 text-white/25" />
            </span>
          )}
        </div>
      </div>

      {/* Card title */}
      <h4 className="font-sans text-sm text-white/85 font-medium leading-snug line-clamp-2 mb-3 relative z-10">
        {lead.title}
      </h4>

      {/* Progress bar */}
      <div className="w-full bg-white/8 rounded-full h-1 overflow-hidden mb-3 relative z-10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${lead.intent_score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: delay + 0.1 }}
          className={cn("h-full rounded-full", scoreBarColor)}
        />
      </div>

      {/* Card bottom row */}
      <div className="flex justify-between items-center relative z-10">
        <span className="font-mono text-[10px] text-white/25 flex items-center gap-1">
          <CalendarDays className="w-3 h-3" />
          {new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>

        <div className="flex items-center gap-1.5">
          {moving ? (
            <Loader2 className="w-3.5 h-3.5 text-lime animate-spin" />
          ) : isReadOnly ? (
            null
          ) : (
            <>
              {columnId === 'new' && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={(e) => handleMove(e, 'saved')}
                  style={{
                    ...glassStyle,
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                  }}
                  className="flex items-center justify-center text-white/40 hover:text-lime hover:border-lime/25 transition-all border border-transparent bg-transparent cursor-pointer outline-none relative"
                  title="Shortlist Lead"
                >
                  <span className="absolute inset-[-4px] pointer-events-auto" />
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              )}
              {columnId === 'saved' && (
                <>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={(e) => handleMove(e, 'new')}
                    style={{
                      ...glassStyle,
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                    }}
                    className="flex items-center justify-center text-white/35 hover:text-white/60 transition-all border border-transparent bg-transparent cursor-pointer outline-none relative"
                    title="Move back to New"
                  >
                    <span className="absolute inset-[-4px] pointer-events-auto" />
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={(e) => handleMove(e, 'contacted')}
                    className="bg-lime/15 border border-lime/30 w-7 h-7 rounded-lg flex items-center justify-center text-lime hover:bg-lime/25 transition-all cursor-pointer outline-none relative"
                    title="Mark as Contacted"
                  >
                    <span className="absolute inset-[-4px] pointer-events-auto" />
                    <Check className="w-3.5 h-3.5" />
                  </motion.button>
                </>
              )}
              {columnId === 'contacted' && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={(e) => handleMove(e, 'saved')}
                  style={{
                    ...glassStyle,
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                  }}
                  className="flex items-center justify-center text-white/35 hover:text-white/60 transition-all border border-transparent bg-transparent cursor-pointer outline-none relative"
                  title="Move back to Saved"
                >
                  <span className="absolute inset-[-4px] pointer-events-auto" />
                  <ArrowLeft className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default PipelineBoard;
