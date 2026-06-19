import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, PriorityType, CategoryType } from '../types/lead';
import { useToast } from './useToast';

const MOCK_LEADS: Lead[] = [
  {
    post_id: "post_6",
    title: "Looking to buy a CRM tool for a 5-person agency, any recommendations?",
    body: "Hey everyone, our agency is growing and spreadsheets aren't cutting it anymore. We need a CRM that is easy to use, integrates with Slack and Gmail, and costs under $100/month. We are looking to purchase something by next week. What do you recommend?",
    subreddit: "smallbusiness",
    url: "https://www.reddit.com/r/smallbusiness/comments/post_1",
    intent_score: 95,
    confidence: 0.96,
    priority: "high",
    category: "buying_intent",
    reason: "Explicit purchase request with timeline and budget metrics.",
    draft_reply: "Hey! Since you are under $100/mo and need solid Slack/Gmail integrations, you should check out Capsule or Hubspot Starter. I've set up a similar pipeline for an agency of 6 and it works cleanly.",
    lead_summary: "5-person agency seeking CRM with Slack/Gmail integrations under $100/mo, ready to buy next week.",
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18m ago
    status: "new"
  },
  {
    post_id: "post_2",
    title: "Stripe vs Paddle for SaaS in Europe?",
    body: "I'm launching a new B2B SaaS next month and am trying to decide between Stripe and Paddle. Stripe seems to have better APIs, but Paddle handles VAT/tax compliance in Europe. Does anyone have experience with both? Which one is better for a solo founder?",
    subreddit: "SaaS",
    url: "https://www.reddit.com/r/SaaS/comments/post_2",
    intent_score: 72,
    confidence: 0.88,
    priority: "medium",
    category: "comparison",
    reason: "Product evaluation comparing Stripe and Paddle for upcoming SaaS launching next month.",
    draft_reply: "Hey! If you are a solo founder in Europe, Paddle will save you dozens of hours on VAT tax compliance. Stripe is great but you'd need to bundle it with Stripe Tax/TaxJar which adds integration overhead.",
    lead_summary: "Solo founder evaluating Stripe and Paddle for European VAT tax compliance for SaaS launch next month.",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
    status: "new"
  },
  {
    post_id: "post_3",
    title: "Frustrated with current marketing tools, they are all overpriced garbage",
    body: "I've tried 3 different email marketing platforms in the last month and they all have terrible UI, constant bugs, and customer service that takes days to reply. Why does everything cost $50+ a month just to send a basic newsletter and fail at it?",
    subreddit: "marketing",
    url: "https://www.reddit.com/r/marketing/comments/post_3",
    intent_score: 82,
    confidence: 0.91,
    priority: "high",
    category: "pain_point",
    reason: "High frustration with bugs, terrible UI, and high pricing in existing solutions.",
    draft_reply: "I completely feel your pain. If you just want to send a basic newsletter without the enterprise bloat, check out Buttondown or EmailOctopus. They have very simple UI, robust deliverability, and start free or very cheap.",
    lead_summary: "Marketing user frustrated by complex, buggy, and overpriced email tools seeking a simple newsletter platform.",
    created_at: new Date(Date.now() - 1000 * 3600 * 2.5).toISOString(), // 2.5h ago
    status: "new"
  },
  {
    post_id: "post_4",
    title: "How does programmatic SEO work in practice?",
    body: "I understand the concept of templated pages powered by data, but how do you actually implement it? What tools are you using to generate pages, and how do you avoid getting penalized by Google for duplicate content?",
    subreddit: "startups",
    url: "https://www.reddit.com/r/startups/comments/post_4",
    intent_score: 45,
    confidence: 0.74,
    priority: "low",
    category: "research",
    reason: "General question seeking information on programmatic SEO implementation strategies.",
    draft_reply: "Hey! In practice, programmatic SEO works by pulling structured data (e.g., Airtable or Supabase) and compiling it into page templates via Next.js or Astro. Google doesn't penalize duplicate structures if the content value is high and unique.",
    lead_summary: "Startup founder researching programmatic SEO tools, architectures, and duplicate content risks.",
    created_at: new Date(Date.now() - 1000 * 3600 * 6).toISOString(), // 6h ago
    status: "new"
  },
  {
    post_id: "post_999999",
    title: "Need a CRM for my startup",
    body: "Looking for an email marketing platform for an ecommerce store with 10,000 subscribers.",
    subreddit: "smallbusiness",
    url: "https://reddit.com/example/post999",
    intent_score: 88,
    confidence: 0.93,
    priority: "high",
    category: "buying_intent",
    reason: "Strong buying signal for e-commerce CRM / email platform with 10k audience size.",
    draft_reply: "Hey! For an e-commerce store with 10k subscribers, Klaviyo is the industry standard for automated flows. If you want a cheaper alternative with excellent support, check out Omnisend or MailerLite.",
    lead_summary: "E-commerce startup seeking email marketing CRM for 10k subscribers.",
    created_at: new Date(Date.now() - 1000 * 3600 * 12).toISOString(), // 12h ago
    status: "new"
  }
];

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab View
  const [currentView, setCurrentView] = useState<'all' | 'saved' | 'contacted'>('all');

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPriorities, setSelectedPriorities] = useState<Set<PriorityType>>(
    new Set(['high', 'medium', 'low'])
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryType>>(
    new Set(['buying_intent', 'comparison', 'pain_point', 'research'])
  );

  // Tab count stats fetched from database status
  const [totalLeadsCount, setTotalLeadsCount] = useState<number>(0);
  const [savedLeadsCount, setSavedLeadsCount] = useState<number>(0);
  const [contactedLeadsCount, setContactedLeadsCount] = useState<number>(0);

  const { addToast } = useToast();
  
  // Track status modifications of local mock leads when DB is empty
  const [mockStatuses, setMockStatuses] = useState<Record<string, 'new' | 'saved' | 'contacted'>>({});

  // Helper to fetch counts of all views directly from Supabase
  const fetchCounts = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error: dbError } = await supabase
        .from('posts')
        .select('status');
      if (dbError) throw dbError;

      const all = data || [];
      setTotalLeadsCount(all.length);
      setSavedLeadsCount(all.filter(l => l.status === 'saved').length);
      setContactedLeadsCount(all.filter(l => l.status === 'contacted').length);
    } catch (e) {
      console.error("Failed to fetch status counts:", e);
    }
  }, []);

  // Fetch leads function
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        // Fallback to rich mock data if no Supabase connection
        console.warn("Supabase not configured or missing keys. Falling back to local mock data.");
        setTimeout(() => {
          const mockLeadsWithStatus = MOCK_LEADS.map(l => ({
            ...l,
            status: mockStatuses[l.post_id] || l.status
          }));
          
          let mockFiltered = mockLeadsWithStatus;
          if (currentView === 'saved') {
            mockFiltered = mockLeadsWithStatus.filter(l => l.status === 'saved');
          } else if (currentView === 'contacted') {
            mockFiltered = mockLeadsWithStatus.filter(l => l.status === 'contacted');
          }
          
          setLeads(mockFiltered);
          setTotalLeadsCount(mockLeadsWithStatus.length);
          setSavedLeadsCount(mockLeadsWithStatus.filter(l => l.status === 'saved').length);
          setContactedLeadsCount(mockLeadsWithStatus.filter(l => l.status === 'contacted').length);
          setLoading(false);
        }, 800);
        return;
      }

      // 1. Fetch counts of all posts in the DB to check if database is empty
      const { data, error } = await supabase
        .from('posts')
        .select('*');

      console.log("DATA:", data);
      console.log("ERROR:", error);

      const countData = data;
      const countError = error;

      if (countError) throw countError;

      const dbEmpty = !countData || countData.length === 0;

      if (dbEmpty) {
        console.warn("Supabase returned 0 leads. Falling back to mock data preview.");
        const mockLeadsWithStatus = MOCK_LEADS.map(l => ({
          ...l,
          status: mockStatuses[l.post_id] || l.status
        }));
        
        let mockFiltered = mockLeadsWithStatus;
        if (currentView === 'saved') {
          mockFiltered = mockLeadsWithStatus.filter(l => l.status === 'saved');
        } else if (currentView === 'contacted') {
          mockFiltered = mockLeadsWithStatus.filter(l => l.status === 'contacted');
        }
        setLeads(mockFiltered);
        setTotalLeadsCount(mockLeadsWithStatus.length);
        setSavedLeadsCount(mockLeadsWithStatus.filter(l => l.status === 'saved').length);
        setContactedLeadsCount(mockLeadsWithStatus.filter(l => l.status === 'contacted').length);
      } else {
        // Update stats counts
        setTotalLeadsCount(countData.length);
        setSavedLeadsCount(countData.filter(l => l.status === 'saved').length);
        setContactedLeadsCount(countData.filter(l => l.status === 'contacted').length);

        // 2. Query table based on selected view
        let query = supabase
          .from('posts')
          .select('*')
          .order('intent_score', { ascending: false });

        if (currentView === 'saved') {
          query = query.eq('status', 'saved');
        } else if (currentView === 'contacted') {
          query = query.eq('status', 'contacted');
        }

        const { data, error: dbError } = await query;
        if (dbError) throw dbError;

        // Handle category translation or fallback validation
        const formattedData: Lead[] = (data || []).map((lead: any) => {
          const created_at = lead.processed_at || lead.created_at || new Date().toISOString();
          const priority = (lead.priority || 'low').toLowerCase() as PriorityType;

          let category: CategoryType = 'research';
          const rawCat = String(lead.category).toLowerCase();
          if (rawCat.includes('buy') || rawCat.includes('intent')) category = 'buying_intent';
          else if (rawCat.includes('compare') || rawCat.includes('comparison')) category = 'comparison';
          else if (rawCat.includes('pain') || rawCat.includes('frust') || rawCat.includes('point')) category = 'pain_point';
          
          return {
            post_id: lead.post_id,
            title: lead.title || '',
            body: lead.body || '',
            subreddit: lead.subreddit || 'unknown',
            url: lead.url || '',
            intent_score: Number(lead.intent_score || 0),
            confidence: Number(lead.confidence || 0.5),
            priority,
            category,
            reason: lead.reason || '',
            draft_reply: lead.draft_reply || '',
            lead_summary: lead.lead_summary || '',
            created_at,
            status: lead.status || 'new'
          };
        });

        setLeads(formattedData);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load leads from database.");
      // Fallback on error to keep app interactive
      setLeads(MOCK_LEADS);
    } finally {
      setLoading(false);
    }
  }, [currentView, mockStatuses]);

  // Fetch leads on mount or when currentView changes
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, currentView]);

  // Real-time Supabase Subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const newRow = payload.new;
          
          const priority = (newRow.priority || 'low').toLowerCase() as PriorityType;
          let category: CategoryType = 'research';
          const rawCat = String(newRow.category).toLowerCase();
          if (rawCat.includes('buy') || rawCat.includes('intent')) category = 'buying_intent';
          else if (rawCat.includes('compare') || rawCat.includes('comparison')) category = 'comparison';
          else if (rawCat.includes('pain') || rawCat.includes('frust') || rawCat.includes('point')) category = 'pain_point';

          const newLead: Lead = {
            post_id: newRow.post_id,
            title: newRow.title || '',
            body: newRow.body || '',
            subreddit: newRow.subreddit || 'unknown',
            url: newRow.url || '',
            intent_score: Number(newRow.intent_score || 0),
            confidence: Number(newRow.confidence || 0.5),
            priority,
            category,
            reason: newRow.reason || '',
            draft_reply: newRow.draft_reply || '',
            lead_summary: newRow.lead_summary || '',
            created_at: newRow.processed_at || newRow.created_at || new Date().toISOString(),
            status: newRow.status || 'new'
          };

          if (currentView === 'saved' && newLead.status !== 'saved') return;
          if (currentView === 'contacted' && newLead.status !== 'contacted') return;

          setLeads(prev => {
            if (prev.some(lead => lead.post_id === newLead.post_id)) return prev;
            
            if (newLead.priority === 'high' || newLead.intent_score >= 80) {
              addToast({
                title: newLead.title,
                subreddit: newLead.subreddit,
                score: newLead.intent_score
              });
            }

            return [newLead, ...prev];
          });

          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          const updatedRow = payload.new;
          
          setLeads(prev => {
            // Remove from list if status no longer matches filtered view tab
            if (currentView === 'saved' && updatedRow.status !== 'saved') {
              return prev.filter(l => l.post_id !== updatedRow.post_id);
            }
            if (currentView === 'contacted' && updatedRow.status !== 'contacted') {
              return prev.filter(l => l.post_id !== updatedRow.post_id);
            }

            return prev.map(l => {
              if (l.post_id === updatedRow.post_id) {
                return { ...l, status: updatedRow.status };
              }
              return l;
            });
          });

          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [addToast, currentView, fetchCounts]);

  // Bookmarking action (Status = 'saved' / 'new')
  const toggleSaveLead = useCallback(async (postId: string) => {
    const lead = leads.find(l => l.post_id === postId);
    if (!lead) return;

    const nextStatus = lead.status === 'saved' ? 'new' : 'saved';

    // Update mock status local state
    setMockStatuses(prev => ({ ...prev, [postId]: nextStatus }));

    // Optimistically update status locally
    setLeads(prev => {
      if (currentView === 'saved' && nextStatus !== 'saved') {
        return prev.filter(l => l.post_id !== postId);
      }
      return prev.map(l => l.post_id === postId ? { ...l, status: nextStatus } : l);
    });

    try {
      if (!supabase) return;
      const { error: dbError } = await supabase
        .from('posts')
        .update({ status: nextStatus })
        .eq('post_id', postId);
      if (dbError) throw dbError;

      fetchCounts();
    } catch (e) {
      console.error("Failed to update status to saved:", e);
      fetchLeads();
    }
  }, [leads, currentView, fetchCounts, fetchLeads]);

  // Mark contacted action (Status = 'contacted' / 'new')
  const toggleContactedLead = useCallback(async (postId: string) => {
    const lead = leads.find(l => l.post_id === postId);
    if (!lead) return;

    const nextStatus = lead.status === 'contacted' ? 'new' : 'contacted';

    // Update mock status local state
    setMockStatuses(prev => ({ ...prev, [postId]: nextStatus }));

    // Optimistically update status locally
    setLeads(prev => {
      if (currentView === 'contacted' && nextStatus !== 'contacted') {
        return prev.filter(l => l.post_id !== postId);
      }
      return prev.map(l => l.post_id === postId ? { ...l, status: nextStatus } : l);
    });

    try {
      if (!supabase) return;
      const { error: dbError } = await supabase
        .from('posts')
        .update({ status: nextStatus })
        .eq('post_id', postId);
      if (dbError) throw dbError;

      fetchCounts();
    } catch (e) {
      console.error("Failed to update status to contacted:", e);
      fetchLeads();
    }
  }, [leads, currentView, fetchCounts, fetchLeads]);

  // Priority Filter Toggle
  const togglePriority = useCallback((priority: PriorityType) => {
    setSelectedPriorities(prev => {
      const next = new Set(prev);
      if (next.has(priority)) {
        next.delete(priority);
      } else {
        next.add(priority);
      }
      return next;
    });
  }, []);

  // Category Filter Toggle
  const toggleCategory = useCallback((category: CategoryType) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Reset Filters helper
  const resetFilters = useCallback(() => {
    setSelectedPriorities(new Set(['high', 'medium', 'low']));
    setSelectedCategories(new Set(['buying_intent', 'comparison', 'pain_point', 'research']));
    setSearchQuery('');
  }, []);

  // Filtered Leads computing
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const titleMatch = lead.title.toLowerCase().includes(q);
        const bodyMatch = lead.body.toLowerCase().includes(q);
        const subMatch = lead.subreddit.toLowerCase().includes(q);
        if (!titleMatch && !bodyMatch && !subMatch) return false;
      }

      if (!selectedPriorities.has(lead.priority)) return false;
      if (!selectedCategories.has(lead.category)) return false;

      // Fallback check if mock data is used
      if (!supabase) {
        if (currentView === 'saved' && lead.status !== 'saved') return false;
        if (currentView === 'contacted' && lead.status !== 'contacted') return false;
      }

      return true;
    });
  }, [leads, searchQuery, selectedPriorities, selectedCategories, currentView]);

  return {
    leads: filteredLeads,
    allLeadsRaw: leads,
    loading,
    error,
    retryFetch: fetchLeads,
    
    // View state
    currentView,
    setCurrentView,

    // Filters
    searchQuery,
    setSearchQuery,
    selectedPriorities,
    togglePriority,
    selectedCategories,
    toggleCategory,
    resetFilters,

    // Counts
    totalLeadsCount,
    savedLeadsCount,
    contactedLeadsCount,

    // Interactions
    toggleSaveLead,
    toggleContactedLead
  };
}
