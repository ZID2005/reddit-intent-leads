import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead } from '../../types/lead';
import { glassStyle } from '../../lib/glass';

interface TopSubredditsTableProps {
  leads: Lead[];
  shouldReduceMotion?: boolean;
}

export function TopSubredditsTable({ leads, shouldReduceMotion = false }: TopSubredditsTableProps) {
  const [showAll, setShowAll] = useState(false);

  const tableData = useMemo(() => {
    const subs: Record<string, { count: number; intentCount: number; sumIntent: number; confCount: number; sumConf: number }> = {};
    leads.forEach(l => {
      if (!subs[l.subreddit]) subs[l.subreddit] = { count: 0, intentCount: 0, sumIntent: 0, confCount: 0, sumConf: 0 };
      subs[l.subreddit].count++;
      if (l.intent_score != null && l.intent_score > 0) {
        subs[l.subreddit].intentCount++;
        subs[l.subreddit].sumIntent += l.intent_score;
      }
      if (l.confidence != null && l.confidence > 0) {
        subs[l.subreddit].confCount++;
        subs[l.subreddit].sumConf += l.confidence * 100;
      }
    });
    return Object.entries(subs)
      .map(([subreddit, data]) => ({
        subreddit,
        count: data.count,
        avgIntent:     data.intentCount > 0 ? Math.round(data.sumIntent / data.intentCount) : 0,
        avgConfidence: data.confCount > 0   ? Math.round(data.sumConf   / data.confCount)   : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const displayedRows = showAll ? tableData : tableData.slice(0, 15);

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0.001 : 0.025 } }
  };

  const rowVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -15 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: shouldReduceMotion ? 0.01 : 0.35, ease: 'easeOut' as const }
    }
  };

  const getFillColor = (pct: number) => {
    if (pct > 60) return 'bg-[#C6FF34]';
    if (pct >= 40) return 'bg-amber-400';
    return 'bg-white/25';
  };

  return (
    <div style={{ ...glassStyle }} className="rounded-2xl overflow-hidden mb-5 w-full select-none border border-white/[0.08]">
      {/* Header Row */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex justify-between items-center">
        <h3 className="font-display text-base font-semibold text-white">
          Top Performing Subreddits
        </h3>
        <span className="font-mono text-[10px] bg-[#C6FF34]/10 border border-[#C6FF34]/20 text-[#C6FF34]/70 rounded-full px-3 py-1">
          {tableData.length} active feeds
        </span>
      </div>

      {tableData.length === 0 ? (
        <div className="p-8 text-center font-mono text-[11px] text-white/30">
          No subreddit data available.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Table Header Row */}
            <div className="bg-black/25 border-b border-white/[0.05] px-5 py-2.5 grid grid-cols-3 md:grid-cols-4 gap-4 font-mono text-[10px] text-white/22 tracking-widest uppercase">
              <div>Subreddit</div>
              <div>Lead Count</div>
              <div>Avg Intent</div>
              <div className="hidden md:block">Avg Confidence</div>
            </div>

            {/* Table Body Rows */}
            <motion.div
              variants={listVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="flex flex-col"
            >
              <AnimatePresence initial={false}>
                {displayedRows.map((row) => (
                  <motion.div
                    key={row.subreddit}
                    variants={rowVariants}
                    exit={{ opacity: 0, x: -15, transition: { duration: 0.2 } }}
                    className="grid grid-cols-3 md:grid-cols-4 gap-4 px-5 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025] transition-colors items-center"
                  >
                    {/* Subreddit */}
                    <div className="font-mono text-sm text-[#C6FF34]/75 font-medium truncate">
                      r/{row.subreddit}
                    </div>

                    {/* Lead Count */}
                    <div className="font-mono text-sm text-white/70 font-medium">
                      {row.count}
                    </div>

                    {/* Avg Intent */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-24 md:w-28 h-1.5 rounded-full bg-white/5 overflow-hidden flex-shrink-0 relative">
                        <motion.div
                          className={`h-full rounded-full ${getFillColor(row.avgIntent)}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.avgIntent}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: shouldReduceMotion ? 0.01 : 0.7, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="font-mono text-xs text-white/45 ml-1">
                        {row.avgIntent}%
                      </span>
                    </div>

                    {/* Avg Confidence */}
                    <div className="hidden md:flex items-center gap-2.5">
                      <div className="w-28 h-1.5 rounded-full bg-white/5 overflow-hidden flex-shrink-0 relative">
                        <motion.div
                          className={`h-full rounded-full ${getFillColor(row.avgConfidence)}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.avgConfidence}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: shouldReduceMotion ? 0.01 : 0.7, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="font-mono text-xs text-white/45 ml-1">
                        {row.avgConfidence}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      )}

      {/* Toggle Button if > 15 */}
      {tableData.length > 15 && (
        <div className="py-4 flex justify-center border-t border-white/[0.03]">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAll(!showAll)}
            className="font-mono text-xs text-white/40 hover:text-white/65 border border-white/8 rounded-full px-4 py-1.5 cursor-pointer outline-none flex items-center justify-center transition-colors bg-white/[0.01]"
          >
            {showAll ? 'SHOW LESS' : 'SHOW ALL'}
          </motion.button>
        </div>
      )}
    </div>
  );
}

export default TopSubredditsTable;
