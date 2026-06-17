import { useState, useCallback } from 'react';

export function useOnboarding() {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    const stored = localStorage.getItem('signalradar_onboarded');
    return stored === 'true';
  });

  const [step, setStep] = useState<number>(1);

  const nextStep = useCallback(() => {
    setStep(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setStep(prev => Math.max(1, prev - 1));
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem('signalradar_onboarded', 'true');
    setIsOnboarded(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem('signalradar_onboarded');
    setIsOnboarded(false);
    setStep(1);
  }, []);

  return {
    isOnboarded,
    step,
    nextStep,
    prevStep,
    completeOnboarding,
    resetOnboarding
  };
}
export type useOnboardingType = ReturnType<typeof useOnboarding>;
