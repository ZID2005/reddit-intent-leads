"""
backfill_scores.py
------------------
One-time script to query all posts in Supabase where intent_score is NULL,
or where scoring previously failed and returned fallback values,
score them using Groq, and update the rows in the database.
"""

import sys
import time
import logging
from datetime import datetime, timezone
from backend.database import LeadDatabase, DatabaseError
from app.scorer import load_config, analyze_post

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("backfill_scores")

def main() -> int:
    logger.info("Initializing backfill script...")
    
    # Initialize Supabase LeadDatabase
    try:
        db = LeadDatabase()
        client = db._client
    except Exception as exc:
        logger.error("Failed to connect to Supabase: %s", exc)
        return 1
        
    # Load Groq API Key
    try:
        api_key = load_config()
    except Exception as exc:
        logger.error("Failed to load Groq configuration: %s", exc)
        return 1

    # Fetch all posts from Supabase to filter in Python
    logger.info("Querying all posts from Supabase...")
    try:
        resp = client.table("posts").select("*").execute()
        all_posts = resp.data
    except Exception as exc:
        logger.error("Failed to query posts: %s", exc)
        return 1

    # Filter for unscored posts or posts that fell back due to analysis failures
    unscored_posts = []
    for post in all_posts:
        intent_score = post.get("intent_score")
        reason = post.get("reason") or ""
        if intent_score is None or "Analysis failed" in reason:
            unscored_posts.append(post)

    total_posts = len(unscored_posts)
    logger.info("Found %d posts that require scoring (including previously failed ones).", total_posts)

    if total_posts == 0:
        logger.info("No posts to backfill. Exiting.")
        return 0

    success_count = 0
    failure_count = 0

    for i, post in enumerate(unscored_posts, start=1):
        post_id = post.get("post_id")
        title = post.get("title", "")
        
        if not post_id:
            logger.warning("[%d/%d] Skipping post with missing post_id: %s", i, total_posts, post)
            continue

        logger.info("[%d/%d] Backfilling post %s: '%s'", i, total_posts, post_id, title[:40])

        try:
            # Score the post
            scored_lead = analyze_post(post, api_key)
            
            # Check if scoring actually succeeded or hit the internal fallback
            if scored_lead.get("reason", "").startswith("Analysis failed"):
                logger.warning("Scoring returned fallback values for post %s.", post_id)
                failure_count += 1
            else:
                success_count += 1

            # Extract fields to update
            update_data = {
                "intent_score": scored_lead.get("intent_score"),
                "confidence": scored_lead.get("confidence"),
                "priority": scored_lead.get("priority"),
                "category": scored_lead.get("category"),
                "recommended_action": scored_lead.get("recommended_action"),
                "draft_reply": scored_lead.get("draft_reply"),
                "keywords": scored_lead.get("keywords"),
                "lead_summary": scored_lead.get("lead_summary"),
                "reason": scored_lead.get("reason"),
                "processed_at": scored_lead.get("processed_at")
            }

            # Update the record in Supabase
            client.table("posts").update(update_data).eq("post_id", post_id).execute()
            logger.info("Successfully updated post %s in Supabase.", post_id)
        except Exception as exc:
            logger.error("Failed to process/update post %s: %s", post_id, exc)
            failure_count += 1

        # Generous rate limit avoidance delay (1.5 seconds)
        time.sleep(1.5)

    logger.info("Backfill completed. Total: %d, Success: %d, Failures: %d", total_posts, success_count, failure_count)
    return 0

if __name__ == "__main__":
    sys.exit(main())
