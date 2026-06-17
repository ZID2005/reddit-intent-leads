import React from 'react';
import { useSignalFeed } from '../hooks/useSignalFeed';

export function LiveSignalFeed() {
  const chips = useSignalFeed();

  return (
    <div className="w-full h-11 glass-panel border-l-2 border-l-lime flex items-center overflow-hidden z-10 select-none">
      {/* Label */}
      <div className="h-full flex items-center px-4 bg-carbon-dark/85 border-r border-white/5 font-mono text-[10px] text-lime font-bold tracking-widest z-20 whitespace-nowrap">
        LIVE SIGNALS
      </div>

      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        {/* Subtle left and right blurs to fade chips out */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-carbon-dark to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-carbon-dark to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee flex gap-8 items-center pl-4">
          {/* Double list for infinite marquee scrolling effect */}
          {chips.concat(chips).map((chip, idx) => (
            <div
              key={`${chip.id}-${idx}`}
              className="flex items-center gap-2 glass-panel border-white/5 bg-white/[0.01] px-3 py-1 rounded-full text-xs whitespace-nowrap"
            >
              <span>{chip.emoji}</span>
              <span className="font-mono text-lime font-medium">r/{chip.subreddit}</span>
              <span className="text-gray-300 max-w-[200px] truncate">{chip.title}</span>
              <span className="font-mono bg-lime/10 text-lime px-1.5 py-0.5 rounded text-[10px] font-bold">
                {chip.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default LiveSignalFeed;
