import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track scroll position of the section to animate the SVG line
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  // Animate the line drawing by changing the strokeDashoffset
  // The path length is approximately 600.
  const pathLength = 600;
  const strokeDashoffset = useTransform(scrollYProgress, [0, 0.85], [pathLength, 0]);

  const steps = [
    {
      num: "01",
      title: "Define Your ICP",
      desc: "Input description about your ideal customer, target products, subreddits, and keywords.",
      side: "left"
    },
    {
      num: "02",
      title: "AI Scans Reddit",
      desc: "Our background pipeline monitors posts and scores them for buying intent using Groq Llama 3 models.",
      side: "right"
    },
    {
      num: "03",
      title: "Act on Hot Leads",
      desc: "Review scored signals in your dashboard and copy personalized draft replies instantly.",
      side: "left"
    }
  ];

  return (
    <section 
      ref={containerRef}
      id="how-it-works" 
      className="py-32 bg-[#141414] border-y border-white/5 relative z-10 select-none overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-20">
        
        {/* Heading */}
        <div className="text-center space-y-4">
          <span className="font-mono text-[9px] md:text-[10px] text-[#B8F200] font-bold tracking-widest block uppercase">
            3-STEP AUTOMATION
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white">
            How SignalRadar Works
          </h2>
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto font-sans">
            Our autonomous intelligence agent connects you directly to active conversations.
          </p>
        </div>

        {/* Steps Flow Container */}
        <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-6 mt-16 pb-12">
          
          {/* Connecting Dashed Line for Desktop */}
          <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-[4px] z-0 pointer-events-none">
            <svg width="100%" height="20" viewBox="0 0 800 20" fill="none" preserveAspectRatio="none" className="w-full">
              {/* Background faint line */}
              <path 
                d="M 10 10 H 790" 
                stroke="rgba(255, 255, 255, 0.05)" 
                strokeWidth="3" 
                strokeDasharray="8 8"
              />
              {/* Animated drawing line */}
              <motion.path 
                d="M 10 10 H 790" 
                stroke="#B8F200" 
                strokeWidth="3" 
                strokeDasharray="8 8"
                style={{
                  strokeDashoffset,
                  strokeDasharray: 8
                }}
              />
            </svg>
          </div>

          {/* Connecting Dashed Line for Mobile (Vertical) */}
          <div className="md:hidden absolute top-[100px] bottom-[100px] left-[32px] w-[2px] z-0 pointer-events-none">
            <svg width="2" height="100%" viewBox="0 0 2 400" fill="none" preserveAspectRatio="none" className="h-full w-full">
              <path 
                d="M 1 0 V 400" 
                stroke="rgba(255, 255, 255, 0.05)" 
                strokeWidth="2" 
                strokeDasharray="6 6"
              />
              <motion.path 
                d="M 1 0 V 400" 
                stroke="#B8F200" 
                strokeWidth="2" 
                strokeDasharray="6 6"
                style={{
                  strokeDashoffset: useTransform(scrollYProgress, [0, 0.85], [400, 0])
                }}
              />
            </svg>
          </div>

          {/* Step Cards */}
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ 
                opacity: 0, 
                x: step.side === 'left' ? -35 : 35 
              }}
              whileInView={{ 
                opacity: 1, 
                x: 0,
                transition: {
                  duration: 0.7,
                  ease: [0.215, 0.61, 0.355, 1], // easeOut
                  delay: idx * 0.1
                }
              }}
              viewport={{ once: true, margin: "-80px" }}
              whileHover={{ y: -4 }}
              className="flex-1 pl-12 md:pl-0 relative z-10"
            >
              {/* Card Surface */}
              <div className="glass-panel bg-[#141414]/60 p-8 rounded-2xl space-y-4 border border-white/5 relative group h-full">
                {/* Micro glow effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#B8F200]/1 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

                {/* Step Number */}
                <span className="font-mono text-4xl md:text-5xl text-[#B8F200] font-bold block select-none">
                  {step.num}
                </span>
                
                {/* Title */}
                <h4 className="text-base md:text-lg font-bold text-white tracking-wide font-sans">
                  {step.title}
                </h4>

                {/* Description */}
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-sans select-none">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
export default HowItWorks;
