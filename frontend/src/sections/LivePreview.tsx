import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Sparkles, Globe, RefreshCw, Send, ExternalLink } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface LivePreviewProps {
  onLaunch: () => void;
}

export function LivePreview({ onLaunch }: LivePreviewProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Monitor resize to disable parallax on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set up useScroll for parallax
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"]
  });

  // Scale: zooms in from 0.88 to 1.0
  const rawScale = useTransform(scrollYProgress, [0, 0.85], [0.88, 1.0]);
  // Y offset: translates from y:60 to y:0
  const rawY = useTransform(scrollYProgress, [0, 0.85], [60, 0]);

  // Spring animations for a cinematic, liquid feel
  const springScale = useSpring(rawScale, { stiffness: 45, damping: 15 });
  const springY = useSpring(rawY, { stiffness: 45, damping: 15 });

  // If mobile or prefers reduced motion, disable transitions
  const scaleValue = (isMobile || prefersReducedMotion) ? 1.0 : springScale;
  const yValue = (isMobile || prefersReducedMotion) ? 0 : springY;

  return (
    <section 
      ref={sectionRef}
      id="preview" 
      className="py-32 bg-[#0D0D0D] border-b border-white/5 relative z-10 select-none overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-16 flex flex-col items-center">
        
        {/* Heading */}
        <div className="text-center space-y-4">
          <span className="font-mono text-[9px] md:text-[10px] text-[#C6FF34] font-bold tracking-widest block uppercase">
            LIVE PRODUCT PREVIEW
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white">
            Qualified Leads, Zero Scrolling.
          </h2>
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto font-sans">
            Instantly view purchase signals scoring, draft outlines, and subreddits metrics in one interface.
          </p>
        </div>

        {/* Mockup Container with Glow */}
        <motion.div
          style={{
            scale: scaleValue,
            y: yValue,
          }}
          className="w-full relative glass-panel rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_0_40px_rgba(198,255,52,0.06),0_24px_64px_rgba(0,0,0,0.8)] bg-[#070708]"
        >
          {/* Subtle volt-lime glow behind preview */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 rounded-full bg-[#C6FF34]/[0.03] blur-[140px] pointer-events-none" />

          {/* Browser Chrome Bar */}
          <div className="bg-black/60 border-b border-white/5 px-4 py-3.5 flex items-center justify-between z-10 relative">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
            </div>
            
            {/* Address Bar */}
            <div className="px-6 md:px-20 py-1 rounded-lg glass-inset bg-white/[0.01] border border-white/5 text-[9px] md:text-[10px] text-gray-400 font-mono flex items-center gap-1.5 select-none max-w-[240px] md:max-w-none truncate">
              <Globe className="w-3 h-3 text-gray-600" />
              <span>app.signalradar.com/dashboard</span>
            </div>
            
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
            </div>
          </div>

          {/* High Fidelity Static Dashboard content */}
          <div className="p-4 md:p-8 space-y-6 bg-[#070708]/90 relative z-10">
            
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              <div className="glass-panel p-4 rounded-xl space-y-1 bg-white/[0.01] border border-white/[0.05] shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">MONITORED POSTS</span>
                <span className="font-mono text-lg md:text-2xl font-bold text-white">4,812</span>
              </div>
              <div className="glass-panel p-4 rounded-xl space-y-1 relative bg-white/[0.01] border border-white/[0.05] shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                <span className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#C6FF34] shadow-[0_0_6px_#C6FF34]" />
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block text-gray-400">ACTIVE LEADS</span>
                <span className="font-mono text-lg md:text-2xl font-bold text-[#C6FF34]">124</span>
              </div>
              <div className="glass-panel p-4 rounded-xl space-y-1 bg-white/[0.01] border border-white/[0.05] shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">CONVERSION RATE</span>
                <span className="font-mono text-lg md:text-2xl font-bold text-white">8.4%</span>
              </div>
            </div>

            {/* Signal ticker / marquee */}
            <div className="glass-panel py-2 px-4 rounded-xl bg-white/[0.01] border border-white/[0.05] overflow-hidden flex items-center gap-4">
              <span className="font-mono text-[9px] text-[#C6FF34] font-bold tracking-widest uppercase flex-shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF34] animate-pulse" />
                Live Signals:
              </span>
              <div className="flex gap-8 text-[10px] font-mono text-gray-400 overflow-hidden">
                <span className="flex-shrink-0">🟢 r/smallbusiness • CRM under $100</span>
                <span className="flex-shrink-0">🟡 r/SaaS • Stripe VAT compliance</span>
                <span className="flex-shrink-0">🟢 r/marketing • Newsletter tool recommendation</span>
                <span className="flex-shrink-0">🔴 r/startups • Programmatic SEO agency</span>
              </div>
            </div>

            {/* Mock Lead Cards */}
            <div className="space-y-4">
              {/* Lead Card 1 (High Intent) */}
              <div className="glass-panel border border-white/[0.05] border-l-[3px] border-l-[#C6FF34] p-5 md:p-6 rounded-xl bg-[#0A0A0A]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
                <div className="space-y-2 max-w-2xl text-left">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#C6FF34]/10 border border-[#C6FF34]/20 text-[#C6FF34] font-mono text-[9px] font-bold">
                      r/smallbusiness
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">18 minutes ago</span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide font-sans leading-snug">
                    Looking to buy a CRM tool for a 5-person agency, any recommendations?
                  </h3>
                  <p className="text-xs text-gray-400 font-sans line-clamp-2 leading-relaxed select-none">
                    Hey everyone, our agency is growing and spreadsheets aren't cutting it anymore. We need a CRM that is easy to use, integrates with Slack and Gmail, and costs under $100/month...
                  </p>
                </div>
                <div className="flex md:flex-col items-center md:items-end gap-3 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t border-white/5 md:border-none">
                  {/* Score pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel bg-white/[0.01] border-white/10">
                    <span className="font-mono text-[10px] text-[#C6FF34] font-bold">95</span>
                    <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">INTENT</span>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-lg border border-[#C6FF34]/20 hover:border-[#C6FF34]/50 bg-[#C6FF34]/5 text-[#C6FF34] font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-default">
                    <Send className="w-3 h-3" />
                    Draft Reply
                  </button>
                </div>
              </div>

              {/* Lead Card 2 (Medium Intent) */}
              <div className="glass-panel border border-white/[0.05] border-l-[3px] border-l-[#E8A838] p-5 md:p-6 rounded-xl bg-[#0A0A0A]/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-75 shadow-lg">
                <div className="space-y-2 max-w-2xl text-left">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#E8A838]/10 border border-[#E8A838]/20 text-[#E8A838] font-mono text-[9px] font-bold">
                      r/SaaS
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">45 minutes ago</span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide font-sans leading-snug">
                    Stripe vs Paddle for SaaS in Europe?
                  </h3>
                  <p className="text-xs text-gray-400 font-sans line-clamp-1 leading-relaxed select-none">
                    I'm launching a new B2B SaaS next month and am trying to decide between Stripe and Paddle. Stripe seems to have better APIs, but Paddle handles VAT/tax compliance...
                  </p>
                </div>
                <div className="flex md:flex-col items-center md:items-end gap-3 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t border-white/5 md:border-none">
                  {/* Score pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel bg-white/[0.01] border-white/10">
                    <span className="font-mono text-[10px] text-[#E8A838] font-bold">72</span>
                    <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">INTENT</span>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-default">
                    <Send className="w-3 h-3" />
                    Draft Reply
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Click layer / overlay to routes to dashboard */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] hover:backdrop-blur-[2px] transition-all flex items-center justify-center cursor-pointer group" onClick={onLaunch}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3.5 rounded-full bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_24px_rgba(198,255,52,0.4)] transition-all duration-300 border border-[#C6FF34]/10"
            >
              <Sparkles className="w-4 h-4 text-[#070708]" />
              Launch Live App Dashboard
            </motion.div>
          </div>
        </motion.div>

        {/* Outer Lime button below mockup */}
        <motion.button
          whileHover={{ y: -2, boxShadow: '0 0 24px rgba(198,255,52,0.35)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onLaunch}
          className="px-8 py-4 rounded-xl bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(198,255,52,0.2)] mt-8 border border-[#C6FF34]/10"
          style={{ minHeight: '44px' }}
        >
          Launch App Dashboard
          <ExternalLink className="w-4 h-4" />
        </motion.button>
      </div>
    </section>
  );
}

export default LivePreview;
