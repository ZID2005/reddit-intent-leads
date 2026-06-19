import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, ChevronRight, LayoutDashboard } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface NavbarProps {
  user: User | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onNavigateToDashboard: () => void;
  onLogout: () => void;
}

export function Navbar({ user, onOpenAuth, onNavigateToDashboard, onLogout }: NavbarProps) {
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
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Product Preview', href: '#preview' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 h-20 border-b z-40 transition-all duration-300 flex items-center justify-between px-6 md:px-12 select-none ${
          scrolled
            ? 'glass-panel bg-[#0D0D0D]/90 border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
            : 'bg-transparent border-white/5 backdrop-blur-md'
        }`}
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="pulse-dot" />
          <span className="font-display text-lg font-bold tracking-tight text-white">
            SignalRadar
          </span>
        </div>

        {/* Center Links - Desktop */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-sans font-medium tracking-wide text-gray-400">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="hover:text-[#B8F200] transition-colors duration-200"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Right CTA Actions - Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {/* User Avatar Glass Pill */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-panel bg-white/[0.02] border-white/10">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#B8F200] to-teal-400 flex items-center justify-center text-[10px] font-mono text-black font-bold uppercase select-none">
                  {user.email?.charAt(0) || 'U'}
                </div>
                <span className="font-mono text-[10px] text-gray-300 max-w-[120px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={onLogout}
                  className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Go to Dashboard CTA */}
              <motion.button
                whileHover={{ y: -1, boxShadow: '0 0 20px rgba(184,242,0,0.3)' }}
                whileTap={{ scale: 0.97 }}
                onClick={onNavigateToDashboard}
                className="px-4 py-2 rounded-xl bg-[#B8F200] text-[#0D0D0D] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(184,242,0,0.15)]"
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
                className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-gray-300 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                Log In
              </motion.button>

              {/* Start Free Lime */}
              <motion.button
                whileHover={{ y: -1, boxShadow: '0 0 20px rgba(184,242,0,0.3)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2.5 rounded-xl bg-[#B8F200] text-[#0D0D0D] font-mono text-xs font-bold uppercase tracking-wider cursor-pointer shadow-[0_0_12px_rgba(184,242,0,0.15)]"
              >
                Start Free
              </motion.button>
            </>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 md:hidden rounded-xl glass-panel border-white/10 text-gray-400 hover:text-white cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Full Screen Glass Drawer - Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-30 pt-24 pb-10 px-6 bg-[#0D0D0D]/95 backdrop-blur-2xl border-b border-white/10 flex flex-col justify-between md:hidden"
          >
            {/* Links */}
            <div className="flex flex-col gap-6 mt-8">
              {navLinks.map((link, idx) => (
                <motion.a
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-display text-2xl font-semibold text-gray-300 hover:text-[#B8F200] flex items-center justify-between border-b border-white/5 pb-3"
                >
                  {link.name}
                  <ChevronRight className="w-5 h-5 text-[#B8F200]" />
                </motion.a>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-4 mt-auto">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl glass-panel bg-white/[0.02] border-white/5 justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#B8F200] flex items-center justify-center text-xs font-mono text-black font-bold uppercase">
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
                      className="p-1 rounded text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onNavigateToDashboard();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#B8F200] text-[#0D0D0D] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
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
                    className="w-full py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-gray-300 rounded-xl border border-white/10"
                  >
                    Log In
                  </button>

                  <button
                    onClick={() => {
                      onOpenAuth('signup');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#B8F200] text-[#0D0D0D] font-mono text-xs font-bold uppercase tracking-wider"
                  >
                    Start Free
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
export default Navbar;
