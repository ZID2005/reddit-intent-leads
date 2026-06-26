export type PriorityType = 'high' | 'medium' | 'low';
export type CategoryType = 'buying_intent' | 'comparison' | 'pain_point' | 'research' | 'uncategorized';
export type RecommendedAction = 'reply_immediately' | 'monitor' | 'ignore' | string;
export type QualificationReason =
  | 'recommendation_request'
  | 'comparison_signal'
  | 'pricing_signal'
  | 'migration_signal'
  | 'problem_signal'
  | 'tool_search';

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
  contacted_at?: string | null;
  notes?: string;
  // Extended fields from Supabase posts table
  recommended_action?: RecommendedAction;
  keywords?: string[];
  processed_at?: string;
  qualification_reason?: QualificationReason;
}

/** Full detail record fetched on-demand from Supabase when a drawer opens. */
export interface LeadDetail extends Lead {
  id?: number;
  recommended_action: RecommendedAction;
  keywords: string[];
  processed_at: string;
  qualification_reason?: QualificationReason;
}
