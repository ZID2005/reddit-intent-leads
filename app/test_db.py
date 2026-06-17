from datetime import datetime, timezone
from app.database import DatabaseManager, SupabaseDatabaseError

def main():
    try:
        manager = DatabaseManager()
    except Exception as e:
        print(f"Init Failed: {e}"); return

    sample_lead = {
        "post_id": "test_post_100",
        "title": "Need custom software development agency recommendation",
        "body": "Looking to hire a team for mobile app build. Budget $25k.",
        "subreddit": "startups",
        "url": "https://www.reddit.com/r/startups/comments/test_post_100",
        "intent_score": 90,
        "confidence": 0.95,
        "priority": "high",
        "category": "buying_intent",
        "recommended_action": "reply_immediately",
        "reason": "Explicit intent to hire a development agency.",
        "draft_reply": "Hello! We would love to discuss...",
        "keywords": ["mobile app", "agency", "hire"],
        "lead_summary": "Looking for mobile app development team.",
        "processed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    try:
        if not manager.lead_exists(sample_lead["post_id"]):
            manager.insert_lead(sample_lead)
            print("Insertion Success!")
        else:
            print("Lead already exists.")
        
        print("\nRetrieving all leads from Supabase:")
        leads = manager.get_all_leads()
        print(f"Total leads: {len(leads)}")
        for lead in leads:
            print(f"- [{lead['priority'].upper()}] {lead['post_id']}: {lead['title']}")
    except SupabaseDatabaseError as e:
        print(f"Database Operation Failed: {e}")

if __name__ == "__main__":
    main()
