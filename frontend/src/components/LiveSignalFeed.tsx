import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useSignalFeed } from '../hooks/useSignalFeed';
import { glassStyle } from '../lib/glass';

export function LiveSignalFeed() {
  const chips = useSignalFeed();
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      x: [0, '-50%'],
      transition: {
        ease: 'linear',
        duration: 35,
        repeat: Infinity,
      }
    });
  }, [controls]);

  return (
    <div 
      style={{
        ...glassStyle,
        height: '36px',
        borderRadius: '0px',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
      }}
      className="w-full flex items-center overflow-hidden z-30 select-none bg-[#070708]/80 backdrop-blur-md"
    >
      {/* Label */}
      <div className="h-full flex items-center px-4 font-mono text-[10px] text-[#C6FF34]/60 tracking-widest z-20 border-r border-white/[0.06] shrink-0 uppercase bg-[#070708]">
        LIVE SIGNALS
      </div>

      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        {/* Subtle left and right blurs to fade chips out */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#070708] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#070708] to-transparent z-10 pointer-events-none" />

        <motion.div 
          animate={controls}
          onHoverStart={() => controls.stop()}
          onHoverEnd={() => {
            controls.start({
              x: [null, '-50%'],
              transition: {
                ease: 'linear',
                duration: 35,
                repeat: Infinity,
              }
            });
          }}
          className="flex gap-6 items-center pl-6 whitespace-nowrap"
        >
          {/* Double list for infinite marquee scrolling effect */}
          {chips.concat(chips).map((chip, idx) => {
            const isHigh = chip.score >= 80;
            const isMedium = chip.score >= 60;
            return (
              <div
                key={`${chip.id}-${idx}`}
                className="inline-flex items-center gap-2"
              >
                {/* Priority dot */}
                <div 
                  className={`w-1.5 h-1.5 rounded-full ${
                    isHigh ? 'bg-[#C6FF34]' : isMedium ? 'bg-amber-400' : 'bg-gray-500'
                  }`} 
                />
                
                {/* Subreddit */}
                <span className="font-mono text-[10px] text-[#C6FF34]/70">r/{chip.subreddit}</span>
                
                {/* Title */}
                <span className="font-sans text-xs text-white/55 max-w-[160px] truncate">{chip.title}</span>
                
                {/* Score badge */}
                <span className="font-mono text-[10px] bg-white/5 border border-white/8 rounded-full px-2 py-0.5 text-white/45">
                  {chip.score}%
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

export default LiveSignalFeed;
