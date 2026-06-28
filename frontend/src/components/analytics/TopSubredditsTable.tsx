import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lead } from '../../types/lead';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const GODBER = "'Godber', sans-serif";
const NOHEMI = "'Nohemi', sans-serif";
const MONO = NOHEMI;
const LIME = '#C6FF34';

// ─── Liquid glass ──────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background:           'rgba(255,255,255,0.035)',
  border:               '1px solid rgba(255,255,255,0.08)',
  backdropFilter:       'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  borderRadius:         20,
  boxShadow:            '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
};

interface TopSubredditsTableProps {
  leads: Lead[];
}

export function TopSubredditsTable({ leads }: TopSubredditsTableProps) {
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

  return (
    <div style={{ ...glass, overflow: 'hidden', width: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h3 style={{ fontFamily: GODBER, fontWeight: 700, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>
          Top Performing Subreddits
        </h3>
        <span style={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.4)', borderRadius: 99, padding: '3px 10px',
          textTransform: 'uppercase',
        }}>
          {tableData.length} active feeds
        </span>
      </div>

      {tableData.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          No subreddit data available.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            {/* Table header */}
            <thead>
              <tr style={{
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                {['Subreddit', 'Lead Count', 'Avg Intent', 'Avg Confidence'].map((col, i) => (
                  <th key={col} style={{
                    padding: '12px 20px',
                    fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                    fontWeight: 400, whiteSpace: 'nowrap',
                    textAlign: i === 1 ? 'center' : i === 3 ? 'right' : 'left',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableData.map((row, idx) => (
                <motion.tr
                  key={row.subreddit}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.03, 0.4) }}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  className="group"
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent'; }}
                >
                  {/* Subreddit */}
                  <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(198,255,52,0.8)', fontWeight: 500 }}>
                      r/{row.subreddit}
                    </span>
                  </td>

                  {/* Lead Count */}
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: '#fff', fontWeight: 500 }}>{row.count}</span>
                  </td>

                  {/* Avg Intent */}
                  <td style={{ padding: '13px 20px', minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#fff', width: 32, flexShrink: 0 }}>{row.avgIntent}%</span>
                      <div style={{ flex: 1, maxWidth: 120, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                          style={{ height: '100%', background: 'rgba(198,255,52,0.7)', borderRadius: 99 }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.avgIntent}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.03 }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Avg Confidence */}
                  <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                      <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                          style={{ height: '100%', background: 'rgba(255,255,255,0.4)', borderRadius: 99 }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.avgConfidence}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.03 }}
                        />
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(52,211,153,0.9)', fontWeight: 700, width: 32, flexShrink: 0 }}>
                        {row.avgConfidence}%
                      </span>
                    </div>
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
