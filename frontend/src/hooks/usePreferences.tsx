import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserPreferences {
  browserNotificationsEnabled: boolean;
  highIntentThreshold: number;
  autoRefreshInterval: number; // in seconds: 30 | 60 | 300
  defaultOutreachTab: 'reddit' | 'linkedin' | 'email';
  darkMode: boolean;
}

const STORAGE_KEY = 'signalradar_preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  browserNotificationsEnabled: true,
  highIntentThreshold: 80,
  autoRefreshInterval: 60,
  defaultOutreachTab: 'reddit',
  darkMode: true,
};

interface PreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const merged = { ...DEFAULT_PREFERENCES, ...parsed };
        setPreferences(merged);
        
        // Apply dark/light mode
        if (merged.darkMode) {
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
        }
      } else {
        // Apply default (dark mode)
        document.documentElement.classList.remove('light');
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save preferences:', e);
      }

      // Apply dark/light mode if it was updated
      if (updates.darkMode !== undefined) {
        if (updates.darkMode) {
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
        }
      }
      return next;
    });
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    } catch (e) {
      console.error('Failed to reset preferences:', e);
    }
    document.documentElement.classList.remove('light');
  };

  return (
    <PreferencesContext.Provider value={{ preferences, loading, updatePreferences, resetPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
