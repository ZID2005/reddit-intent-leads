import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lead } from '../../types/lead';

interface TopSubredditsTableProps {
  leads: Lead[];
}

export function TopSubredditsTable({ leads }: TopSubredditsTableProps) {
  const tableData = useMemo(() => {
    const subs: Record<string, { 
      count: number; 
      intentCount: number; 
      sumIntent: number; 
      confCount: number; 
      sumConf: number; 
    }> = {};
    
    leads.forEach(l => {
      if (!subs[l.subreddit]) {
        subs[l.subreddit] = { count: 0, intentCount: 0, sumIntent: 0, confCount: 0, sumConf: 0 };
      }
      subs[l.subreddit].count++;
      if (l.intent_score !== null && l.intent_score !== undefined && l.intent_score > 0) {
        subs[l.subreddit].intentCount++;
        subs[l.subreddit].sumIntent += l.intent_score;
      }
      if (l.confidence !== null && l.confidence !== undefined && l.confidence > 0) {
        subs[l.subreddit].confCount++;
        subs[l.subreddit].sumConf += l.confidence * 100;
      }
    });

    return Object.entries(subs)
      .map(([subreddit, data]) => ({
        subreddit,
        count: data.count,
        avgIntent: data.intentCount > 0 ? Math.round(data.sumIntent / data.intentCount) : 0,
        avgConfidence: data.confCount > 0 ? Math.round(data.sumConf / data.confCount) : 0,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [leads]);

  return (
    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden w-full select-none">
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-widest text-mutedText/85">
          Top Performing Subreddits
        </h3>
        <span className="font-mono text-[9px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
          {tableData.length} active feeds
        </span>
      </div>

      {tableData.length === 0 ? (
        <div className="p-8 text-center text-xs text-mutedText font-mono">
          No subreddit data available.
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-mutedText text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Subreddit</th>
                <th className="py-3.5 px-5 text-center">Lead Count</th>
                <th className="py-3.5 px-5">Average Intent</th>
                <th className="py-3.5 px-5 text-right pr-6">Average Confidence</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <motion.tr
                  key={row.subreddit}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors duration-150 group"
                >
                  {/* Subreddit name */}
                  <td className="py-3.5 px-5 font-semibold text-white/90">
                    <span className="text-lime group-hover:text-lime-accent transition-colors">r/</span>
                    {row.subreddit}
                  </td>
                  
                  {/* Lead Count */}
                  <td className="py-3.5 px-5 text-center font-bold text-white">
                    {row.count}
                  </td>
                  
                  {/* Average Intent Score + progress bar */}
                  <td className="py-3.5 px-5 min-w-[150px]">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-white font-medium">{row.avgIntent}%</span>
                      <div className="flex-1 max-w-[120px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lime rounded-full"
                          style={{ width: `${row.avgIntent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  
                  {/* Average Confidence */}
                  <td className="py-3.5 px-5 text-right pr-6 text-emerald-400 font-bold">
                    {row.avgConfidence}%
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default TopSubredditsTable;
