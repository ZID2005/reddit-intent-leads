"""
run_pipeline.py
---------------
Entry-point for the SignalRadar RSS collection pipeline.

Run with:
    python run_pipeline.py

Current pipeline:
    Reddit RSS → Collect Posts → Parse & Normalise → Deduplicate → Supabase

Future pipeline (Groq not yet integrated):
    Reddit RSS → Collect → Parse → [Groq Intent Score] → Classify → Supabase

Exit codes:
    0 — completed successfully (even if 0 new posts inserted)
    1 — fatal error (Supabase unreachable, no credentials, etc.)
"""

import io
import logging
import sys
import time

# Force UTF-8 output on Windows to avoid CP1252 UnicodeEncodeError
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from datetime import datetime, timezone
from backend.rss_collector import collect_all
from backend.reddit_parser import parse_entries
from backend.database import LeadDatabase, DatabaseError
from app.scorer import load_config, analyze_post

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Silence noisy third-party loggers
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


def _print_separator(char: str = "-", width: int = 60) -> None:
    print(char * width)


def _print_banner() -> None:
    _print_separator("=")
    print("  SignalRadar -- Reddit RSS Lead Pipeline")
    _print_separator("=")
    print()


def _print_summary(
    fetched: int,
    parsed: int,
    skipped_parse: int,
    sent_to_groq: int,
    scored: int,
    inserted: int,
    duplicates: int,
    errors: int,
    elapsed: float,
) -> None:
    """Print a clean, human-readable pipeline summary."""
    print()
    _print_separator()
    print("  Pipeline Summary")
    _print_separator()
    print(f"  Fetched (RSS entries)  : {fetched:>6}")
    print(f"  Parsed (normalised)    : {parsed:>6}")
    print(f"  Skipped (parse errors) : {skipped_parse:>6}")
    print(f"  Sent to Groq           : {sent_to_groq:>6}")
    print(f"  Successfully Scored    : {scored:>6}")
    print(f"  New posts inserted     : {inserted:>6}")
    print(f"  Duplicates skipped     : {duplicates:>6}")
    print(f"  Errors                 : {errors:>6}")
    print(f"  Elapsed                : {elapsed:>5.1f}s")
    _print_separator()
    print()


def main() -> int:
    """Run the full RSS → Supabase pipeline with Groq scoring.

    Returns:
        Exit code (0 = success, 1 = fatal error).
    """
    _print_banner()
    start_time = time.monotonic()

    # ------------------------------------------------------------------
    # Step 1 — Initialise Supabase and Groq connections
    # ------------------------------------------------------------------
    logger.info("Step 1/3 — Initialising Supabase & Groq connections…")
    try:
        db = LeadDatabase()
    except (ValueError, DatabaseError) as exc:
        logger.error("Cannot connect to Supabase: %s", exc)
        logger.error(
            "Make sure SUPABASE_URL and SUPABASE_KEY are set in your .env file."
        )
        return 1

    try:
        api_key = load_config()
    except Exception as exc:
        logger.error("Cannot load Groq configuration: %s", exc)
        logger.error("Make sure GROQ_API_KEY is set in your .env file.")
        return 1

    # ------------------------------------------------------------------
    # Step 2 — Collect RSS feeds
    # ------------------------------------------------------------------
    logger.info("Step 2/3 — Collecting Reddit RSS feeds…")
    raw_entries, counts_per_sub, collect_errors = collect_all()
    total_fetched = len(raw_entries)

    logger.info(
        "Collected %d raw entries from %d subreddits (%d errors).",
        total_fetched,
        len(counts_per_sub),
        collect_errors,
    )

    if total_fetched == 0:
        logger.warning(
            "No entries collected.  Check network connectivity or RSS URLs."
        )
        logger.info("Posts fetched: 0")
        logger.info("Posts sent to Groq: 0")
        logger.info("Posts successfully scored: 0")
        logger.info("Posts inserted: 0")
        _print_summary(
            fetched=0,
            parsed=0,
            skipped_parse=0,
            sent_to_groq=0,
            scored=0,
            inserted=0,
            duplicates=0,
            errors=collect_errors,
            elapsed=time.monotonic() - start_time
        )
        return 0

    # ------------------------------------------------------------------
    # Step 3 — Parse, Deduplicate, Score with Groq, and Insert
    # ------------------------------------------------------------------
    logger.info("Step 3/3 — Parsing entries, scoring, and inserting into Supabase…")
    leads, skipped_parse = parse_entries(raw_entries)

    if not leads:
        logger.warning("No valid leads after parsing.  Nothing to insert.")
        logger.info("Posts fetched: %d", total_fetched)
        logger.info("Posts sent to Groq: 0")
        logger.info("Posts successfully scored: 0")
        logger.info("Posts inserted: 0")
        _print_summary(
            fetched=total_fetched,
            parsed=0,
            skipped_parse=skipped_parse,
            sent_to_groq=0,
            scored=0,
            inserted=0,
            duplicates=0,
            errors=collect_errors,
            elapsed=time.monotonic() - start_time
        )
        return 0

    # Get existing post IDs to perform deduplication before Groq scoring
    all_ids = [lead["post_id"] for lead in leads if lead.get("post_id")]
    try:
        existing_ids = db.get_existing_post_ids(all_ids)
    except DatabaseError as exc:
        logger.error("Failed to query existing post IDs: %s", exc)
        return 1

    # Filter out duplicates
    new_leads = [lead for lead in leads if lead.get("post_id") and lead["post_id"] not in existing_ids]
    duplicates_count = len(leads) - len(new_leads)

    # Score only new leads through Groq
    scored_leads = []
    successfully_scored_count = 0
    sent_to_groq_count = len(new_leads)

    logger.info("Sending %d new posts to Groq for scoring…", sent_to_groq_count)
    for i, lead in enumerate(new_leads, start=1):
        post_id = lead["post_id"]
        title = lead.get("title", "")
        logger.info("[%d/%d] Scoring post %s: '%s'", i, sent_to_groq_count, post_id, title[:40])
        try:
            scored_lead = analyze_post(lead, api_key)
            if not scored_lead.get("reason", "").startswith("Analysis failed"):
                successfully_scored_count += 1
            scored_leads.append(scored_lead)
        except Exception as exc:
            logger.error("Failed to score post %s: %s", post_id, exc)
            fallback_lead = lead.copy()
            fallback_lead.update({
                "intent_score": 0,
                "confidence": 0.0,
                "category": "discussion",
                "reason": f"Analysis failed due to unexpected error: {str(exc)}",
                "draft_reply": "",
                "keywords": [],
                "lead_summary": "",
                "priority": "low",
                "recommended_action": "ignore",
                "processed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            })
            scored_leads.append(fallback_lead)
        
        # Gentle rate limit avoidance delay
        time.sleep(0.5)

    # Insert scored new leads into Supabase
    inserted_count = 0
    if scored_leads:
        try:
            inserted_count, _ = db.insert_leads_batch(scored_leads, existing_ids)
        except DatabaseError as exc:
            logger.error("Batch insertion failed: %s", exc)
            return 1

    # Add required logging showing explicit metrics
    logger.info("Posts fetched: %d", total_fetched)
    logger.info("Posts sent to Groq: %d", sent_to_groq_count)
    logger.info("Posts successfully scored: %d", successfully_scored_count)
    logger.info("Posts inserted: %d", inserted_count)

    # ------------------------------------------------------------------
    # Done — print summary
    # ------------------------------------------------------------------
    elapsed = time.monotonic() - start_time
    _print_summary(
        fetched=total_fetched,
        parsed=len(leads),
        skipped_parse=skipped_parse,
        sent_to_groq=sent_to_groq_count,
        scored=successfully_scored_count,
        inserted=inserted_count,
        duplicates=duplicates_count,
        errors=collect_errors,
        elapsed=elapsed,
    )

    logger.info("Pipeline finished successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

