"""
reddit_parser.py
----------------
Transforms raw feedparser entries into normalised lead dicts.

Responsibilities:
- Extract the 7 canonical fields from each RSS entry.
- Normalise timestamps to ISO-8601 UTC strings.
- Derive a stable ``post_id`` from the Reddit entry ``id`` field.
- Return a clean list of lead dicts ready for database insertion.

The normalised schema is:
    {
        "post_id":      str   — unique Reddit post ID (e.g. "1ab2cd")
        "title":        str
        "body":         str   — post summary / self-text (may be empty)
        "subreddit":    str
        "url":          str   — direct link to the Reddit thread
        "author":       str   — username or "" if anonymous
        "published_at": str   — ISO-8601 UTC timestamp or ""
    }

Future hook:
  The list returned by parse_entries() is the input to the Groq scorer
  when that module is added.
"""

import logging
import re
import time
import html
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# Reddit post IDs are alphanumeric (base-36) — typically 5-7 chars.
_POST_ID_PATTERN = re.compile(r"/comments/([a-z0-9]+)/")


def _extract_post_id(entry: dict[str, Any]) -> str:
    """Extract the Reddit post ID from an RSS entry.

    Reddit RSS ``<id>`` tags look like:
        ``t3_1ab2cd``
    The permalink in ``<link>`` looks like:
        ``https://www.reddit.com/r/SaaS/comments/1ab2cd/title_slug/``

    We prefer the permalink-based extraction as it is more reliable.

    Args:
        entry: A raw feedparser entry dict.

    Returns:
        The short post ID string, or an empty string if not found.
    """
    link = entry.get("link", "")
    match = _POST_ID_PATTERN.search(link)
    if match:
        return match.group(1)

    # Fallback: strip the "t3_" prefix from the <id> tag
    entry_id = entry.get("id", "")
    if entry_id.startswith("t3_"):
        return entry_id[3:]

    # Last resort: use the whole id (may be a URL)
    return entry_id


def _extract_author(entry: dict[str, Any]) -> str:
    """Return the post author username, or empty string if not available."""
    # feedparser maps <author> to entry.author
    author = entry.get("author", "")
    if not author:
        # Some feeds expose author detail object
        author_detail = entry.get("author_detail", {})
        author = author_detail.get("name", "") if isinstance(author_detail, dict) else ""
    # Reddit sometimes includes "/u/username" — strip the prefix
    return author.lstrip("/u/").strip()


def _extract_body(entry: dict[str, Any]) -> str:
    """Return the post body / summary text, cleaned of HTML tags."""
    # feedparser stores self-text in entry.summary or entry.content[0].value
    raw = ""
    content = entry.get("content", [])
    if content and isinstance(content, list):
        raw = content[0].get("value", "")
    if not raw:
        raw = entry.get("summary", "")

    # Strip HTML tags with a simple regex (body text from RSS is minimal HTML)
    clean = re.sub(r"<[^>]+>", " ", raw)
    # Collapse whitespace and decode HTML entities
    clean = html.unescape(clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def _extract_published_at(entry: dict[str, Any]) -> str:
    """Return ISO-8601 UTC timestamp string, or empty string on failure."""
    # feedparser parses the date into a time.struct_time in `published_parsed`
    parsed = entry.get("published_parsed")
    if parsed:
        try:
            dt = datetime(*parsed[:6], tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        except (TypeError, ValueError):
            pass

    # Fallback: try the raw string
    raw_date = entry.get("published", "")
    if raw_date:
        return raw_date.strip()

    return ""


def normalise_entry(entry: dict[str, Any]) -> dict[str, Any] | None:
    """Convert a single raw feedparser entry into a normalised lead dict.

    Args:
        entry: Raw feedparser entry dict (with ``_subreddit`` injected by
               rss_collector).

    Returns:
        Normalised lead dict, or ``None`` if the entry is missing critical
        fields (post_id or title).
    """
    post_id = _extract_post_id(entry)
    title = entry.get("title", "").strip()

    if not post_id:
        logger.warning("Skipping entry with no extractable post_id: %s", entry.get("link"))
        return None

    if not title:
        logger.warning("Skipping entry with no title (post_id=%s).", post_id)
        return None

    # Subreddit: prefer the injected _subreddit; fall back to tag parsing
    subreddit = entry.get("_subreddit", "")
    if not subreddit:
        # feedparser may expose tags list
        tags = entry.get("tags", [])
        if tags and isinstance(tags, list):
            subreddit = tags[0].get("term", "")

    return {
        "post_id": post_id,
        "title": title,
        "body": _extract_body(entry),
        "subreddit": subreddit,
        "url": entry.get("link", ""),
        "author": _extract_author(entry),
        "published_at": _extract_published_at(entry),
    }


def parse_entries(
    raw_entries: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    """Normalise a list of raw RSS entries into lead dicts.

    Args:
        raw_entries: Output from ``rss_collector.collect_all()``.

    Returns:
        A 2-tuple:
          - leads (list): Successfully normalised lead dicts.
          - skipped (int): Number of entries that were skipped due to
            missing required fields.
    """
    leads: list[dict[str, Any]] = []
    skipped = 0

    for entry in raw_entries:
        lead = normalise_entry(entry)
        if lead is None:
            skipped += 1
        else:
            leads.append(lead)

    logger.info(
        "Parsing complete. Normalised: %d | Skipped: %d",
        len(leads),
        skipped,
    )
    return leads, skipped
