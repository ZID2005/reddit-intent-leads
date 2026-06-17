import { useState, useEffect } from 'react';

export interface SignalChip {
  id: string;
  emoji: string;
  subreddit: string;
  title: string;
  score: number;
}

const INITIAL_CHIPS: SignalChip[] = [
  { id: 'c1', emoji: '💡', subreddit: 'smallbusiness', title: 'Need CRM tool for agency', score: 94 },
  { id: 'c2', emoji: '💳', subreddit: 'SaaS', title: 'Stripe vs Paddle in Europe', score: 72 },
  { id: 'c3', emoji: '🚀', subreddit: 'startups', title: 'Programmatic SEO tools', score: 85 },
  { id: 'c4', emoji: '✉️', subreddit: 'marketing', title: 'Best newsletter platform', score: 68 },
  { id: 'c5', emoji: '🛍️', subreddit: 'shopify', title: 'Shopify customer support app', score: 91 },
];

const SAMPLE_TICKER_DATA: Omit<SignalChip, 'id'>[] = [
  { emoji: '🔒', subreddit: 'cybersecurity', title: 'Evaluating corporate password manager', score: 93 },
  { emoji: '📊', subreddit: 'analytics', title: 'Alternative to GA4 for custom funnels', score: 81 },
  { emoji: '💬', subreddit: 'CustomerSuccess', title: 'Tool to automate customer replies', score: 79 },
  { emoji: '🏦', subreddit: 'fintech', title: 'Billing engine with ACH support', score: 88 },
  { emoji: '📈', subreddit: 'SEO', title: 'Backlink analysis tool with API', score: 74 },
  { emoji: '🤖', subreddit: 'artificialintelligence', title: 'Enterprise LLM API comparison', score: 83 },
  { emoji: '📁', subreddit: 'sysadmin', title: 'Self-hosted cloud backup solution', score: 90 },
  { emoji: '🛠️', subreddit: 'webdev', title: 'Headless CMS recommendation', score: 76 }
];

export function useSignalFeed() {
  const [chips, setChips] = useState<SignalChip[]>(INITIAL_CHIPS);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomData = SAMPLE_TICKER_DATA[Math.floor(Math.random() * SAMPLE_TICKER_DATA.length)];
      const newChip: SignalChip = {
        ...randomData,
        id: Math.random().toString(36).substring(2, 9),
      };

      setChips(prev => {
        const updated = [newChip, ...prev];
        if (updated.length > 15) {
          return updated.slice(0, 15);
        }
        return updated;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return chips;
}
export type { SignalChip as SignalChipType };
