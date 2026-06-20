import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, PriorityType, CategoryType } from '../types/lead';
import { useToast } from './useToast';

/** Normalise a raw Supabase row into a typed Lead */
export function normaliseRow(lead: any): Lead {
  const created_at = lead.processed_at || lead.created_at || new Date().toISOString();
  const priority = (['high', 'medium', 'low'].includes(String(lead.priority).toLowerCase())
    ? String(lead.priority).toLowerCase()
    : 'low') as PriorityType;

  let category: CategoryType = 'uncategorized';
  const rawCat = String(lead.category || '').trim().toLowerCase();
  if (!lead.category || rawCat === '' || rawCat === 'null') {
    category = 'uncategorized';
  } else if (rawCat.includes('buy') || rawCat.includes('intent')) {
    category = 'buying_intent';
  } else if (rawCat.includes('compare') || rawCat.includes('comparison')) {
    category = 'comparison';
  } else if (rawCat.includes('pain') || rawCat.includes('frust') || rawCat.includes('point')) {
    category = 'pain_point';
  } else {
    category = 'research';
  }

  return {
    post_id: lead.post_id,
    title: lead.title || '',
    body: lead.body || '',
    subreddit: lead.subreddit || 'unknown',
    url: lead.url || '',
    intent_score: Number(lead.intent_score ?? 0),
    confidence: Number(lead.confidence ?? 0),
    priority,
    category,
    reason: lead.reason || '',
    draft_reply: lead.draft_reply || '',
    lead_summary: lead.lead_summary || '',
    recommended_action: lead.recommended_action || '',
    keywords: Array.isArray(lead.keywords) ? lead.keywords : [],
    created_at,
    processed_at: lead.processed_at || '',
    status: lead.status || 'new',
  };
}

export function useLeads() {
  // Raw unfiltered leads from Supabase
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View tabs
  const [currentView, setCurrentView] = useState<'all' | 'saved' | 'contacted' | 'analytics'>('all');

  // Tab counts
  const [totalLeadsCount, setTotalLeadsCount] = useState<number>(0);
  const [savedLeadsCount, setSavedLeadsCount] = useState<number>(0);
  const [contactedLeadsCount, setContactedLeadsCount] = useState<number>(0);

  const { addToast } = useToast();

  // ── Fetch counts ───────────────────────────────────────────────────────────
  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await supabase.from('posts').select('status');
      const rows = data || [];
      setTotalLeadsCount(rows.length);
      setSavedLeadsCount(rows.filter(r => r.status === 'saved').length);
      setContactedLeadsCount(rows.filter(r => r.status === 'contacted').length);
    } catch (e) {
      console.error('Failed to fetch counts:', e);
    }
  }, []);

  // ── Fetch leads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentView === 'saved')     query = query.eq('status', 'saved');
      if (currentView === 'contacted') query = query.eq('status', 'contacted');

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      setAllLeads((data || []).map(normaliseRow));
      await fetchCounts();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load leads.');
      setAllLeads([]);
    } finally {
      setLoading(false);
    }
  }, [currentView, fetchCounts]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        const newLead = normaliseRow(payload.new);
        if (currentView === 'saved'     && newLead.status !== 'saved')     return;
        if (currentView === 'contacted' && newLead.status !== 'contacted') return;

        setAllLeads(prev => {
          if (prev.some(l => l.post_id === newLead.post_id)) return prev;
          if (newLead.priority === 'high' || newLead.intent_score >= 80) {
            addToast({ title: newLead.title, subreddit: newLead.subreddit, score: newLead.intent_score });
          }
          return [newLead, ...prev];
        });
        fetchCounts();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, payload => {
        const u = payload.new;
        setAllLeads(prev => {
          if (currentView === 'saved'     && u.status !== 'saved')     return prev.filter(l => l.post_id !== u.post_id);
          if (currentView === 'contacted' && u.status !== 'contacted') return prev.filter(l => l.post_id !== u.post_id);
          return prev.map(l => l.post_id === u.post_id ? { ...l, status: u.status } : l);
        });
        fetchCounts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [addToast, currentView, fetchCounts]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const toggleSaveLead = useCallback(async (postId: string) => {
    const lead = allLeads.find(l => l.post_id === postId);
    if (!lead) return;
    const nextStatus = lead.status === 'saved' ? 'new' : 'saved';

    setAllLeads(prev => {
      if (currentView === 'saved' && nextStatus !== 'saved') return prev.filter(l => l.post_id !== postId);
      return prev.map(l => l.post_id === postId ? { ...l, status: nextStatus } : l);
    });

    try {
      await supabase.from('posts').update({ status: nextStatus }).eq('post_id', postId);
      fetchCounts();
    } catch { fetchLeads(); }
  }, [allLeads, currentView, fetchCounts, fetchLeads]);

  const toggleContactedLead = useCallback(async (postId: string) => {
    const lead = allLeads.find(l => l.post_id === postId);
    if (!lead) return;
    const nextStatus = lead.status === 'contacted' ? 'new' : 'contacted';

    setAllLeads(prev => {
      if (currentView === 'contacted' && nextStatus !== 'contacted') return prev.filter(l => l.post_id !== postId);
      return prev.map(l => l.post_id === postId ? { ...l, status: nextStatus } : l);
    });

    try {
      await supabase.from('posts').update({ status: nextStatus }).eq('post_id', postId);
      fetchCounts();
    } catch { fetchLeads(); }
  }, [allLeads, currentView, fetchCounts, fetchLeads]);

  return {
    allLeads,           // raw, unfiltered — passed to useFilters
    loading,
    error,
    retryFetch: fetchLeads,
    currentView,
    setCurrentView,
    totalLeadsCount,
    savedLeadsCount,
    contactedLeadsCount,
    toggleSaveLead,
    toggleContactedLead,
  };
}
