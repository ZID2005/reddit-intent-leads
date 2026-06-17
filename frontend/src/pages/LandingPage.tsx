import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, AlertTriangle, ShieldCheck, Rss, Cpu, 
  ArrowRight, Play, CheckCircle, ChevronDown, Sparkles 
} from 'lucide-react';

interface LandingPageProps {
  onStartMonitoring: () => void;
}

export function LandingPage({ onStartMonitoring }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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
    <div className="min-h-screen bg-carbon-dark text-white select-none relative overflow-x-hidden font-sans">
      
      {/* 1. Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 glass-panel border-t-0 border-r-0 border-l-0 bg-carbon-dark/75 backdrop-blur-md z-50 flex items-center justify-between px-6 md:px-12 select-none">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-lime animate-pulse shadow-[0_0_8px_#C6FF34]" />
          <span className="font-mono text-base font-bold tracking-wider text-white">
            SignalRadar
          </span>
        </div>
        
        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-mono tracking-widest text-gray-400 uppercase">
          <a href="#how-it-works" className="hover:text-lime transition-colors">How It Works</a>
          <a href="#preview" className="hover:text-lime transition-colors">Product Preview</a>
          <a href="#pricing" className="hover:text-lime transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-lime transition-colors">FAQ</a>
        </nav>

        {/* CTA Button */}
        <button
          onClick={onStartMonitoring}
          className="px-4 py-2 border border-lime text-lime rounded-full text-xs font-mono uppercase tracking-wider hover:bg-lime/10 transition-colors duration-150"
        >
          Start Free
        </button>
      </header>

      {/* 2. Hero Section */}
      <section className="min-h-screen pt-16 flex flex-col items-center justify-center text-center px-6 md:px-12 relative overflow-hidden">
        {/* Animated Radial sweep pulse bg */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-lime/5 blur-[80px] radar-sweep-bg" />
        </div>

        <div className="max-w-4xl space-y-6 z-10 relative mt-8">
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-tight text-white font-sans">
            Find Buying Signals <br />
            <span className="text-lime">Before Your Competitors</span>
          </h1>
          <p className="text-base md:text-lg text-mutedText max-w-2xl mx-auto leading-relaxed">
            SignalRadar monitors Reddit communities in real time, identifies purchase intent, and delivers qualified leads with AI-generated outreach suggestions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {/* Primary CTA */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartMonitoring}
              className="px-8 py-3.5 rounded-full bg-lime hover:bg-lime/90 text-carbon font-mono text-sm font-semibold uppercase tracking-wider flex items-center gap-2 shadow-[0_4px_20px_rgba(198,255,52,0.15)]"
            >
              Start Monitoring Signals
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            {/* Secondary CTA */}
            <a
              href="#how-it-works"
              className="px-6 py-3.5 text-gray-400 hover:text-white font-mono text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-white/[0.02] rounded-full transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              See How It Works
            </a>
          </div>

          {/* Social Proof Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-12">
            <div className="px-4 py-2 glass-panel bg-white/[0.01] rounded-full font-mono text-[10px] text-gray-300 tracking-wider">
              🟢 <span className="text-lime font-bold">1,200+</span> SIGNALS PROCESSED
            </div>
            <div className="px-4 py-2 glass-panel bg-white/[0.01] rounded-full font-mono text-[10px] text-gray-300 tracking-wider">
              🎯 <span className="text-lime font-bold">94%</span> ACCURACY RATE
            </div>
            <div className="px-4 py-2 glass-panel bg-white/[0.01] rounded-full font-mono text-[10px] text-gray-300 tracking-wider">
              ⚡ <span className="text-lime font-bold">ZERO</span> MANUAL MONITORING
            </div>
          </div>
        </div>
      </section>

      {/* 3. Problem Section */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto space-y-12 select-none relative z-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-4xl font-bold tracking-wide">
            Keyword alerts are dead.
          </h2>
          <p className="text-sm text-mutedText max-w-md mx-auto">
            Traditional social listening tools fail in context-heavy communities like Reddit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-panel border-l-2 border-l-amberAccent bg-carbon-card/40 p-8 rounded-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl glass-panel border-amberAccent/20 bg-amberAccent/5 flex items-center justify-center text-amberAccent">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide font-mono">
              90% NOISE
            </h3>
            <p className="text-xs text-mutedText leading-relaxed">
              Standard alert alerts match exact terms like "marketing tool" regardless of context, drowning your inbox in spam and irrelevant conversations.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel border-l-2 border-l-amberAccent bg-carbon-card/40 p-8 rounded-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl glass-panel border-amberAccent/20 bg-amberAccent/5 flex items-center justify-center text-amberAccent">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide font-mono">
              MISSED BUYERS
            </h3>
            <p className="text-xs text-mutedText leading-relaxed">
              High-intent users express needs conversationally (e.g., "our spreadsheets aren't cutting it anymore"). Exact match systems miss these buyers entirely.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel border-l-2 border-l-amberAccent bg-carbon-card/40 p-8 rounded-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl glass-panel border-amberAccent/20 bg-amberAccent/5 flex items-center justify-center text-amberAccent">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide font-mono">
              SLOW RESPONSE
            </h3>
            <p className="text-xs text-mutedText leading-relaxed">
              Manually checking communities once a day means you respond hours too late. The company that replies to the thread first wins the customer.
            </p>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 max-w-6xl mx-auto space-y-12 relative z-10 select-none">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono text-lime font-bold tracking-widest block uppercase">
            3-STEP AUTOMATION
          </span>
          <h2 className="text-2xl md:text-4xl font-bold tracking-wide">
            How SignalRadar Works
          </h2>
        </div>

        <div className="relative flex flex-col md:flex-row justify-between gap-6">
          {/* Connecting Dashed Line for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-[1.5px] border-t border-dashed border-lime/30 z-0 -translate-y-1/2" />

          {/* Step 1 */}
          <div className="glass-panel bg-carbon-card p-6 rounded-xl flex-1 space-y-3 relative z-10">
            <span className="font-mono text-2xl text-lime font-bold">01</span>
            <h4 className="text-sm font-semibold tracking-wide">Define Your ICP</h4>
            <p className="text-xs text-mutedText leading-relaxed">
              Input description about your ideal customer, target products, subreddits, and keywords.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-panel bg-carbon-card p-6 rounded-xl flex-1 space-y-3 relative z-10">
            <span className="font-mono text-2xl text-lime font-bold">02</span>
            <h4 className="text-sm font-semibold tracking-wide">AI Scans Reddit</h4>
            <p className="text-xs text-mutedText leading-relaxed">
              Our background pipeline monitors posts and scores them for buying intent using Groq Llama 3 models.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-panel bg-carbon-card p-6 rounded-xl flex-1 space-y-3 relative z-10">
            <span className="font-mono text-2xl text-lime font-bold">03</span>
            <h4 className="text-sm font-semibold tracking-wide">Act on Hot Leads</h4>
            <p className="text-xs text-mutedText leading-relaxed">
              Review scored signals in your dashboard and copy personalized draft replies instantly.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Live Product Preview Section */}
      <section id="preview" className="py-24 bg-carbon-card/25 border-y border-white/5 select-none relative z-10">
        <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-mono text-lime font-bold tracking-widest block uppercase">
              Live Product Preview
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-wide">
              Qualified Leads, Zero Scrolling.
            </h2>
          </div>

          {/* Browser Mockup */}
          <div className="relative glass-panel rounded-2xl border-white/10 overflow-hidden shadow-2xl">
            {/* Glow backdrop behind preview mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 rounded-full bg-lime/5 blur-[100px] pointer-events-none" />

            {/* Title Bar */}
            <div className="bg-black/40 border-b border-white/5 px-4 py-3 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="px-16 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-500 font-mono tracking-wide">
                app.signalradar.com/dashboard
              </div>
              <div className="w-12 h-2" />
            </div>

            {/* Inner Screenshot Content */}
            <div className="bg-carbon-dark p-6 space-y-6 min-h-[400px]">
              {/* Stat elements */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl space-y-1">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-6 w-10 bg-white/10 rounded mt-1" />
                </div>
                <div className="glass-panel p-4 rounded-xl space-y-1 relative">
                  <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-lime" />
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-6 w-10 bg-white/10 rounded mt-1" />
                </div>
                <div className="glass-panel p-4 rounded-xl space-y-1">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-6 w-10 bg-white/10 rounded mt-1" />
                </div>
              </div>

              {/* Feed elements */}
              <div className="space-y-4">
                <div className="glass-panel border-l-2 border-l-lime p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-80 bg-white/10 rounded" />
                    <div className="h-3.5 w-24 bg-white/5 rounded" />
                  </div>
                  <div className="h-6 w-10 bg-lime/10 border border-lime/20 rounded" />
                </div>
                <div className="glass-panel border-l-2 border-l-amberAccent p-4 rounded-xl flex items-center justify-between opacity-80">
                  <div className="space-y-2">
                    <div className="h-4 w-72 bg-white/10 rounded" />
                    <div className="h-3.5 w-24 bg-white/5 rounded" />
                  </div>
                  <div className="h-6 w-10 bg-amberAccent/10 border border-amberAccent/20 rounded" />
                </div>
              </div>
            </div>

            {/* Click mask to run dashboard */}
            <div className="absolute inset-0 z-30 bg-black/10 backdrop-blur-xs flex items-center justify-center select-none cursor-pointer hover:bg-black/20 transition-all" onClick={onStartMonitoring}>
              <div className="px-6 py-3 rounded-full bg-lime text-carbon font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-4 h-4" />
                Launch Live App Dashboard
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Pricing Section */}
      <section id="pricing" className="py-24 px-6 md:px-12 max-w-5xl mx-auto space-y-12 select-none relative z-10">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono text-lime font-bold tracking-widest block uppercase">
            Simple Pricing
          </span>
          <h2 className="text-2xl md:text-4xl font-bold tracking-wide">
            Choose Your Monitoring Scope
          </h2>
          <p className="text-xs text-mutedText max-w-sm mx-auto">
            Billing securely processed via Polar.sh. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="glass-panel bg-carbon-card/40 p-8 rounded-2xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="font-mono text-xs text-mutedText tracking-widest uppercase">FREE TIER</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold font-mono">$0</span>
                <span className="text-xs text-mutedText font-mono">/ forever</span>
              </div>
              <p className="text-xs text-gray-400">Basic Reddit monitoring for solo developers testing ideas.</p>
              
              <div className="h-px bg-white/5 my-4" />
              
              <ul className="space-y-3 font-sans text-xs text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  1 Subreddit monitoring
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  24-Hour signal delay
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  10 Scored leads per day
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  Basic priority filters
                </li>
              </ul>
            </div>

            <button
              onClick={onStartMonitoring}
              className="w-full py-2.5 rounded-lg border border-white/20 text-white font-mono text-xs uppercase tracking-wider hover:bg-white/5 transition-all mt-6"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Tier */}
          <div className="glass-panel border-2 border-lime bg-carbon-card/45 p-8 rounded-2xl space-y-6 flex flex-col justify-between relative shadow-[0_8px_32px_rgba(198,255,52,0.05)]">
            <div className="absolute top-4 right-4 bg-lime text-carbon font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Most Popular
            </div>

            <div className="space-y-4">
              <span className="font-mono text-xs text-lime tracking-widest uppercase font-bold">PRO ACCOUNT</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold font-mono text-lime">$29</span>
                <span className="text-xs text-mutedText font-mono">/ month</span>
              </div>
              <p className="text-xs text-gray-400">Complete AI signal extraction for agencies and startup marketing teams.</p>
              
              <div className="h-px bg-white/5 my-4" />
              
              <ul className="space-y-3 font-sans text-xs text-gray-200">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  10 Subreddits monitoring
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  Real-time intent alerts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  Unlimited qualified leads
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  Instant AI outreach draft replies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-lime flex-shrink-0" />
                  REST API & webhook integrations
                </li>
              </ul>
            </div>

            <button
              onClick={onStartMonitoring}
              className="w-full py-2.5 rounded-lg bg-lime hover:bg-lime/90 text-carbon font-mono text-xs font-semibold uppercase tracking-wider transition-all mt-6"
            >
              Start Pro Trial
            </button>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" className="py-24 px-6 md:px-12 max-w-3xl mx-auto space-y-12 select-none relative z-10">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono text-lime font-bold tracking-widest block uppercase">
            Common Questions
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="glass-panel rounded-xl bg-carbon-card/30 overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold tracking-wide text-white hover:text-lime transition-colors duration-150"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 flex-shrink-0 ${isOpen && 'rotate-180'}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-5 text-xs text-mutedText leading-relaxed">
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
      <section className="py-24 px-6 md:px-12 relative select-none z-10">
        <div className="max-w-4xl mx-auto bg-lime rounded-3xl p-12 md:p-16 text-center text-carbon relative overflow-hidden shadow-[0_12px_48px_rgba(198,255,52,0.1)]">
          {/* Sweeping dot grid behind CTA */}
          <div className="absolute inset-0 opacity-10 grid-dots pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Start finding buyers while they're still deciding.
            </h2>
            <p className="text-xs font-mono uppercase tracking-widest text-carbon/70">
              No credit card required. Cancel anytime.
            </p>
            <button
              onClick={onStartMonitoring}
              className="px-8 py-3.5 rounded-full bg-carbon text-lime font-mono text-xs font-semibold uppercase tracking-widest hover:bg-carbon/90 hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              Start Free Today
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-xs text-mutedText select-none">
        <p className="font-mono tracking-wide uppercase">
          &copy; {new Date().getFullYear()} SignalRadar. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
export default LandingPage;
