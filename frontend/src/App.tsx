import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'profile'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // 2. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Route & View state synchronization
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        if (location.pathname !== '/') {
          setView('landing');
          navigate('/', { replace: true });
        } else {
          setView('landing');
        }
      } else {
        if (location.pathname === '/dashboard') {
          setView('dashboard');
        } else if (location.pathname === '/profile') {
          setView('profile');
        } else if (location.pathname === '/') {
          setView('landing');
        } else {
          setView('dashboard');
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [user, authLoading, location.pathname, navigate]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-carbon-dark text-white select-none">
      {view === 'landing' ? (
        <LandingPage 
          user={user}
          onStartMonitoring={() => {
            setView('dashboard');
            navigate('/dashboard');
          }}
          onNavigateToProfile={() => {
            setView('profile');
            navigate('/profile');
          }}
          onLogout={handleLogout}
          authLoading={authLoading}
        />
      ) : view === 'dashboard' ? (
        <DashboardPage onBackToMarketing={() => {
          setView('landing');
          navigate('/');
        }} />
      ) : (
        <ProfilePage 
          user={user!}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
