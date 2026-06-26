import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';

interface SubredditData {
  name: string;
  postsScanned: number;
  leadsFound: number;
  avgScore: number;
  topCategory: string;
  velocity: 'High' | 'Medium' | 'Low';
  lastScan: string;
}

const subreddits: SubredditData[] = [
  { name: 'r/startups', postsScanned: 847, leadsFound: 42, avgScore: 78, topCategory: 'Buying Intent', velocity: 'High', lastScan: '2m ago' },
  { name: 'r/smallbusiness', postsScanned: 623, leadsFound: 31, avgScore: 72, topCategory: 'Pain Point', velocity: 'High', lastScan: '4m ago' },
  { name: 'r/SaaS', postsScanned: 412, leadsFound: 28, avgScore: 81, topCategory: 'Comparison', velocity: 'Medium', lastScan: '6m ago' },
  { name: 'r/entrepreneur', postsScanned: 534, leadsFound: 19, avgScore: 65, topCategory: 'Research', velocity: 'Medium', lastScan: '8m ago' },
  { name: 'r/webdev', postsScanned: 298, leadsFound: 11, avgScore: 58, topCategory: 'Pain Point', velocity: 'Low', lastScan: '12m ago' },
  { name: 'r/freelance', postsScanned: 187, leadsFound: 8, avgScore: 61, topCategory: 'Buying Intent', velocity: 'Low', lastScan: '15m ago' },
  { name: 'r/marketing', postsScanned: 445, leadsFound: 24, avgScore: 69, topCategory: 'Comparison', velocity: 'Medium', lastScan: '10m ago' },
];

export function SubredditCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      skipSnaps: false,
    },
    [AutoScroll({ speed: 1.0, stopOnInteraction: false, stopOnMouseEnter: false })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const onCardClick = useCallback((index: number) => {
    if (!emblaApi) return;
    emblaApi.scrollTo(index);
  }, [emblaApi]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      
      {/* Carousel Container */}
      <div className="w-full overflow-hidden px-4 md:px-0" ref={emblaRef}>
        <div className="flex gap-4 md:gap-6 py-6 items-center">
          {subreddits.map((sub, index) => {
            const isActive = selectedIndex === index;

            return (
              <div
                key={sub.name}
                onClick={() => onCardClick(index)}
                className="flex-shrink-0 cursor-pointer transition-all duration-300 w-[85%] md:w-[400px] h-[340px]"
              >
                <motion.div
                  animate={{
                    clipPath: isActive
                      ? "inset(0% 0% 0% 0% round 2.5rem)"
                      : "inset(15% 0% 15% 0% round 2.5rem)",
                    opacity: isActive ? 1 : 0.65,
                    borderColor: isActive ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.08)",
                    boxShadow: isActive 
                      ? "0 24px 50px -12px rgba(0, 0, 0, 0.65), inset 0 1.5px 0 0 rgba(255, 255, 255, 0.3), inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.4), inset 0 12px 24px -10px rgba(255, 255, 255, 0.15)" 
                      : "none",
                  }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={`backdrop-blur-3xl rounded-[2.5rem] p-6 h-full flex flex-col justify-between overflow-hidden relative border ${
                    isActive ? 'bg-white/[0.06]' : 'bg-white/[0.02]'
                  }`}
                  style={{
                    backdropFilter: isActive ? "blur(32px) saturate(220%)" : "blur(16px)",
                    WebkitBackdropFilter: isActive ? "blur(32px) saturate(220%)" : "blur(16px)",
                  }}
                >
                  <AnimatePresence mode="wait">
                    {isActive ? (
                      <motion.div
                        key="active"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="h-full flex flex-col justify-between text-left"
                      >
                        {/* Top Row: Subreddit & Velocity badge */}
                        <div className="flex items-center justify-between">
                          <span className="font-godber text-2xl font-bold text-white tracking-wide">
                            {sub.name}
                          </span>
                          <span
                            className={`font-godber text-[10px] font-bold rounded-full px-2.5 py-1 ${
                              sub.velocity === 'High'
                                ? 'bg-[#C6FF34] text-black font-semibold'
                                : sub.velocity === 'Medium'
                                ? 'bg-[#E8A838] text-black font-semibold'
                                : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {sub.velocity} Velocity
                          </span>
                        </div>

                        {/* Middle Stats Grid 2x2 - Structured Glassmorphic Inset Sub-cards */}
                        <div className="grid grid-cols-2 gap-3.5 my-auto">
                          <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl flex flex-col justify-between shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.06)]">
                            <span className="font-godber text-[9px] text-white/40 tracking-wider">POSTS SCANNED</span>
                            <span className="font-godber text-xl md:text-2xl font-extrabold text-white mt-1">{sub.postsScanned}</span>
                          </div>
                          <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl flex flex-col justify-between shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.06)]">
                            <span className="font-godber text-[9px] text-white/40 tracking-wider">LEADS FOUND</span>
                            <span className="font-godber text-xl md:text-2xl font-extrabold text-[#C6FF34] mt-1">{sub.leadsFound}</span>
                          </div>
                          <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl flex flex-col justify-between shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.06)]">
                            <span className="font-godber text-[9px] text-white/40 tracking-wider">AVG SCORE</span>
                            <span className="font-godber text-xl md:text-2xl font-extrabold text-white mt-1">{sub.avgScore}</span>
                          </div>
                          <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl flex flex-col justify-between shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.06)] animate-none">
                            <span className="font-godber text-[9px] text-white/40 tracking-wider">TOP INTENT</span>
                            <span className="font-godber text-sm md:text-base font-extrabold text-[#C6FF34] mt-1.5 block truncate">{sub.topCategory}</span>
                          </div>
                        </div>

                        {/* Bottom: Scan status & progress line */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-1 font-godber text-[10px] text-white/25">
                            <Clock className="w-3.5 h-3.5 animate-none" />
                            <span>Last scan: {sub.lastScan}</span>
                          </div>
                          
                          {/* Animated Progress bar */}
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: "0%" }}
                              animate={{
                                width:
                                  sub.velocity === 'High'
                                    ? '90%'
                                    : sub.velocity === 'Medium'
                                    ? '55%'
                                    : '25%'
                              }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full rounded-full animate-none"
                              style={{
                                backgroundColor:
                                  sub.velocity === 'High'
                                    ? '#C6FF34'
                                    : sub.velocity === 'Medium'
                                    ? '#E8A838'
                                    : 'rgba(255, 255, 255, 0.3)'
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="inactive"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="h-full flex items-center justify-center"
                      >
                        <span className="font-godber text-lg font-semibold text-white/50 tracking-wide">
                          {sub.name}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default SubredditCarousel;
