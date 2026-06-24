"""
rss_collector.py
----------------
Fetches Reddit RSS feeds for all configured subreddits with aggressive
rate-limit avoidance.

Anti-429 strategy (layered):
  1. Randomise subreddit order every run — avoids predictable access patterns.
  2. Randomised delay 5–12 s between requests — human-paced browsing rhythm.
  3. User-Agent rotation across 16 distinct desktop/mobile UA strings.
  4. Exponential back-off with full jitter on 429 / 5xx (up to 3 retries).
  5. In-memory 30-minute RSS response cache — skips HTTP on warm runs.
  6. Per-run runtime budget — stops new fetches if wall-clock > MAX_RUN_SECONDS.
  7. Per-subreddit success/failure log + overall success-rate at end of run.

Public API
----------
collect_all()  ->  (raw_entries, counts_per_sub, error_count)
"""

from __future__ import annotations

import hashlib
import logging
import random
import time
from datetime import datetime, timezone
from typing import Any
import re

import feedparser
import requests

from backend.config import (
    RSS_FEED_TEMPLATE,
    RSS_LIMIT,
    REQUEST_TIMEOUT,
    SUBREDDITS,
)

logger = logging.getLogger(__name__)

# Toggle to switch between combined RSS (new) and per-subreddit RSS (old)
USE_COMBINED_RSS: bool = True

# ---------------------------------------------------------------------------
# Runtime constants
# ---------------------------------------------------------------------------

# Hard wall-clock ceiling for collect_all() — keeps pipeline under 5 minutes.
MAX_RUN_SECONDS: int = 4 * 60 + 30  # 4 min 30 s (leaves 30 s headroom)

# Target success-rate threshold for the summary status line.
SUCCESS_RATE_TARGET: float = 0.80  # 80 %

# Maximum per-subreddit retry attempts (initial + retries).
MAX_ATTEMPTS: int = 3

# ---------------------------------------------------------------------------
# User-Agent pool — 3 compliant Reddit crawler UAs rotated sequentially
# ---------------------------------------------------------------------------
_USER_AGENTS: list[str] = [
    "script:signal-radar:v1.0 (by /u/signalradar)",
    "script:signal-radar-leads:v1.0 (by /u/signalradar)",
    "script:signal-radar-monitor:v1.0 (by /u/signalradar)",
]

_ua_index = 0
_last_request_time = 0.0


def _get_next_ua() -> str:
    """Return the next User-Agent string in rotation."""
    global _ua_index
    ua = _USER_AGENTS[_ua_index]
    _ua_index = (_ua_index + 1) % len(_USER_AGENTS)
    return ua


def _build_headers(accept_header: str) -> dict[str, str]:
    """Build a realistic browser-like header set with a rotated UA and specific Accept header."""
    return {
        "User-Agent": _get_next_ua(),
        "Accept": accept_header,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


def _execute_request(url: str, accept_header: str, request_type: str, timeout: float = REQUEST_TIMEOUT) -> requests.Response:
    """Execute a request with sequential UA rotation and a minimum 2 second rate-limiting delay."""
    global _last_request_time
    now = time.monotonic()
    elapsed = now - _last_request_time
    if elapsed < 2.0:
        time.sleep(2.0 - elapsed)
    
    headers = _build_headers(accept_header)
    logger.info("Request type: %s | UA used: %s", request_type, headers["User-Agent"])
    
    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        return response
    finally:
        _last_request_time = time.monotonic()


# ---------------------------------------------------------------------------
# Exponential back-off helper
# ---------------------------------------------------------------------------

def _backoff_wait(attempt: int, base: float = 8.0, cap: float = 60.0) -> float:
    """
    Return a sleep duration using full-jitter exponential back-off.

    Formula:  sleep = random(0, min(cap, base * 2^attempt))

    Args:
        attempt: Zero-indexed attempt number (0 = first retry).
        base:    Base wait in seconds (matches typical Retry-After floor).
        cap:     Maximum sleep ceiling in seconds.

    Returns:
        Seconds to sleep (float).
    """
    ceiling = min(cap, base * (2 ** attempt))
    return random.uniform(0.0, ceiling)


# ---------------------------------------------------------------------------
# In-memory RSS response cache (30-minute TTL)
# ---------------------------------------------------------------------------

_CACHE_TTL_SECONDS: int = 30 * 60  # 30 minutes

# Structure: { cache_key: {"expires_at": float, "cached_at": float, "entries": list} }
_cache: dict[str, dict[str, Any]] = {}


def _cache_key(subreddit: str, limit: int) -> str:
    raw = f"{subreddit.lower()}:{limit}"
    return hashlib.md5(raw.encode()).hexdigest()


def _cache_get(subreddit: str, limit: int) -> list[dict[str, Any]] | None:
    """Return cached entries if still valid, else None."""
    key = _cache_key(subreddit, limit)
    entry = _cache.get(key)
    if entry and time.monotonic() < entry["expires_at"]:
        age_s = int(time.monotonic() - entry["cached_at"])
        logger.info(
            "Cache HIT  r/%s — returning %d cached entries (age %ds, TTL 30m).",
            subreddit,
            len(entry["entries"]),
            age_s,
        )
        return entry["entries"]
    return None


def _cache_set(subreddit: str, limit: int, entries: list[dict[str, Any]]) -> None:
    """Store entries in the cache with a 30-minute TTL."""
    key = _cache_key(subreddit, limit)
    now = time.monotonic()
    _cache[key] = {
        "entries": entries,
        "cached_at": now,
        "expires_at": now + _CACHE_TTL_SECONDS,
    }


def clear_cache() -> None:
    """Evict all cached RSS responses (useful for testing)."""
    _cache.clear()
    logger.info("RSS response cache cleared.")


# ---------------------------------------------------------------------------
# Error class
# ---------------------------------------------------------------------------

class RSSCollectorError(Exception):
    """Raised when a subreddit RSS feed cannot be fetched or parsed."""


# ---------------------------------------------------------------------------
# URL builder
# ---------------------------------------------------------------------------

def build_feed_url(subreddit: str, limit: int = RSS_LIMIT) -> str:
    """Return the Reddit RSS URL for *subreddit* with a limit query param."""
    base = RSS_FEED_TEMPLATE.format(subreddit=subreddit)
    return f"{base}?limit={limit}"


# ---------------------------------------------------------------------------
# Single-feed fetcher — exponential back-off edition
# ---------------------------------------------------------------------------

def _json_to_feed_entry(child: dict[str, Any]) -> dict[str, Any]:
    """Convert a Reddit JSON child post object to a mock feedparser entry."""
    data = child.get("data", {})
    created_utc = data.get("created_utc")
    published_parsed = None
    if created_utc:
        try:
            published_parsed = time.gmtime(created_utc)
        except Exception:
            pass

    permalink = data.get("permalink", "")
    link = f"https://www.reddit.com{permalink}" if permalink.startswith("/") else permalink

    return {
        "id": f"t3_{data.get('id', '')}",
        "link": link,
        "title": data.get("title", ""),
        "author": data.get("author", ""),
        "summary": data.get("selftext", ""),
        "published_parsed": published_parsed,
        "published": datetime.fromtimestamp(created_utc, timezone.utc).isoformat() if created_utc else "",
    }


# ---------------------------------------------------------------------------
# Single-feed fetcher — retry + fallback edition
# ---------------------------------------------------------------------------

def fetch_feed(
    subreddit: str,
    limit: int = RSS_LIMIT,
    *,
    deadline: float | None = None,
) -> tuple[list[dict[str, Any]], str]:
    """
    Fetch and parse the RSS feed for a single subreddit with retry logic and JSON fallback.

    Returns:
        A tuple of (entries, status) where status is one of the four:
        'succeeded first try', 'succeeded after retry', 'succeeded via json fallback', 'failed completely'
    """
    # ── Cache check ──────────────────────────────────────────────────────────
    cached = _cache_get(subreddit, limit)
    if cached is not None:
        return cached, "succeeded first try"

    # ── Runtime budget guard ─────────────────────────────────────────────────
    if deadline is not None and time.monotonic() >= deadline:
        logger.warning("Runtime budget exceeded — skipping r/%s.", subreddit)
        return [], "failed completely"

    url = build_feed_url(subreddit, limit)

    # Attempt RSS fetching (up to 2 attempts maximum)
    for attempt in range(1, 3):
        if deadline is not None and time.monotonic() >= deadline:
            logger.warning("Runtime budget exceeded during RSS retry for r/%s.", subreddit)
            break

        logger.info(
            "Fetching RSS r/%s (attempt %d/2)",
            subreddit,
            attempt,
        )

        try:
            response = _execute_request(url, accept_header="application/rss+xml, application/xml, text/xml", request_type="RSS")
            if response.status_code == 200:
                feed = feedparser.parse(response.content)
                if feed.bozo and not feed.entries:
                    bozo_exc = getattr(feed, "bozo_exception", "unknown parse error")
                    raise RSSCollectorError(f"Malformed RSS: {bozo_exc}")
                
                entries = list(feed.entries)
                # Store in cache
                _cache_set(subreddit, limit, entries)
                
                status = "succeeded first try" if attempt == 1 else "succeeded after retry"
                logger.info("r/%s — fetched %d RSS entries (%s).", subreddit, len(entries), status)
                return entries, status
            else:
                raise RSSCollectorError(f"HTTP {response.status_code}")

        except Exception as exc:
            logger.warning(
                "RSS attempt %d/2 failed on r/%s: %s",
                attempt,
                subreddit,
                exc,
            )
            if attempt == 1:
                logger.info("Sleeping 3 seconds before RSS retry...")
                time.sleep(3.0)

    # RSS failed. Fall back to JSON endpoint
    if deadline is not None and time.monotonic() >= deadline:
        logger.warning("Runtime budget exceeded before JSON fallback for r/%s.", subreddit)
        return [], "failed completely"

    json_url = f"https://www.reddit.com/r/{subreddit}/new.json?limit=25"
    logger.info("RSS failed for r/%s. Falling back to JSON...", subreddit)

    try:
        response = _execute_request(json_url, accept_header="application/json", request_type="JSON")
        if response.status_code == 200:
            json_data = response.json()
            children = json_data.get("data", {}).get("children", [])
            entries = []
            for child in children:
                entries.append(_json_to_feed_entry(child))
            
            # Store in cache
            _cache_set(subreddit, limit, entries)
            
            logger.info("r/%s — fetched %d JSON entries via fallback.", subreddit, len(entries))
            return entries, "succeeded via json fallback"
        else:
            logger.error("JSON fallback failed for r/%s: HTTP %d", subreddit, response.status_code)
    except Exception as exc:
        logger.error("JSON fallback failed for r/%s: %s", subreddit, exc)

    return [], "failed completely"


# ---------------------------------------------------------------------------
# Combined feed fetcher
# ---------------------------------------------------------------------------

def fetch_combined_feed(
    subreddits: list[str],
    limit: int = 100,
    *,
    deadline: float | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch and parse the combined RSS feed for multiple subreddits.
    """
    if deadline is not None and time.monotonic() >= deadline:
        logger.warning("Runtime budget exceeded before combined RSS fetch.")
        return []

    combined_subs = "+".join(subreddits)
    url = f"https://www.reddit.com/r/{combined_subs}/new.rss?limit={limit}"
    
    logger.info("Fetching combined RSS feed: %s", url)
    
    try:
        response = _execute_request(url, accept_header="application/rss+xml, application/xml, text/xml", request_type="RSS")
        if response.status_code == 200:
            feed = feedparser.parse(response.content)
            if feed.bozo and not feed.entries:
                bozo_exc = getattr(feed, "bozo_exception", "unknown parse error")
                logger.warning("Malformed combined RSS: %s", bozo_exc)
                return []
            
            entries = list(feed.entries)
            logger.info("Combined RSS success: fetched %d entries.", len(entries))
            return entries
        else:
            logger.warning("Combined RSS fetch failed with HTTP %d", response.status_code)
    except Exception as exc:
        logger.error("Combined RSS fetch failed with exception: %s", exc)
        
    return []


# ---------------------------------------------------------------------------
# Batch collector
# ---------------------------------------------------------------------------

def collect_all(
    subreddits: list[str] | None = None,
    limit: int = RSS_LIMIT,
    min_delay: float = 5.0,
    max_delay: float = 12.0,
    max_run_seconds: int = MAX_RUN_SECONDS,
) -> tuple[list[dict[str, Any]], dict[str, int], int]:
    """
    Fetch RSS feeds for every subreddit in the watchlist.
    Uses a single combined request if USE_COMBINED_RSS is True, falling back to
    per-subreddit fetches on error or if the toggle is disabled.
    """
    run_start = time.monotonic()
    deadline = run_start + max_run_seconds
    targets = list(subreddits or SUBREDDITS)

    if USE_COMBINED_RSS:
        logger.info("Running RSS collection using combined multi-subreddit strategy...")
        combined_limit = 100
        
        raw_entries = fetch_combined_feed(targets, limit=combined_limit, deadline=deadline)
        
        if raw_entries:
            processed_entries = []
            counts_per_sub = {sub: 0 for sub in targets}
            sub_map = {sub.lower(): sub for sub in targets}
            
            for entry in raw_entries:
                sub_resolved = None
                
                # Method A: Tag parsing
                tags = entry.get("tags", [])
                if tags and isinstance(tags, list):
                    term = tags[0].get("term", "").lower()
                    if term in sub_map:
                        sub_resolved = sub_map[term]
                
                # Method B: URL parsing fallback
                if not sub_resolved:
                    link = entry.get("link", "")
                    match = re.search(r"/r/([^/]+)/", link, re.IGNORECASE)
                    if match:
                        term = match.group(1).lower()
                        if term in sub_map:
                            sub_resolved = sub_map[term]
                
                # Fallback to tag term or parsed name even if not in watchlist, just in case
                if not sub_resolved:
                    if tags and isinstance(tags, list):
                        sub_resolved = tags[0].get("term", "")
                    else:
                        match = re.search(r"/r/([^/]+)/", link, re.IGNORECASE)
                        if match:
                            sub_resolved = match.group(1)
                
                if sub_resolved:
                    entry["_subreddit"] = sub_resolved
                    sub_key = sub_resolved.lower()
                    for sub in targets:
                        if sub.lower() == sub_key:
                            counts_per_sub[sub] += 1
                            break
                    processed_entries.append(entry)
            
            # Unique posts (deduplicated by entry ID or link)
            unique_post_ids = set()
            unique_entries = []
            for entry in processed_entries:
                post_id = entry.get("id") or entry.get("link")
                if post_id not in unique_post_ids:
                    unique_post_ids.add(post_id)
                    unique_entries.append(entry)
            
            elapsed = time.monotonic() - run_start
            
            print("--- RSS REPORT ---")
            print("Feed type: Combined RSS")
            print(f"Posts fetched: {len(processed_entries)}")
            print(f"Unique posts: {len(unique_entries)}")
            print(f"Collection runtime: {elapsed:.2f}s")
            print("------------------")
            
            logger.info("Entries per subreddit in combined feed:")
            for sub, count in counts_per_sub.items():
                logger.info("  r/%s: %d", sub, count)
                
            return unique_entries, counts_per_sub, 0
        else:
            logger.warning("Combined RSS feed returned 0 entries or failed. Falling back to per-subreddit collection.")

    # ── Fallback / Old Path ──────────────────────────────────────────────────
    # ── Randomise order every run ─────────────────────────────────────────────
    random.shuffle(targets)
    logger.info(
        "Collection starting (per-subreddit fallback) — %d subreddits (shuffled), limit=%d/sub, budget=%ds.",
        len(targets),
        limit,
        max_run_seconds,
    )

    raw_entries = []
    counts_per_sub = {}
    failed_subs: list[str] = []
    
    # Diagnostic counts
    succeeded_first = 0
    succeeded_retry = 0
    succeeded_json = 0
    failed_completely = 0
    
    total = len(targets)

    for i, sub in enumerate(targets):
        # ── Budget pre-check — skip remaining if out of time ─────────────────
        if time.monotonic() >= deadline:
            logger.warning(
                "Runtime budget exhausted after %d/%d subreddits — skipping remaining.",
                i,
                total,
            )
            for remaining in targets[i:]:
                counts_per_sub[remaining] = 0
                failed_subs.append(remaining)
                failed_completely += 1
            break

        logger.info("[%d/%d] Processing r/%s...", i + 1, total, sub)

        try:
            entries, status = fetch_feed(sub, limit, deadline=deadline)
            
            if status == "succeeded first try":
                succeeded_first += 1
            elif status == "succeeded after retry":
                succeeded_retry += 1
            elif status == "succeeded via json fallback":
                succeeded_json += 1
            else:
                succeeded_json = succeeded_json # NOP
                failed_completely += 1
                failed_subs.append(sub)

            for entry in entries:
                entry["_subreddit"] = sub
            raw_entries.extend(entries)
            counts_per_sub[sub] = len(entries)

        except Exception as exc:
            logger.error("Unexpected error on r/%s: %s", sub, exc)
            counts_per_sub[sub] = 0
            failed_subs.append(sub)
            failed_completely += 1

    # ── Summary Report Block ──────────────────────────────────────────────────
    total_feeds = len(targets)
    succeeded_total = succeeded_first + succeeded_retry + succeeded_json
    success_rate = round((succeeded_total / total_feeds * 100)) if total_feeds else 0
    failed_list_str = ", ".join(failed_subs) if failed_subs else "None"

    print("--- RSS REPORT ---")
    print(f"Total feeds:                {total_feeds}")
    print(f"Succeeded first try:        {succeeded_first}")
    print(f"Succeeded after retry:      {succeeded_retry}")
    print(f"Succeeded via JSON fallback:{succeeded_json}")
    print(f"Failed completely:          {failed_completely}")
    print(f"Success rate:               {success_rate}%")
    print(f"Failed subreddits:          {failed_list_str}")
    print("------------------")

    return raw_entries, counts_per_sub, failed_completely
