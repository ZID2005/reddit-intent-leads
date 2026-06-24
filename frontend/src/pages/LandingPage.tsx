import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';

import { Navbar } from '../sections/Navbar';
import { Hero } from '../sections/Hero';
import { Problem } from '../sections/Problem';
import { HowItWorks } from '../sections/HowItWorks';
import { LivePreview } from '../sections/LivePreview';
import { Pricing } from '../sections/Pricing';
import { Faq } from '../sections/FAQ';
import { FinalCta } from '../sections/FinalCTA';
import { Footer } from '../sections/Footer';
import { AuthModal } from '../components/AuthModal';

interface LandingPageProps {
  user: User | null;
  onStartMonitoring: () => void;
  onNavigateToProfile: () => void;
  onLogout: () => void;
  authLoading?: boolean;
}

export function LandingPage({ user, onStartMonitoring, onNavigateToProfile, onLogout, authLoading }: LandingPageProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white select-none relative overflow-x-hidden font-sans">
      
      {/* 1. Navbar */}
      <Navbar 
        user={user}
        onOpenAuth={handleOpenAuth}
        onNavigateToDashboard={onStartMonitoring}
        onNavigateToProfile={onNavigateToProfile}
        onLogout={onLogout}
        authLoading={authLoading}
      />

      {/* 2. Hero Section */}
      <Hero 
        onStart={user ? onStartMonitoring : () => handleOpenAuth('signup')}
        onWatchDemo={() => {
          document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 3. Problem Section */}
      <Problem />

      {/* 4. How It Works Section */}
      <HowItWorks />

      {/* 5. Live Product Preview Section */}
      <LivePreview onLaunch={onStartMonitoring} />

      {/* 6. Pricing Section */}
      <Pricing 
        onSelectTier={() => {
          if (user) {
            onStartMonitoring();
          } else {
            handleOpenAuth('signup');
          }
        }}
      />

      {/* 7. FAQ Section */}
      <Faq />

      {/* 8. CTA Section */}
      <FinalCta onStart={user ? onStartMonitoring : () => handleOpenAuth('signup')} />

      {/* 9. Footer */}
      <Footer />

      {/* Auth Modal Overlay */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authInitialMode}
      />

    </div>
  );
}

export default LandingPage;
