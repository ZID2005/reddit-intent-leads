import React from 'react';
import { motion } from 'framer-motion';
import { SubredditCarousel } from '../components/SubredditCarousel';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export function SubredditsTable() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section 
      id="monitored-channels" 
      className="py-32 bg-[#0A0A0A] border-b border-white/5 relative z-10 select-none overflow-hidden"
    >
      {/* Liquid Glass Fluid Backdrop Mesh (Mimicking the Jack White music card background) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-50">
        {/* Blob 1: Cyan/Teal */}
        <div 
          className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[400px] rounded-full blur-[130px]" 
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, rgba(59, 130, 246, 0.25) 50%, transparent 100%)',
          }}
        />
        {/* Blob 2: Volt Lime */}
        <div 
          className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-[130px]" 
          style={{
            background: 'radial-gradient(circle, rgba(198, 255, 52, 0.2) 0%, rgba(6, 182, 212, 0.15) 60%, transparent 100%)',
          }}
        />
        {/* Blob 3: Vibrant Royal Blue */}
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full blur-[150px]" 
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(6, 182, 212, 0.2) 60%, transparent 100%)',
          }}
        />
      </div>

      {/* Scroll triggered entrance */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl mx-auto px-6 md:px-12 space-y-16 relative z-10"
      >
        
        {/* Section Header */}
        <div className="text-center space-y-4">
          <span className="font-spacemono text-xs text-[#C6FF34]/60 font-bold tracking-[0.2em] block uppercase">
            LIVE MONITORING
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-syne tracking-tight text-white leading-tight">
            Scanned Subreddits and Velocity
          </h2>
          <div className="divider-scanline max-w-sm mx-auto my-4" />
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto font-sans leading-relaxed">
            Real-time intelligence across your target communities.
          </p>
        </div>

        {/* Carousel Component */}
        <SubredditCarousel />

      </motion.div>
    </section>
  );
}

export default SubredditsTable;
