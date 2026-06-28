import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { PricingPage } from './pages/PricingPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import ErrorOneDemo from './components/ErrorOne/ErrorOneDemo';

function App() {
  const [view, setView] = useState<'landing' | 'dashboard' | 'analytics' | 'saved' | 'contacts' | 'profile' | 'pipeline' | 'pricing' | 'subscription' | '404'>('landing');
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
      const knownDashboardPaths = ['/dashboard', '/pipeline', '/analytics', '/saved', '/contacts', '/profile', '/subscription'];
      
      if (!user) {
        if (location.pathname === '/pricing') {
          setView('pricing');
        } else if (location.pathname === '/') {
          setView('landing');
        } else if (knownDashboardPaths.includes(location.pathname)) {
          setView('landing');
          navigate('/', { replace: true });
        } else {
          setView('404');
        }
      } else {
        if (location.pathname === '/dashboard') {
          setView('dashboard');
        } else if (location.pathname === '/pipeline') {
          setView('pipeline');
        } else if (location.pathname === '/analytics') {
          setView('analytics');
        } else if (location.pathname === '/saved') {
          setView('saved');
        } else if (location.pathname === '/contacts') {
          setView('contacts');
        } else if (location.pathname === '/profile') {
          setView('profile');
        } else if (location.pathname === '/pricing') {
          setView('pricing');
        } else if (location.pathname === '/subscription') {
          setView('subscription');
        } else if (location.pathname === '/') {
          setView('landing');
        } else {
          setView('404');
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
    <div className="min-h-screen bg-carbon-dark text-white select-none font-sans">
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
      ) : view === 'pricing' ? (
        <PricingPage 
          user={user}
          onLogout={handleLogout}
          authLoading={authLoading}
        />
      ) : view === 'subscription' ? (
        <SubscriptionPage
          user={user}
          onLogout={handleLogout}
        />
      ) : view === '404' ? (
        <ErrorOneDemo />
      ) : ['dashboard', 'analytics', 'saved', 'contacts', 'pipeline'].includes(view) ? (
        <DashboardPage 
          user={user}
          onLogout={handleLogout}
          currentView={view as 'dashboard' | 'analytics' | 'saved' | 'contacts' | 'pipeline'} 
          onBackToMarketing={() => {
            setView('landing');
            navigate('/');
          }} 
        />
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
