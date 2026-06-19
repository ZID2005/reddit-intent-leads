import React, { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        setView('dashboard');
      }
    });

    // 2. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (event === 'SIGNED_IN' && session?.user) {
        setView('dashboard');
      } else if (event === 'SIGNED_OUT') {
        setView('landing');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Protected route: if logged out, redirect dashboard back to landing
  useEffect(() => {
    if (!authLoading && !user && view === 'dashboard') {
      setView('landing');
    }
  }, [user, view, authLoading]);
  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <div className="min-h-screen bg-carbon-dark text-white select-none">
      {view === 'landing' ? (
        <LandingPage 
          user={user}
          onStartMonitoring={() => setView('dashboard')}
          onLogout={handleLogout}
        />
      ) : (
        <DashboardPage onBackToMarketing={() => setView('landing')} />
      )}
    </div>
  );
}

export default App;
