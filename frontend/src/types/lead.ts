export type PriorityType = 'high' | 'medium' | 'low';
export type CategoryType = 'buying_intent' | 'comparison' | 'pain_point' | 'research' | 'uncategorized';
export type RecommendedAction = 'reply_immediately' | 'monitor' | 'ignore' | string;

export interface Lead {
  post_id: string;
  title: string;
  body: string;
  subreddit: string;
  url: string;
  intent_score: number;
  confidence: number;
  priority: PriorityType;
  category: CategoryType;
  reason: string;
  draft_reply: string;
  lead_summary: string;
  created_at: string;
  status: 'new' | 'saved' | 'contacted' | 'closed';
  // Extended fields from Supabase posts table
  recommended_action?: RecommendedAction;
  keywords?: string[];
  processed_at?: string;
}

/** Full detail record fetched on-demand from Supabase when a drawer opens. */
export interface LeadDetail extends Lead {
  id?: number;
  recommended_action: RecommendedAction;
  keywords: string[];
  processed_at: string;
}
