import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { User } from '@supabase/supabase-js';

import { Navbar } from '../sections/Navbar';
import { Hero } from '../sections/Hero';
import { Problem } from '../sections/Problem';
import { HowItWorks } from '../sections/HowItWorks';
import { LivePreview } from '../sections/LivePreview';
import { Pricing } from '../sections/Pricing';
import { AuthModal } from '../components/AuthModal';

interface LandingPageProps {
  user: User | null;
  onStartMonitoring: () => void;
  onLogout: () => void;
}

export function LandingPage({ user, onStartMonitoring, onLogout }: LandingPageProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "What Reddit data is used?",
      a: "SignalRadar monitors public subreddits, scanning posts and titles in real time. We do not track private user profiles, and all API interactions strictly adhere to Reddit's data access policies."
    },
    {
      q: "How does intent scoring work?",
      a: "Every post is analyzed by our AI model powered by Groq Llama-3. It assesses context, semantics, budget statements, timelines, and comparisons to assign an intent score (0-100) and priority level."
    },
    {
      q: "Does it work for any niche?",
      a: "Yes! Because the AI understands natural language context, it can detect signals for B2B SaaS, freelancers, marketing agencies, consumer products, mobile app developers, and custom software development houses."
    },
    {
      q: "What about data privacy?",
      a: "We only parse public discussions. Leads are securely stored in your dedicated Supabase instance. We never share your monitored keywords or ideal customer profile details with third parties."
    },
    {
      q: "What is the cancellation policy?",
      a: "You can cancel your subscription at any time with a single click. There are no lock-in contracts. You will retain access to your dashboard features until the end of your billing cycle."
    },
    {
      q: "Do you provide API access?",
      a: "Yes! Pro users get access to our Webhooks and REST API, allowing you to feed qualified intent leads directly into HubSpot, Salesforce, Zapier, or your own internal CRM."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white select-none relative overflow-x-hidden font-sans">
      
      {/* 1. Navbar */}
      <Navbar 
        user={user}
        onOpenAuth={handleOpenAuth}
        onNavigateToDashboard={onStartMonitoring}
        onLogout={onLogout}
      />

      {/* 2. Hero Section */}
      <Hero 
        onStart={user ? onStartMonitoring : () => handleOpenAuth('signup')}
        onWatchDemo={() => {
          document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 3. Problem Section */}
      <Problem />

      {/* 4. How It Works Section */}
      <HowItWorks />

      {/* 5. Live Product Preview Section */}
      <LivePreview onLaunch={onStartMonitoring} />

      {/* 6. Pricing Section */}
      <Pricing 
        onSelectTier={() => {
          if (user) {
            onStartMonitoring();
          } else {
            handleOpenAuth('signup');
          }
        }}
      />

      {/* 7. FAQ Section */}
      <section id="faq" className="py-32 px-6 md:px-12 max-w-3xl mx-auto space-y-16 select-none relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-4"
        >
          <span className="font-mono text-[9px] md:text-[10px] text-[#B8F200] font-bold tracking-widest block uppercase">
            COMMON QUESTIONS
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-sm md:text-base text-gray-500 max-w-sm mx-auto font-sans">
            Everything you need to know about the SignalRadar system.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="glass-panel rounded-2xl bg-[#141414]/40 border border-white/5 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-6 text-left text-sm md:text-base font-bold tracking-wide text-white hover:text-[#B8F200] transition-colors duration-150 font-sans cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transform transition-transform duration-300 flex-shrink-0 ${isOpen && 'rotate-180 text-[#B8F200]'}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="border-t border-white/5"
                    >
                      <div className="p-6 text-xs md:text-sm text-gray-400 leading-relaxed font-sans">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. CTA Section */}
      <section className="py-32 px-6 md:px-12 relative select-none z-10">
        <div className="max-w-4xl mx-auto rounded-3xl p-12 md:p-16 text-center relative overflow-hidden glass-panel border border-[#B8F200]/15 bg-gradient-to-br from-[#141414] to-[#0D0D0D] shadow-[0_12px_48px_rgba(0,0,0,0.8)] group">
          {/* Sweeping dot grid behind CTA */}
          <div className="absolute inset-0 opacity-[0.03] grid-dots pointer-events-none" />
          
          {/* Center Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 rounded-full bg-[#B8F200]/5 blur-[120px] pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-8 relative z-10 flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight leading-tight text-white">
              Start finding buyers while they're still deciding.
            </h2>
            <p className="text-xs md:text-sm font-mono uppercase tracking-widest text-[#B8F200] font-bold">
              No credit card required. Cancel anytime.
            </p>
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 0 24px rgba(184,242,0,0.35)' }}
              whileTap={{ scale: 0.97 }}
              onClick={user ? onStartMonitoring : () => handleOpenAuth('signup')}
              className="px-8 py-4 rounded-xl bg-[#B8F200] text-[#0D0D0D] font-mono text-xs font-bold uppercase tracking-widest cursor-pointer shadow-[0_0_15px_rgba(184,242,0,0.2)]"
            >
              Start Free Today
            </motion.button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/5 text-center text-xs text-gray-500 bg-[#0D0D0D] font-mono select-none uppercase tracking-widest">
        <p>&copy; {new Date().getFullYear()} SignalRadar. All rights reserved.</p>
      </footer>

      {/* Auth Modal Overlay */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authInitialMode}
      />

    </div>
  );
}

export default LandingPage;
