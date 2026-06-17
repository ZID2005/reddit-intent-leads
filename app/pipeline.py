import os
import json
import logging
from typing import Dict, Any

from app.database import DatabaseManager, SupabaseDatabaseError
from app.scorer import load_config, analyze_post

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    """Main function to run the Reddit lead scoring and ingestion pipeline."""
    logger.info("Initializing lead ingestion and scoring pipeline...")

    # Configuration and file paths
    input_file = "reddit_posts.json"
    if not os.path.exists(input_file):
        input_file = "sample_posts.json"
    
    # Load posts from input file
    logger.info(f"Loading posts from {input_file}...")
    try:
        if not os.path.exists(input_file):
            logger.error(f"Input file '{input_file}' not found.")
            raise FileNotFoundError(f"Input file '{input_file}' not found.")

        with open(input_file, "r", encoding="utf-8") as f:
            posts = json.load(f)

        if not isinstance(posts, list):
            raise ValueError(f"Expected a list of posts in {input_file}, got {type(posts).__name__}")
        
        total_loaded = len(posts)
        logger.info(f"Successfully loaded {total_loaded} posts.")
    except Exception as e:
        logger.error(f"Failed to load posts from file: {e}")
        print(f"Error loading posts: {e}")
        return

    # 2. Initialize DatabaseManager
    logger.info("Initializing database manager...")
    try:
        db_manager = DatabaseManager()
    except Exception as e:
        logger.error(f"Failed to initialize DatabaseManager: {e}")
        print(f"Error initializing DatabaseManager: {e}")
        return

    # 3. Load Groq API Config
    logger.info("Loading Scorer API configurations...")
    try:
        api_key = load_config()
    except Exception as e:
        logger.error(f"Failed to load Scorer configuration: {e}")
        print(f"Error loading Scorer configuration: {e}")
        return

    total_scored = 0
    total_inserted = 0
    total_duplicates_skipped = 0

    # 4. Iterate over posts, score them, check duplicates, insert
    for i, post in enumerate(posts, 1):
        post_id = post.get("post_id")
        title = post.get("title", "")
        
        if not post_id:
            logger.warning(f"Post index {i} is missing 'post_id'. Skipping post.")
            continue

        logger.info(f"[{i}/{total_loaded}] Processing post: {post_id} - '{title[:40]}'")

        # Score the post
        try:
            scored_lead = analyze_post(post, api_key)
            total_scored += 1
        except Exception as e:
            logger.error(f"Failed to score post {post_id}: {e}")
            continue

        # Check if the lead already exists in Supabase
        try:
            if db_manager.lead_exists(post_id):
                logger.info(f"Lead {post_id} already exists in database. Skipping duplicate.")
                total_duplicates_skipped += 1
            else:
                db_manager.insert_lead(scored_lead)
                logger.info(f"Lead {post_id} successfully inserted.")
                total_inserted += 1
        except SupabaseDatabaseError as e:
            logger.error(f"Database operation failed for lead {post_id}: {e}")
        except Exception as e:
            logger.error(f"Unexpected database error for lead {post_id}: {e}")

    # 5. Print Summary Counts
    print("\n--- Pipeline Execution Summary ---")
    print(f"Total posts loaded: {total_loaded}")
    print(f"Total posts scored: {total_scored}")
    print(f"Total inserted: {total_inserted}")
    print(f"Total duplicates skipped: {total_duplicates_skipped}")
    
    logger.info("Pipeline execution completed.")


if __name__ == "__main__":
    main()
