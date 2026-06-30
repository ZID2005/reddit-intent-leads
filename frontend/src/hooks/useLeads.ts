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

  let statusVal = lead.status || 'new';
  let contacted_at: string | null = null;
  if (statusVal.startsWith('contacted:')) {
    const parts = statusVal.split(':');
    statusVal = 'contacted';
    contacted_at = parts[1] || null;
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
    status: statusVal as 'new' | 'saved' | 'contacted' | 'closed',
    contacted_at,
    notes: lead.notes || '',
  };
}

export function useLeads() {
  // Raw unfiltered leads from Supabase
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View tabs
  const [currentView, setCurrentView] = useState<'all' | 'saved' | 'contacted' | 'analytics' | 'pipeline'>('all');

  // Tab counts
  const [totalLeadsCount, setTotalLeadsCount] = useState<number>(0);
  const [savedLeadsCount, setSavedLeadsCount] = useState<number>(0);
  const [contactedLeadsCount, setContactedLeadsCount] = useState<number>(0);

  const { addToast } = useToast();

  // ── Fetch counts ───────────────────────────────────────────────────────────
  const fetchCounts = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const isPro = user?.user_metadata?.plan?.toLowerCase() === 'pro' || import.meta.env.DEV;

      let query = supabase.from('posts').select('status').order('created_at', { ascending: false });
      if (!isPro) {
        query = query.limit(100);
      }
      const { data } = await query;
      const rows = data || [];
      setTotalLeadsCount(rows.length);
      setSavedLeadsCount(rows.filter(r => r.status === 'saved').length);
      setContactedLeadsCount(rows.filter(r => String(r.status || '').startsWith('contacted')).length);
    } catch (e) {
      console.error('Failed to fetch counts:', e);
    }
  }, []);

  // ── Fetch leads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async (silent: boolean | unknown = false) => {
    const isSilent = silent === true;
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const isPro = user?.user_metadata?.plan?.toLowerCase() === 'pro' || import.meta.env.DEV;

      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentView === 'saved')     query = query.eq('status', 'saved');
      if (currentView === 'contacted') query = query.like('status', 'contacted%');

      if (!isPro) {
        query = query.limit(100);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      setAllLeads((data || []).map(normaliseRow));
      await fetchCounts();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load leads.');
      setAllLeads([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [currentView, fetchCounts]);

  useEffect(() => { 
    fetchLeads(); 
  }, [fetchLeads]);

  // Poll database every 5 seconds to get latest leads silently
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLeads(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchLeads]);

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
        const u = normaliseRow(payload.new);
        setAllLeads(prev => {
          if (currentView === 'saved'     && u.status !== 'saved')     return prev.filter(l => l.post_id !== u.post_id);
          if (currentView === 'contacted' && u.status !== 'contacted') return prev.filter(l => l.post_id !== u.post_id);
          return prev.map(l => l.post_id === u.post_id ? u : l);
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
    const nextStatus = lead.status === 'contacted' ? 'new' : `contacted:${new Date().toISOString()}`;

    setAllLeads(prev => {
      if (currentView === 'contacted' && nextStatus === 'new') return prev.filter(l => l.post_id !== postId);
      return prev.map(l => {
        if (l.post_id === postId) {
          const statusVal = nextStatus.startsWith('contacted') ? 'contacted' : 'new';
          const contacted_at = nextStatus.startsWith('contacted') ? nextStatus.split(':')[1] : null;
          return { ...l, status: statusVal as any, contacted_at };
        }
        return l;
      });
    });

    try {
      await supabase.from('posts').update({ status: nextStatus }).eq('post_id', postId);
      fetchCounts();
    } catch { fetchLeads(); }
  }, [allLeads, currentView, fetchCounts, fetchLeads]);

  const updateLeadNotes = useCallback(async (postId: string, notes: string) => {
    setAllLeads(prev =>
      prev.map(l => (l.post_id === postId ? { ...l, notes } : l))
    );

    try {
      const { error: dbError } = await supabase
        .from('posts')
        .update({ notes })
        .eq('post_id', postId);
      if (dbError) throw dbError;
      await fetchCounts();
    } catch (e) {
      console.error('Failed to save lead notes:', e);
      fetchLeads();
      throw e;
    }
  }, [fetchCounts, fetchLeads]);

  const updateLeadStatus = useCallback(async (postId: string, nextStatus: 'new' | 'saved' | 'contacted') => {
    const statusVal = nextStatus === 'contacted' ? `contacted:${new Date().toISOString()}` : nextStatus;

    setAllLeads(prev => {
      if (currentView === 'saved' && nextStatus !== 'saved') return prev.filter(l => l.post_id !== postId);
      if (currentView === 'contacted' && nextStatus !== 'contacted') return prev.filter(l => l.post_id !== postId);

      return prev.map(l => {
        if (l.post_id === postId) {
          const contacted_at = nextStatus === 'contacted' ? new Date().toISOString() : null;
          return { ...l, status: nextStatus, contacted_at };
        }
        return l;
      });
    });

    try {
      const { error: dbError } = await supabase
        .from('posts')
        .update({ status: statusVal })
        .eq('post_id', postId);
      if (dbError) throw dbError;
      await fetchCounts();
    } catch (e) {
      console.error('Failed to update lead status:', e);
      fetchLeads();
    }
  }, [currentView, fetchCounts, fetchLeads]);

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
    updateLeadNotes,
    updateLeadStatus,
  };
}
