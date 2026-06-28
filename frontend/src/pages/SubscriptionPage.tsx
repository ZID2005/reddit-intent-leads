import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionPanel } from '../components/SubscriptionPanel';

interface SubscriptionPageProps {
  user: User | null;
  onLogout: () => void;
}

export function SubscriptionPage({ user, onLogout }: SubscriptionPageProps) {
  const navigate = useNavigate();
  const { subscription, loading, isPro, upgradePlan } = useSubscription(user?.id);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Dot grid svg pattern injected as background
  return (
    <div className="min-h-screen bg-[#070708] text-white font-sans relative overflow-x-hidden">
      {/* ── Scroll Progress Bar ─────────────────────────────────────────────── */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-lime/80 via-lime to-lime/80 origin-left z-[60]"
      />

      {/* ── Animated background orbs ───────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Top-left */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-lime/10 blur-[120px]"
        />
        {/* Bottom-right */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full bg-lime/8 blur-[130px]"
        />
        {/* Center */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-lime/5 blur-[160px]"
        />

        {/* Dot grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-2 z-50 mx-4 mt-4">
        <div
          className="flex items-center justify-between px-6 h-14 rounded-2xl border border-white/[0.08] bg-[#0a0a0c]/80 backdrop-blur-xl"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-2 h-2 rounded-full bg-lime animate-pulse shadow-[0_0_6px_#C6FF34]" />
            <span className="font-mono text-sm font-bold tracking-wider text-white">SignalRadar</span>
          </div>

          {/* Center nav tabs */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Pipeline', path: '/pipeline' },
              { label: 'Analytics', path: '/analytics' },
            ].map(tab => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="px-3.5 py-1.5 rounded-lg text-[11px] font-mono text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200 cursor-pointer outline-none"
              >
                {tab.label}
              </button>
            ))}
            {/* Active Subscription tab */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-lime/10 border border-lime/25 text-lime text-[11px] font-mono font-bold">
              <Crown className="w-3 h-3" />
              Subscription
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => navigate('/profile')}
                className="w-8 h-8 rounded-full bg-lime flex items-center justify-center font-mono text-black font-bold text-xs cursor-pointer hover:brightness-110 transition-all outline-none"
                title="Profile"
              >
              {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20"
      >
        {/* Page Header */}
        <div className="mb-8 space-y-2">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-lime"
          >
            <Crown className="w-3.5 h-3.5" />
            Subscription &amp; Billing
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight"
          >
            {isPro ? 'You\'re on Pro 🚀' : 'Your Free Plan'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 font-sans leading-relaxed"
          >
            {isPro
              ? 'Full access to all SignalRadar features. Thank you for your support.'
              : 'Manage your subscription, monitor usage limits, and upgrade to unlock the full experience.'}
          </motion.p>
        </div>

        <SubscriptionPanel
          subscription={subscription}
          loading={loading}
          isPro={isPro}
          upgradePlan={upgradePlan}
          userId={user?.id}
        />
      </motion.main>
    </div>
  );
}
