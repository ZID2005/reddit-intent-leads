import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, ChevronRight, LayoutDashboard } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface NavbarProps {
  user: User | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onNavigateToDashboard: () => void;
  onNavigateToProfile?: () => void;
  onLogout: () => void;
  authLoading?: boolean;
}

const getFirstName = (email: string, fullName?: string): string => {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim().split(' ')[0];
  }
  const prefix = email.split('@')[0];
  const cleaned = prefix
    .replace(/[0-9]/g, '')
    .replace(/[._-]/g, ' ')
    .trim()
    .split(' ')[0];
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

export function Navbar({ user, onOpenAuth, onNavigateToDashboard, onNavigateToProfile, onLogout, authLoading }: NavbarProps) {
  const navigate = useNavigate();
  const supabaseUser = user;
  const firstName = user ? getFirstName(user.email || '', user.user_metadata?.full_name) : '';
  const firstInitial = firstName.charAt(0).toUpperCase() || 'U';
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'Product Preview', href: '/#preview' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'FAQ', href: '/#faq' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 h-20 z-40 transition-all duration-300 flex items-center justify-between px-6 md:px-12 select-none ${
          scrolled
            ? 'bg-[#040404]/95 border-b border-white/6 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)]'
            : 'bg-[#080808]/85 border-b border-white/6 backdrop-blur-[20px]'
        }`}
      >
        {/* Left: SignalRadar logo wordmark in Clash Display with a small volt-lime pulsing dot */}
        <div 
          className="flex items-center gap-2 cursor-pointer py-2" 
          onClick={() => {
            if (window.location.pathname === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              navigate('/');
            }
          }}
          style={{ minHeight: '44px' }}
        >
          <div className="relative w-2.5 h-2.5 flex items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-2.5 h-2.5 rounded-full bg-[#C6FF34] shadow-[0_0_8px_#C6FF34]"
            />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            SignalRadar
          </span>
        </div>

        {/* Center: nav links in DM Sans */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-sans font-medium tracking-wide text-gray-400">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="hover:text-[#C6FF34] transition-colors duration-250 py-2"
              style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Right: Log In ghost button and Start Free button */}
        <div className="hidden md:flex items-center gap-4">
          {authLoading ? (
            <div className="w-32 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ borderColor: 'rgba(198,255,52,0.3)' }}
                onClick={() => {
                  if (onNavigateToProfile) {
                    onNavigateToProfile();
                  } else {
                    navigate('/profile');
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md cursor-pointer hover:border-lime/30 hover:bg-white/8 transition-all duration-200 select-none outline-none"
              >
                <div className="w-7 h-7 rounded-full bg-lime flex items-center justify-center font-mono text-black font-bold text-xs flex-shrink-0">
                  {firstInitial}
                </div>
                <span className="hidden md:inline font-mono text-xs text-white/70 tracking-wide">
                  {firstName}
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                onClick={onLogout}
                className="btn-liquid-glass-danger flex items-center gap-1.5 px-3.5 py-2 rounded-full cursor-pointer font-mono text-[10px] text-white/50 select-none outline-none uppercase tracking-wider"
                style={{ minHeight: '38px' }}
              >
                {/* Specular glass reflection crescent */}
                <div className="absolute top-0.5 left-2 right-2 h-[35%] bg-gradient-to-b from-white/20 to-transparent rounded-t-full pointer-events-none z-10" />
                <LogOut className="w-3.5 h-3.5 text-white/40 relative z-10" />
                <span className="relative z-10">Log Out</span>
              </motion.button>

              {/* Go to Dashboard CTA */}
              <motion.button
                whileHover={{ y: -1, boxShadow: '0 0 20px rgba(198,255,52,0.25)' }}
                whileTap={{ scale: 0.97 }}
                onClick={onNavigateToDashboard}
                className="px-4 py-2.5 rounded-xl bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-[#C6FF34]/10 shadow-[0_0_12px_rgba(198,255,52,0.15)]"
                style={{ minHeight: '44px' }}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </motion.button>
            </div>
          ) : (
            <>
              {/* Log In Ghost */}
              <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-gray-300 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                Log In
              </motion.button>

              {/* Start Free Lime */}
              <motion.button
                whileHover={{ y: -1, boxShadow: '0 0 20px rgba(198,255,52,0.25)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2.5 rounded-xl bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-wider cursor-pointer border border-[#C6FF34]/10 shadow-[0_0_12px_rgba(198,255,52,0.15)]"
                style={{ minHeight: '44px' }}
              >
                Start Free
              </motion.button>
            </>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 md:hidden rounded-xl glass-panel border-white/10 text-gray-400 hover:text-white cursor-pointer flex items-center justify-center"
          style={{ minWidth: '44px', minHeight: '44px' }}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Glass Bottom Sheet Drawer - Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md md:hidden"
            />
            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-6 pb-10 rounded-t-3xl border-t border-white/10 glass-panel bg-[#080808]/95 backdrop-blur-2xl flex flex-col gap-6 md:hidden shadow-[0_-12px_40px_rgba(0,0,0,0.8)]"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 rounded-full bg-white/10 mx-auto mb-2" />

              {/* Links */}
              <div className="flex flex-col gap-4">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-display text-xl font-semibold text-gray-300 hover:text-[#C6FF34] flex items-center justify-between border-b border-white/5 pb-2.5 transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    {link.name}
                    <ChevronRight className="w-5 h-5 text-[#C6FF34]" />
                  </motion.a>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3 mt-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl glass-panel bg-white/[0.02] border-white/5 justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#C6FF34] flex items-center justify-center text-xs font-mono text-black font-bold uppercase">
                          {user.email?.charAt(0)}
                        </div>
                        <span className="font-mono text-xs text-gray-300 max-w-[180px] truncate">
                          {user.email}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="p-2 rounded text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        onNavigateToDashboard();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-3 rounded-xl bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-[#C6FF34]/10 shadow-[0_0_12px_rgba(198,255,52,0.15)]"
                      style={{ minHeight: '44px' }}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Go to Dashboard
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onOpenAuth('login');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-3 text-xs font-mono font-bold uppercase tracking-wider text-gray-300 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer"
                      style={{ minHeight: '44px' }}
                    >
                      Log In
                    </button>

                    <button
                      onClick={() => {
                        onOpenAuth('signup');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-3 rounded-xl bg-[#C6FF34] text-[#070708] font-mono text-xs font-bold uppercase tracking-wider cursor-pointer border border-[#C6FF34]/10 shadow-[0_0_12px_rgba(198,255,52,0.15)]"
                      style={{ minHeight: '44px' }}
                    >
                      Start Free
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
