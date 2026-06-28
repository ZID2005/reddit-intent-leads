import { useState, useCallback, useEffect } from 'react';
import { usePreferences } from './usePreferences';

const SCHEDULER_API_URL =
  import.meta.env.VITE_SCHEDULER_API_URL || 'http://localhost:8000';

export type OutreachChannel = 'reddit' | 'linkedin' | 'email';

export interface LeadOutreachContext {
  post_id: string;
  title: string;
  body?: string;
  subreddit: string;
  category: string;
  intent_score: number;
  lead_summary: string;
  notes?: string;
}

export function useOutreachGenerator() {
  const { preferences } = usePreferences();
  const [activeChannel, setActiveChannel] = useState<OutreachChannel>(preferences.defaultOutreachTab);
  
  useEffect(() => {
    setActiveChannel(preferences.defaultOutreachTab);
  }, [preferences.defaultOutreachTab]);

  const [messages, setMessages] = useState<Record<OutreachChannel, string>>({
    reddit: '',
    linkedin: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMessage = useCallback(async (channel: OutreachChannel, lead: LeadOutreachContext, userId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SCHEDULER_API_URL}/api/outreach/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {}),
        },
        body: JSON.stringify({
          post_id: lead.post_id,
          channel,
          title: lead.title,
          body: lead.body || '',
          subreddit: lead.subreddit,
          category: lead.category,
          intent_score: lead.intent_score,
          lead_summary: lead.lead_summary,
          notes: lead.notes || '',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedDetail = 'Failed to generate outreach message.';
        try {
          const errObj = JSON.parse(errorText);
          parsedDetail = errObj.detail || parsedDetail;
        } catch {
          parsedDetail = errorText || parsedDetail;
        }
        throw new Error(parsedDetail);
      }

      const data = await response.json();
      setMessages(prev => ({
        ...prev,
        [channel]: data.message || '',
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setMessages({
      reddit: '',
      linkedin: '',
      email: '',
    });
    setError(null);
    setLoading(false);
    setActiveChannel(preferences.defaultOutreachTab);
  }, [preferences.defaultOutreachTab]);

  return {
    activeChannel,
    setActiveChannel,
    messages,
    loading,
    error,
    generateMessage,
    reset,
  };
}
