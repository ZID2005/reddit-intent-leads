import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const SCHEDULER_API_URL = import.meta.env.VITE_SCHEDULER_API_URL || 'http://localhost:8000';

export interface SubscriptionStatus {
  plan: 'free' | 'pro';
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  usage: {
    month: string;
    ai_generations: number;
    csv_exports: number;
    leads_viewed: number;
    notifications_sent: number;
    ai_generations_today: number;
    csv_exports_today: number;
  };
  limits: {
    ai_generations_limit: number;
    csv_exports_limit: number;
    leads_limit: number;
    analytics: 'basic' | 'advanced';
    pipeline: 'read_only' | 'full';
    notifications: 'disabled' | 'enabled';
  };
}

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SCHEDULER_API_URL}/api/subscription/status`, {
        headers: {
          'X-User-Id': userId,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch subscription status');
      const data = await response.json();
      setSubscription(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching subscription');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const incrementUsage = useCallback(async (feature: 'ai_generations' | 'csv_exports' | 'leads_viewed' | 'notifications_sent') => {
    if (!userId) return;
    try {
      const response = await fetch(`${SCHEDULER_API_URL}/api/subscription/increment-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ feature }),
      });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error('Failed to increment usage:', err);
    }
  }, [userId, fetchStatus]);

  const upgradePlan = useCallback(async (targetPlan: 'free' | 'pro') => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(`${SCHEDULER_API_URL}/api/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ plan: targetPlan }),
      });
      if (!response.ok) throw new Error('Upgrade failed');
      
      // Force refreshing the Supabase user session to pull down the newly updated user_metadata.plan
      if (supabase) {
        await supabase.auth.refreshSession();
      }
      
      await fetchStatus();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Upgrade failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isPro = subscription?.plan === 'pro';
  const canGenerateOutreach = isPro || (subscription ? subscription.usage.ai_generations_today < 5 : true);
  const canExportCSV = isPro || (subscription ? subscription.usage.csv_exports_today < 2 : true);

  return {
    subscription,
    loading,
    error,
    isPro,
    canGenerateOutreach,
    canExportCSV,
    incrementUsage,
    upgradePlan,
    refresh: fetchStatus,
  };
}
