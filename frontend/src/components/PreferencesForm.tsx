import React, { useState, useEffect } from 'react';
import { usePreferences } from '../hooks/usePreferences';
import { useToast } from '../hooks/useToast';
import { 
  Bell, 
  Sliders, 
  RefreshCw, 
  Zap, 
  Moon, 
  Sun, 
  RotateCcw, 
  Check, 
  Save,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '@supabase/supabase-js';

interface PreferencesFormProps {
  user?: User | null;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export function PreferencesForm({ user, isPro = false, onUpgrade }: PreferencesFormProps) {
  const { preferences, loading: prefLoading, updatePreferences, resetPreferences } = usePreferences();
  const { addToast } = useToast();
  
  // Local state to hold changes before saving
  const [localNotifications, setLocalNotifications] = useState(true);
  const [localThreshold, setLocalThreshold] = useState(80);
  const [localInterval, setLocalInterval] = useState(60);
  const [localOutreachTab, setLocalOutreachTab] = useState<'reddit' | 'linkedin' | 'email'>('reddit');
  const [localDarkMode, setLocalDarkMode] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Sync state when preferences are loaded
  useEffect(() => {
    if (!prefLoading) {
      setLocalNotifications(isPro ? preferences.browserNotificationsEnabled : false);
      setLocalThreshold(preferences.highIntentThreshold);
      setLocalInterval(preferences.autoRefreshInterval);
      setLocalOutreachTab(preferences.defaultOutreachTab);
      setLocalDarkMode(preferences.darkMode);
      
      // Simulate premium UI loading shimmer for 400ms
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [prefLoading, preferences, isPro]);

  const handleSave = () => {
    setSaving(true);
    // Simulate minor delay for premium UI feel
    setTimeout(() => {
      updatePreferences({
        browserNotificationsEnabled: isPro ? localNotifications : false,
        highIntentThreshold: localThreshold,
        autoRefreshInterval: localInterval,
        defaultOutreachTab: localOutreachTab,
        darkMode: localDarkMode,
      });
      setSaving(false);
      
      addToast({
        title: 'Preferences Saved',
        message: 'Your settings have been successfully applied and persisted.',
        subreddit: 'success_alert',
        score: 0,
        type: 'success',
        duration: 3000
      });
    }, 300);
  };

  const handleReset = () => {
    resetPreferences();
    addToast({
      title: 'Preferences Reset',
      message: 'All settings have been restored to system defaults.',
      subreddit: 'success_alert',
      score: 0,
      type: 'success',
      duration: 3000
    });
  };

  if (showSkeleton) {
    return (
      <div className="space-y-6 animate-pulse p-1 select-none">
        {/* Toggle skeleton */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-3 w-48 bg-white/5 rounded" />
          </div>
          <div className="h-6 w-12 bg-white/10 rounded-full" />
        </div>
        
        {/* Slider skeleton */}
        <div className="space-y-3 py-2 border-b border-white/5">
          <div className="flex justify-between">
            <div className="h-4 w-28 bg-white/10 rounded" />
            <div className="h-4 w-8 bg-white/10 rounded" />
          </div>
          <div className="h-2 w-full bg-white/10 rounded" />
        </div>

        {/* Dropdown skeleton */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="space-y-2">
            <div className="h-4 w-36 bg-white/10 rounded" />
            <div className="h-3 w-40 bg-white/5 rounded" />
          </div>
          <div className="h-9 w-24 bg-white/10 rounded-lg" />
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-3 py-2 border-b border-white/5">
          <div className="h-4 w-28 bg-white/10 rounded" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-9 bg-white/10 rounded-lg" />
            <div className="h-9 bg-white/5 rounded-lg" />
            <div className="h-9 bg-white/5 rounded-lg" />
          </div>
        </div>

        {/* Toggle skeleton */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-3 w-40 bg-white/5 rounded" />
          </div>
          <div className="h-6 w-12 bg-white/10 rounded-full" />
        </div>

        {/* Buttons skeleton */}
        <div className="flex items-center gap-3 pt-4">
          <div className="h-10 w-28 bg-white/10 rounded-xl" />
          <div className="h-10 flex-1 bg-white/10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white select-none">
      
      {/* 1. Browser Alerts */}
      <div className="flex items-start justify-between py-3 border-b border-white/5 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-lime" />
            Browser Notifications
            {!isPro && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                <Lock className="w-2.5 h-2.5 text-amber-400" /> PRO ONLY
              </span>
            )}
          </label>
          <p className="text-[11px] text-mutedText leading-relaxed">
            Receive instant desktop alerts when qualified leads are found.
          </p>
        </div>
        <button
          onClick={() => {
            if (!isPro) {
              onUpgrade?.();
            } else {
              setLocalNotifications(!localNotifications);
            }
          }}
          className={cn(
            "w-12 h-6 rounded-full p-1 transition-all duration-300 relative cursor-pointer outline-none",
            localNotifications && isPro ? "bg-lime" : "bg-white/10"
          )}
        >
          <div 
            className={cn(
              "w-4 h-4 rounded-full bg-carbon-dark shadow-md transition-all duration-300",
              localNotifications && isPro ? "translate-x-6" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* 2. Min Score Slider */}
      <div className="space-y-3 py-3 border-b border-white/5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-lime" />
            High-Intent Threshold
          </label>
          <span className="text-xs font-mono font-bold text-lime bg-lime/10 px-2 py-0.5 rounded border border-lime/25">
            {localThreshold}%
          </span>
        </div>
        <p className="text-[11px] text-mutedText leading-relaxed mb-1">
          Filter signals below this score from triggers and notification alerts.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="50"
            max="95"
            step="5"
            value={localThreshold}
            onChange={(e) => setLocalThreshold(Number(e.target.value))}
            className="flex-1 accent-lime bg-white/10 h-1.5 rounded-lg cursor-pointer outline-none"
          />
          <span className="text-[10px] font-mono text-mutedText w-8 text-right">Min 50</span>
        </div>
      </div>

      {/* 3. Refresh Interval */}
      <div className="flex items-center justify-between py-3 border-b border-white/5 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-lime" />
            Auto-Refresh Interval
          </label>
          <p className="text-[11px] text-mutedText leading-relaxed">
            Adjust dashboard lead feed database background polling rate.
          </p>
        </div>
        <select
          value={localInterval}
          onChange={(e) => setLocalInterval(Number(e.target.value))}
          className="flex-shrink-0 px-3 py-2 text-xs font-mono bg-[#0A0A0A] border border-white/10 rounded-lg text-white outline-none cursor-pointer focus:border-lime/40 transition-colors"
        >
          <option value={30}>30s</option>
          <option value={60}>1m</option>
          <option value={300}>5m</option>
        </select>
      </div>

      {/* 4. Default Outreach Tab */}
      <div className="space-y-3 py-3 border-b border-white/5">
        <label className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-lime" />
          Default Outreach Channel
        </label>
        <p className="text-[11px] text-mutedText leading-relaxed mb-2">
          Select the default draft communication tab in the lead details drawer.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(['reddit', 'linkedin', 'email'] as const).map((tab) => {
            const label = tab === 'email' ? 'Cold Email' : tab;
            return (
              <button
                key={tab}
                onClick={() => setLocalOutreachTab(tab)}
                className={cn(
                  "py-2 rounded-xl border text-xs font-mono capitalize transition-all duration-200 cursor-pointer outline-none",
                  localOutreachTab === tab
                    ? "bg-lime/10 border-lime/30 text-lime font-bold"
                    : "bg-transparent border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Dark Mode Toggle */}
      <div className="flex items-start justify-between py-3 border-b border-white/5 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
            {localDarkMode ? <Moon className="w-3.5 h-3.5 text-lime" /> : <Sun className="w-3.5 h-3.5 text-lime" />}
            Dark Mode Theme
          </label>
          <p className="text-[11px] text-mutedText leading-relaxed">
            Switch application styles between light theme and carbon-dark.
          </p>
        </div>
        <button
          onClick={() => setLocalDarkMode(!localDarkMode)}
          className={cn(
            "w-12 h-6 rounded-full p-1 transition-all duration-300 relative cursor-pointer outline-none",
            localDarkMode ? "bg-lime" : "bg-white/10"
          )}
        >
          <div 
            className={cn(
              "w-4 h-4 rounded-full bg-carbon-dark shadow-md transition-all duration-300",
              localDarkMode ? "translate-x-6" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* 6. Action buttons (Reset & Save) */}
      <div className="flex items-center gap-3 pt-4 w-full">
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 text-xs font-mono font-bold uppercase hover:bg-white/[0.02] hover:text-white transition-colors cursor-pointer outline-none"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-lime hover:brightness-110 active:scale-[0.98] text-black text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer outline-none"
        >
          {saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Preferences
            </>
          )}
        </button>
      </div>

    </div>
  );
}
