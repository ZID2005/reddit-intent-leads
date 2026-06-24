"""
config.py
---------
Central configuration for the SignalRadar RSS pipeline.

All subreddit targets, environment loading, and shared constants live here.
Designed so future modules (Groq scorer, scheduler) only need to import
from this file to get everything they need.
"""

import os
from dotenv import load_dotenv

# Load .env from the project root (one level up from this backend/ folder)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# Supabase credentials
# ---------------------------------------------------------------------------
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

# ---------------------------------------------------------------------------
# Subreddit watchlist
# Organised by vertical so it's easy to add / remove later.
# ---------------------------------------------------------------------------
SUBREDDITS: list[str] = [
    # High-value commercial intent — primary targets
    "SaaS",
    "startups",
    "smallbusiness",
    "CRM",
    "marketing",
    "sales",
    "shopify",
    "ecommerce",
    "hubspot",
    "projectmanagement",
]

# ---------------------------------------------------------------------------
# RSS feed settings
# ---------------------------------------------------------------------------
# Reddit exposes a public RSS feed per subreddit at this URL pattern.
RSS_FEED_TEMPLATE: str = "https://www.reddit.com/r/{subreddit}/new.rss"

# How many posts to request per feed fetch (Reddit caps at 100).
RSS_LIMIT: int = 10

# HTTP request timeout in seconds.
REQUEST_TIMEOUT: float = 15.0


# ---------------------------------------------------------------------------
# Database table
# ---------------------------------------------------------------------------
POSTS_TABLE: str = "posts"
SCHEDULER_RUNS_TABLE: str = "scheduler_runs"

# ---------------------------------------------------------------------------
# Groq / AI scorer
# ---------------------------------------------------------------------------
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"

# ---------------------------------------------------------------------------
# Scheduler service
# ---------------------------------------------------------------------------
# Default run interval in hours (configurable at runtime via API).
SCHEDULER_INTERVAL_HOURS: int = int(os.getenv("SCHEDULER_INTERVAL_HOURS", "6"))

# Allowed interval values exposed to the UI.
SCHEDULER_VALID_INTERVALS: tuple[int, ...] = (1, 3, 6, 12, 24)

# Port the FastAPI scheduler HTTP server listens on.
SCHEDULER_API_PORT: int = int(os.getenv("SCHEDULER_API_PORT", "8000"))

