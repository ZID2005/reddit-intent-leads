export type PriorityType = 'high' | 'medium' | 'low';
export type CategoryType = 'buying_intent' | 'comparison' | 'pain_point' | 'research';

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
}
