import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Mail, Lock, X, Sparkles, AlertCircle } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Reset modal state when opened or when initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail('');
      setPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!supabase) {
      setErrorMsg("Database connection is not configured.");
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        
        if (data.user && !data.session) {
          setSuccessMsg("Registration successful! Please check your email for verification.");
        } else {
          setSuccessMsg("Registration successful! Redirecting...");
          setTimeout(() => onClose(), 1500);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!supabase) {
      setErrorMsg("Database connection is not configured.");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate Google sign in.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container: scale 0.95 to 1.0 fade-in */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-md glass-panel bg-[#070708]/95 p-8 rounded-2xl border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.8),0_0_40px_rgba(198,255,52,0.02)] z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Brand Logo & Title */}
            <div className="text-center mb-6">
              {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="relative w-2 h-2 rounded-full bg-[#C6FF34] shadow-[0_0_6px_#C6FF34]" />
                <span className="font-mono text-xs font-bold tracking-wider text-white uppercase select-none">
                  SignalRadar
                </span>
              </div>
              
              <h2 className="text-2xl font-bold tracking-tight font-display text-white">
                Get Started Free
              </h2>
              <p className="text-xs text-gray-500 font-sans mt-1">
                {mode === 'login'
                  ? 'Monitor Reddit intent, save leads, and reply automatically'
                  : 'Start finding qualified intent leads in seconds'}
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3.5 mb-4 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-sans">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="flex items-center gap-2 p-3.5 mb-4 text-[#C6FF34] bg-[#C6FF34]/10 border border-[#C6FF34]/20 rounded-xl text-xs font-sans">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google OAuth Button with Google icon */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 rounded-xl border border-white/8 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04] text-white font-mono text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer"
              style={{ minHeight: '44px' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google
            </button>

            {/* Separator OR */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <span className="relative px-3 bg-[#070708] text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                OR
              </span>
            </div>

            {/* Credential Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input with volt-lime focus ring */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-mono tracking-widest text-gray-400 uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/8 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C6FF34] focus:ring-1 focus:ring-[#C6FF34] transition-all font-sans"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              {/* Password Input with volt-lime focus ring */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-mono tracking-widest text-gray-400 uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/8 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C6FF34] focus:ring-1 focus:ring-[#C6FF34] transition-all font-sans"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              {/* Primary Continue Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#C6FF34] hover:brightness-105 text-[#070708] font-mono text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-[0_0_20px_rgba(198,255,52,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '44px' }}
              >
                {loading ? 'Authenticating...' : 'Continue'}
              </button>
            </form>

            {/* Toggle Link */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-[11px] font-sans text-gray-500 hover:text-white transition-colors cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                {mode === 'login'
                  ? "Don't have an account? Sign up free"
                  : "Already have an account? Log in"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AuthModal;
