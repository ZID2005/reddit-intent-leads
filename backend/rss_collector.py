"""
rss_collector.py
----------------
Fetches Reddit RSS feeds for all configured subreddits.

Responsibilities:
- Build the RSS URL for each subreddit.
- Fetch with a browser-like User-Agent (Reddit blocks python-requests).
- Parse the feed using feedparser.
- Return a flat list of raw feed entries (dicts) ready for reddit_parser.py.
- Gracefully handle and log network / parse errors without crashing.

Rate-limit handling:
- Reddit enforces aggressive per-IP rate limits (~1 req/sec).
- Requests are spaced 3s apart by default.
- 429 responses trigger exponential backoff + jitter before retrying.

Future hook:
  The collect_all() return value feeds directly into the Groq scorer step
  once that module is added to run_pipeline.py.
"""

import logging
import random
import time
from typing import Any

import feedparser
import requests

from backend.config import (
    RSS_FEED_TEMPLATE,
    RSS_LIMIT,
    REQUEST_TIMEOUT,
    SUBREDDITS,
    USER_AGENT,
)

logger = logging.getLogger(__name__)


class RSSCollectorError(Exception):
    """Raised when a subreddit RSS feed cannot be fetched or parsed."""


def build_feed_url(subreddit: str, limit: int = RSS_LIMIT) -> str:
    """Return the Reddit RSS URL for *subreddit* with an optional limit param.

    Args:
        subreddit: Subreddit name without the ``r/`` prefix.
        limit:     Maximum number of posts (Reddit default/max is 25 / 100).

    Returns:
        Fully-qualified RSS URL string.
    """
    base = RSS_FEED_TEMPLATE.format(subreddit=subreddit)
    return f"{base}?limit={limit}"


def fetch_feed(
    subreddit: str,
    limit: int = RSS_LIMIT,
    max_retries: int = 4,
    initial_backoff: float = 6.0,
) -> list[dict[str, Any]]:
    """Fetch and parse the RSS feed for a single subreddit.

    Retries up to *max_retries* times on 429 / transient errors with
    exponential backoff + random jitter.

    Args:
        subreddit:       Subreddit name (e.g. ``"SaaS"``).
        limit:           Max posts to request.
        max_retries:     How many times to retry on rate-limit / transient errors.
        initial_backoff: Base wait in seconds (doubles each retry).

    Returns:
        A list of raw ``feedparser`` entry dicts.

    Raises:
        RSSCollectorError: On unrecoverable errors or exhausted retries.
    """
    url = build_feed_url(subreddit, limit)
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }

    backoff = initial_backoff
    last_exc: Exception | None = None

    for attempt in range(1, max_retries + 1):
        logger.info(
            "Fetching r/%s (attempt %d/%d)...", subreddit, attempt, max_retries
        )
        try:
            response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)

            if response.status_code == 404:
                raise RSSCollectorError(
                    f"Subreddit r/{subreddit} not found (404)."
                )

            if response.status_code == 429:
                # Honour Retry-After header if present, else use backoff
                retry_after_hdr = response.headers.get("Retry-After")
                if retry_after_hdr:
                    try:
                        wait = float(retry_after_hdr) + random.uniform(1, 3)
                    except ValueError:
                        wait = backoff + random.uniform(1, 3)
                else:
                    wait = backoff + random.uniform(1, 3)

                logger.warning(
                    "Rate limited (429) on r/%s. Waiting %.1fs before retry %d/%d...",
                    subreddit, wait, attempt, max_retries,
                )
                time.sleep(wait)
                backoff *= 2.0
                last_exc = RSSCollectorError(
                    f"Rate limited by Reddit on r/{subreddit} (429)."
                )
                continue

            response.raise_for_status()

            feed = feedparser.parse(response.content)

            if feed.bozo and not feed.entries:
                bozo_exc = getattr(feed, "bozo_exception", "unknown parse error")
                raise RSSCollectorError(
                    f"Malformed RSS from r/{subreddit}: {bozo_exc}"
                )

            logger.info(
                "r/%s -- fetched %d entries.", subreddit, len(feed.entries)
            )
            return feed.entries  # type: ignore[return-value]

        except RSSCollectorError:
            raise  # Propagate non-retryable errors immediately
        except requests.exceptions.Timeout as exc:
            last_exc = exc
            logger.warning("Timeout on r/%s (attempt %d).", subreddit, attempt)
        except requests.exceptions.RequestException as exc:
            last_exc = exc
            logger.warning(
                "Network error on r/%s (attempt %d): %s", subreddit, attempt, exc
            )

        if attempt < max_retries:
            wait = backoff + random.uniform(0, 2)
            logger.info("Retrying r/%s in %.1fs...", subreddit, wait)
            time.sleep(wait)
            backoff *= 2.0

    raise RSSCollectorError(
        f"Failed to fetch r/{subreddit} after {max_retries} attempts."
    ) from last_exc


def collect_all(
    subreddits: list[str] | None = None,
    limit: int = RSS_LIMIT,
    delay_between_requests: float = 3.5,
) -> tuple[list[dict[str, Any]], dict[str, int], int]:
    """Fetch RSS feeds for every subreddit in the watchlist.

    Args:
        subreddits:               Override the default SUBREDDITS list.
        limit:                    Posts per subreddit.
        delay_between_requests:   Seconds to sleep between subreddit fetches.
                                  Reddit enforces ~1 req/sec per IP; 3-4s is safe.

    Returns:
        A 3-tuple:
          - raw_entries (list): All raw feedparser entry dicts collected.
          - counts_per_sub (dict): Mapping of subreddit -> entries fetched.
          - error_count (int): Number of subreddits that failed.
    """
    targets = subreddits or SUBREDDITS
    raw_entries: list[dict[str, Any]] = []
    counts_per_sub: dict[str, int] = {}
    error_count = 0

    total = len(targets)
    for i, sub in enumerate(targets):
        logger.info("[%d/%d] Processing r/%s...", i + 1, total, sub)
        try:
            entries = fetch_feed(sub, limit)
            for entry in entries:
                entry["_subreddit"] = sub  # type: ignore[index]
            raw_entries.extend(entries)
            counts_per_sub[sub] = len(entries)
        except RSSCollectorError as exc:
            logger.error("Skipping r/%s: %s", sub, exc)
            counts_per_sub[sub] = 0
            error_count += 1
        except Exception as exc:  # noqa: BLE001
            logger.error("Unexpected error on r/%s: %s", sub, exc)
            counts_per_sub[sub] = 0
            error_count += 1

        # Polite delay with jitter between requests
        if i < total - 1 and delay_between_requests > 0:
            wait = delay_between_requests + random.uniform(0, 1.5)
            logger.debug("Waiting %.1fs before next request...", wait)
            time.sleep(wait)

    fetched_total = sum(counts_per_sub.values())
    logger.info(
        "Collection complete. Entries: %d | Subreddits: %d | Errors: %d",
        fetched_total,
        total,
        error_count,
    )
    return raw_entries, counts_per_sub, error_count
