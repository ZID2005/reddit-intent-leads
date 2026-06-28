import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, AlertTriangle, GitCompare, Search, MessageSquare, X } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface CategoryData {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  min: number;
  max: number;
  description: string;
  borderAccent: string;
  hasDot?: boolean;
  duration: number;
  delay: number;
  examples: { subreddit: string; title: string }[];
  keywords: string[];
  dimmed?: boolean;
}

export function IntentScoring() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const headline = "Classifying Intent at Predictive Velocity";
  
  const headlineContainer = {
    hidden: {},
    visible: { 
      transition: { 
        staggerChildren: 0.08 
      } 
    }
  };

  const wordVariant = {
    hidden: { y: '110%', opacity: 0 },
    visible: { 
      y: '0%', 
      opacity: 1, 
      transition: { 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
      } 
    }
  };

  const categories: CategoryData[] = [
    {
      id: 'buying-intent',
      name: 'Buying Intent',
      icon: ShoppingCart,
      min: 75,
      max: 100,
      description: 'User is actively comparing or requesting purchase recommendations.',
      borderAccent: 'border-l-[3px] border-l-[#C6FF34]',
      hasDot: true,
      duration: 14,
      delay: 0,
      examples: [
        { subreddit: 'r/smallbusiness', title: 'What is the best CRM under $100/mo for a scaling B2B agency?' },
        { subreddit: 'r/SaaS', title: 'Looking for an automated social listening tool that sends Slack alerts.' },
        { subreddit: 'r/solopreneur', title: 'Need recommendations for email newsletter platforms with good deliverability.' }
      ],
      keywords: ['recommend', 'best tool', 'looking to buy']
    },
    {
      id: 'pain-point',
      name: 'Pain Point',
      icon: AlertTriangle,
      min: 55,
      max: 80,
      description: 'User expresses operational frustration that software could solve.',
      borderAccent: 'border-l-[3px] border-l-[#E8A838]',
      duration: 17,
      delay: 2,
      examples: [
        { subreddit: 'r/startups', title: 'Stripe VAT compliance is driving me crazy, accounting is a nightmare.' },
        { subreddit: 'r/marketing', title: 'Manual outreach takes 4 hours a day. Our response rate is too low.' },
        { subreddit: 'r/smallbusiness', title: 'Tired of client management spreadsheets breaking when teams scale.' }
      ],
      keywords: ['frustrated', 'takes too long', 'broken workflow']
    },
    {
      id: 'comparison',
      name: 'Comparison',
      icon: GitCompare,
      min: 60,
      max: 85,
      description: 'User is evaluating multiple solutions side by side.',
      borderAccent: 'border-l-[3px] border-l-white/20',
      duration: 12,
      delay: 4,
      examples: [
        { subreddit: 'r/SaaS', title: 'PostgreSQL vs MongoDB for a read-heavy content application?' },
        { subreddit: 'r/entrepreneur', title: 'Paddle vs Stripe Merchant of Record for EU sales?' },
        { subreddit: 'r/webdev', title: 'Tailwind CSS vs Vanilla CSS for maximum styling flexibility?' }
      ],
      keywords: ['vs', 'difference between', 'comparison']
    },
    {
      id: 'research',
      name: 'Research',
      icon: Search,
      min: 35,
      max: 60,
      description: 'User gathering information before making a purchase decision.',
      borderAccent: 'border-l-[3px] border-l-white/15',
      duration: 19,
      delay: 1,
      examples: [
        { subreddit: 'r/startups', title: 'How are early stage startups handling SOC2 compliance in 2026?' },
        { subreddit: 'r/marketing', title: 'What is the typical conversion rate for programmatic SEO landing pages?' },
        { subreddit: 'r/smallbusiness', title: 'Average marketing budget for a local consulting agency?' }
      ],
      keywords: ['how to', 'what is', 'trends in']
    },
    {
      id: 'discussion',
      name: 'Discussion',
      icon: MessageSquare,
      min: 0,
      max: 35,
      description: 'General conversation with no commercial intent detected.',
      borderAccent: 'border-l-[3px] border-l-white/10',
      dimmed: true,
      duration: 15,
      delay: 3,
      examples: [
        { subreddit: 'r/entrepreneur', title: 'What was your biggest business mistake and how did you recover?' },
        { subreddit: 'r/solopreneur', title: 'How do you stay motivated working alone from a home office?' },
        { subreddit: 'r/SaaS', title: 'Show r/SaaS: Finally reached $500 MRR after 6 months of building!' }
      ],
      keywords: ['thoughts on', 'how did you', 'my story']
    }
  ];

  const activeCard = activeCardIndex !== null ? categories[activeCardIndex] : null;

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const CardComponent = ({ card, index, isMobileLayout = false }: { card: CategoryData; index: number; isMobileLayout?: boolean }) => {
    const isSelected = activeCardIndex === index;
    const isAnySelected = activeCardIndex !== null;
    
    let cardOpacity = 1;
    if (card.dimmed) cardOpacity = 0.6;
    if (isAnySelected && !isSelected) cardOpacity = 0.5;

    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 40 },
          visible: { 
            opacity: cardOpacity, 
            y: 0,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
          }
        }}
        animate={prefersReducedMotion || !hasEntered ? undefined : {
          y: [0, -8, 0],
          opacity: cardOpacity
        }}
        transition={{
          y: {
            duration: card.duration,
            delay: card.delay,
            ease: "easeInOut",
            repeat: Infinity
          },
          opacity: { duration: 0.3 }
        }}
        onClick={() => {
          if (isSelected) {
            setActiveCardIndex(null);
          } else {
            setActiveCardIndex(index);
          }
        }}
        className={`card-liquid-glass rounded-[24px] p-5 cursor-pointer relative w-full md:w-[220px] ${card.borderAccent} ${
          isSelected ? 'card-liquid-glass-selected' : ''
        }`}
      >
        {card.hasDot && (
          <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6FF34] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C6FF34]"></span>
          </span>
        )}

        <div className="flex flex-col h-full text-left justify-between min-h-[170px]">
          <div>
            <div className="w-8 h-8 text-[#C6FF34] mb-3 flex items-center justify-start">
              <card.icon className="w-6 h-6" />
            </div>
            <h3 className="font-display text-base font-bold text-white tracking-wide">
              {card.name}
            </h3>
            <p className="font-sans text-[11px] text-white/45 mt-1 leading-relaxed">
              {card.description}
            </p>
          </div>
          <div>
            <span className="font-spacemono text-[10px] bg-[#C6FF34]/10 border border-[#C6FF34]/20 text-[#C6FF34]/70 rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 mt-4">
              <span className="w-1 h-1 rounded-full bg-[#C6FF34]" />
              Score: {card.min}-{card.max}
            </span>
          </div>
        </div>

        {/* Active Card Caret Indicator */}
        <AnimatePresence>
          {isSelected && !isMobileLayout && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.5 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20"
            >
              <div 
                className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px]"
                style={{
                  borderTopColor: '#C6FF34',
                  filter: 'drop-shadow(0 4px 8px rgba(198,255,52,0.5))'
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <section 
      id="intent-engine" 
      className="py-32 bg-[#070708] border-b border-white/5 relative z-10 select-none overflow-hidden grid-dots"
    >
      {/* High-fidelity color mesh background blobs for glass refraction */}
      <div 
        className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full pointer-events-none z-0 opacity-20 blur-[110px]" 
        style={{
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 75%)',
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full pointer-events-none z-0 opacity-15 blur-[110px]" 
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 75%)',
        }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full pointer-events-none z-0 opacity-[0.14] blur-[120px]" 
        style={{
          background: 'radial-gradient(circle, rgba(198,255,52,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10 text-center">
        
        {/* Section Header */}
        <div className="space-y-4 mb-20">
          <span className="font-spacemono text-xs text-[#C6FF34]/60 font-bold tracking-[0.2em] block uppercase">
            INTENT CLASSIFICATION ENGINE
          </span>
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={headlineContainer}
            className="text-3xl md:text-5xl font-bold font-syne tracking-tight text-white select-none py-1 overflow-hidden leading-tight"
          >
            {headline.split(' ').map((w, i) => (
              <span key={i} className="inline-block overflow-hidden mr-[0.25em] last:mr-0">
                <motion.span
                  variants={wordVariant}
                  className="inline-block"
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </motion.h2>
          <p className="font-sans text-white/40 text-sm max-w-lg mx-auto text-center mt-3">
            Real-time categorization logic mapping semantic signals to purchase pipelines.
          </p>
        </div>

        {/* Floating cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          onViewportEnter={() => setHasEntered(true)}
          className="relative w-full z-10 flex flex-col items-center justify-center gap-12"
        >
          {/* Desktop Asymmetric layout */}
          <div className="hidden md:flex flex-col gap-12 items-center justify-center pt-8">
            {/* Top Row: [Card 1] [Card 2 Raised] [Card 3] */}
            <div className="flex flex-row justify-center items-start gap-8">
              <div className="translate-y-0">
                <CardComponent card={categories[0]} index={0} />
              </div>
              <div className="-translate-y-6">
                <CardComponent card={categories[1]} index={1} />
              </div>
              <div className="translate-y-0">
                <CardComponent card={categories[2]} index={2} />
              </div>
            </div>
            {/* Bottom Row: [Card 4] [Card 5] Centered */}
            <div className="flex flex-row justify-center items-center gap-8">
              <CardComponent card={categories[3]} index={3} />
              <CardComponent card={categories[4]} index={4} />
            </div>
          </div>

          {/* Mobile Layout stack */}
          <div className="flex md:hidden flex-col gap-6 w-full px-4">
            {categories.map((cat, idx) => (
              <CardComponent key={cat.id} card={cat} index={idx} isMobileLayout />
            ))}
          </div>
        </motion.div>

        {/* Desktop Expanded Detail Panel */}
        <AnimatePresence mode="wait">
          {activeCard && !isMobile && (
            <motion.div
              key={activeCard.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden w-full hidden md:block"
            >
              <div className="notif-glass-panel rounded-2xl p-8 mt-12 relative text-left overflow-hidden">
                {/* Specular glass reflection crescent */}
                <div className="absolute top-0.5 left-2.5 right-2.5 h-[35%] bg-gradient-to-b from-white/10 to-transparent rounded-t-2xl pointer-events-none z-10" />
                {/* Close Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveCardIndex(null)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white p-2 cursor-pointer border-none outline-none"
                >
                  <X className="w-5 h-5" />
                </motion.button>
                
                {/* 3 columns */}
                <div className="grid grid-cols-3 gap-8">
                  {/* Column 1: Example Signals */}
                  <div className="space-y-4">
                    <span className="font-spacemono text-[10px] text-[#C6FF34]/50 tracking-[0.2em] uppercase block">
                      EXAMPLE SIGNALS
                    </span>
                    <div className="space-y-3">
                      {activeCard.examples.map((ex, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF34] mt-2 flex-shrink-0 animate-pulse" />
                          <div className="space-y-0.5">
                            <span className="font-spacemono text-[10px] text-[#C6FF34]/50">{ex.subreddit}</span>
                            <p className="font-sans text-xs text-white/70 leading-relaxed">{ex.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Score Distribution */}
                  <div className="space-y-4">
                    <span className="font-spacemono text-[10px] text-white/50 tracking-[0.2em] uppercase block">
                      SCORE DISTRIBUTION
                    </span>
                    <div className="pt-4 space-y-4">
                      <div className="relative w-full h-2 bg-white/10 rounded-full">
                        <motion.div
                          initial={{ left: "0%", width: "0%" }}
                          animate={{ left: `${activeCard.min}%`, width: `${activeCard.max - activeCard.min}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute h-full rounded-full bg-gradient-to-r from-[#C6FF34] to-[#C6FF34]/60"
                        />
                      </div>
                      <div className="flex justify-between font-spacemono text-[10px] text-white/40">
                        <span>0</span>
                        <span className="text-[#C6FF34] font-bold">{activeCard.min} - {activeCard.max} Score Range</span>
                        <span>100</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Detection Logic */}
                  <div className="space-y-4">
                    <span className="font-spacemono text-[10px] text-white/50 tracking-[0.2em] uppercase block">
                      HOW WE DETECT IT
                    </span>
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.1 } }
                      }}
                      className="flex flex-wrap gap-2 pt-2"
                    >
                      {activeCard.keywords.map((kw, idx) => (
                        <motion.span
                          key={idx}
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { opacity: 1, y: 0 }
                          }}
                          className="px-3 py-1 rounded-full bg-white/5 border border-white/10 font-spacemono text-xs text-white/60"
                        >
                          {kw}
                        </motion.span>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Sheet Drawer */}
        <AnimatePresence>
          {activeCard && isMobile && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveCardIndex(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 pointer-events-auto"
              />
              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed inset-x-0 bottom-0 z-50 notif-glass-panel border-t border-white/14 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto w-full pointer-events-auto flex flex-col text-left overflow-hidden"
              >
                {/* Specular glass reflection crescent */}
                <div className="absolute top-0.5 left-2.5 right-2.5 h-[20%] bg-gradient-to-b from-white/8 to-transparent rounded-t-3xl pointer-events-none z-10" />
                {/* Drag handle */}
                <div 
                  className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 flex-shrink-0 cursor-pointer" 
                  onClick={() => setActiveCardIndex(null)} 
                />
                
                {/* Close Button */}
                <button
                  onClick={() => setActiveCardIndex(null)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white p-2 cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Detail content */}
                <div className="space-y-8 pb-8">
                  {/* Column 1: Examples */}
                  <div className="space-y-3">
                    <span className="font-spacemono text-[10px] text-[#C6FF34]/50 tracking-[0.2em] uppercase block">
                      EXAMPLE SIGNALS
                    </span>
                    <div className="space-y-3">
                      {activeCard.examples.map((ex, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF34] mt-2 flex-shrink-0 animate-pulse" />
                          <div className="space-y-0.5">
                            <span className="font-spacemono text-[10px] text-[#C6FF34]/50">{ex.subreddit}</span>
                            <p className="font-sans text-xs text-white/80 leading-relaxed">{ex.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Score Distribution */}
                  <div className="space-y-3">
                    <span className="font-spacemono text-[10px] text-white/50 tracking-[0.2em] uppercase block">
                      SCORE DISTRIBUTION
                    </span>
                    <div className="space-y-3">
                      <div className="relative w-full h-2 bg-white/10 rounded-full mt-2">
                        <motion.div
                          initial={{ left: "0%", width: "0%" }}
                          animate={{ left: `${activeCard.min}%`, width: `${activeCard.max - activeCard.min}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="absolute h-full rounded-full bg-gradient-to-r from-[#C6FF34] to-[#C6FF34]/60"
                        />
                      </div>
                      <div className="flex justify-between font-spacemono text-[10px] text-white/40">
                        <span>0</span>
                        <span className="text-[#C6FF34] font-bold">{activeCard.min} - {activeCard.max} Score Range</span>
                        <span>100</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Detection Logic */}
                  <div className="space-y-3">
                    <span className="font-spacemono text-[10px] text-white/50 tracking-[0.2em] uppercase block">
                      HOW WE DETECT IT
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activeCard.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-white/5 border border-white/10 font-spacemono text-xs text-white/60"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}

export default IntentScoring;
