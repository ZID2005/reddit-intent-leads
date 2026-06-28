import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../sections/Navbar';
import { Pricing } from '../sections/Pricing';
import { Footer } from '../sections/Footer';
import { UpgradeModal } from '../components/UpgradeModal';
import { useSubscription } from '../hooks/useSubscription';

interface PricingPageProps {
  user: User | null;
  onLogout: () => void;
  authLoading?: boolean;
}

export function PricingPage({ user, onLogout, authLoading }: PricingPageProps) {
  const navigate = useNavigate();
  const { subscription, upgradePlan } = useSubscription(user?.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'free' | 'pro'>('pro');

  const handleSelectTier = (tier: 'free' | 'pro') => {
    if (!user) {
      // If user is not logged in, take them back to home and open signup modal
      navigate('/', { state: { openAuth: 'signup' } });
      return;
    }
    setTargetPlan(tier);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white select-none relative overflow-x-hidden font-sans">
      {/* 1. Navbar */}
      <Navbar 
        user={user}
        onOpenAuth={() => navigate('/')}
        onNavigateToDashboard={() => navigate('/dashboard')}
        onNavigateToProfile={() => navigate('/profile')}
        onLogout={onLogout}
        authLoading={authLoading}
      />

      {/* 2. Pricing Section */}
      <div className="pt-20">
        <Pricing onSelectTier={handleSelectTier} />
      </div>

      {/* 3. Footer */}
      <Footer />

      {/* 4. Upgrade Modal */}
      <UpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        targetPlan={targetPlan}
        currentPlan={subscription?.plan || 'free'}
        onConfirm={async () => {
          await upgradePlan(targetPlan);
        }}
      />
    </div>
  );
}

export default PricingPage;
