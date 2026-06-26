import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LeadDetail } from '../types/lead';

interface UseLeadDetailReturn {
  detail: LeadDetail | null;
  loading: boolean;
  error: string | null;
  fetchDetail: (postId: string) => Promise<void>;
  clearDetail: () => void;
  updateLocalNotes: (notes: string) => void;
}

/**
 * Fetches a single lead's full detail from Supabase by post_id.
 * Called only when a drawer opens — not upfront with the lead list.
 */
export function useLeadDetail(): UseLeadDetailReturn {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (postId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('posts')
        .select('*')
        .eq('post_id', postId)
        .limit(1)
        .single();

      if (dbError) throw dbError;
      if (!data) throw new Error('Lead not found.');

      // Normalise keywords: Supabase may return as JSON array or stringified array
      let keywords: string[] = [];
      if (Array.isArray(data.keywords)) {
        keywords = data.keywords.map(String);
      } else if (typeof data.keywords === 'string') {
        try {
          const parsed = JSON.parse(data.keywords);
          keywords = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          // Comma-separated fallback
          keywords = data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
        }
      }

      // Normalise category
      let category: LeadDetail['category'] = 'research';
      const rawCat = String(data.category || '').toLowerCase();
      if (rawCat.includes('buy') || rawCat.includes('intent')) category = 'buying_intent';
      else if (rawCat.includes('compare') || rawCat.includes('comparison')) category = 'comparison';
      else if (rawCat.includes('pain') || rawCat.includes('frust') || rawCat.includes('point')) category = 'pain_point';

      // Normalise priority
      const priority = (['high', 'medium', 'low'].includes(String(data.priority).toLowerCase())
        ? String(data.priority).toLowerCase()
        : 'low') as LeadDetail['priority'];

      setDetail({
        ...data,
        keywords,
        category,
        priority,
        intent_score: Number(data.intent_score ?? 0),
        confidence: Number(data.confidence ?? 0),
        recommended_action: data.recommended_action ?? '',
        reason: data.reason ?? '',
        draft_reply: data.draft_reply ?? '',
        lead_summary: data.lead_summary ?? '',
        processed_at: data.processed_at ?? data.created_at ?? '',
        status: data.status ?? 'new',
        notes: data.notes ?? '',
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load lead details.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDetail = useCallback(() => {
    setDetail(null);
    setError(null);
  }, []);

  const updateLocalNotes = useCallback((notes: string) => {
    setDetail(prev => prev ? { ...prev, notes } : null);
  }, []);

  return { detail, loading, error, fetchDetail, clearDetail, updateLocalNotes };
}
