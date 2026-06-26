import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Calendar, LogOut } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { PreferencesForm } from './PreferencesForm';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
}

export function ProfileDrawer({ isOpen, onClose, user, onLogout }: ProfileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside drawer to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Helper to extract first name or initial
  const email = user.email || '';
  const prefix = email.split('@')[0];
  const cleanName = prefix
    .replace(/[0-9]/g, '')
    .replace(/[._-]/g, ' ')
    .trim();
  const displayName = user.user_metadata?.full_name || 
    (cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase());
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  const memberSince = (() => {
    if (!user.created_at) return 'Jun 2026';
    try {
      const date = new Date(user.created_at);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Jun 2026';
    }
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Body */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-carbon-card/95 border-l border-white/10 glass-panel shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col h-full overflow-hidden"
          >
            {/* Specular glass reflection crescent */}
            <div className="absolute top-0.5 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0 bg-white/[0.01]">
              <h3 className="font-display text-lg font-bold text-white tracking-wide">
                User Profile & Settings
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg glass-panel border-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer outline-none"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 select-none">
              
              {/* Profile Card Summary */}
              <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4 overflow-hidden">
                
                {/* Avatar Initial */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full p-[1.5px] bg-gradient-to-br from-lime/50 via-lime/10 to-transparent">
                    <div className="w-full h-full rounded-full bg-[#0D0D0F] flex items-center justify-center font-mono font-bold text-lime text-xl">
                      {initial}
                    </div>
                  </div>
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-base font-semibold text-white truncate">
                    {displayName}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-mutedText truncate">
                    <Mail className="w-3.5 h-3.5 opacity-65 flex-shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-mutedText/85">
                    <Calendar className="w-3.5 h-3.5 opacity-65 flex-shrink-0" />
                    <span>Member since {memberSince}</span>
                  </div>
                </div>
                
                {/* Logout Action Button inside profile card */}
                <button
                  onClick={onLogout}
                  className="p-2.5 rounded-xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer flex-shrink-0 outline-none"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Preferences Divider Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-lime font-bold">Preferences</span>
                  <div className="h-px bg-white/5 flex-1" />
                </div>
                
                {/* Preferences Form Integration */}
                <PreferencesForm />
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
