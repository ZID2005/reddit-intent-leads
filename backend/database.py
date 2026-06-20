"""
database.py
-----------
Supabase integration layer for the SignalRadar RSS pipeline.

Responsibilities:
- Initialise the Supabase client from environment variables.
- Check for duplicate posts before insertion.
- Insert new lead records into the ``posts`` table.
- Batch-check post_ids to minimise round-trips.

This module is intentionally separate from the existing ``app/database.py``
so the two pipelines can evolve independently.  Once Groq scoring is added,
this file will remain unchanged — the scorer will just enrich the lead dict
before it arrives here.

Supabase ``posts`` table columns we write to:
    post_id, title, body, subreddit, url, created_at,
    author (optional), published_at (optional)
"""

import logging
from datetime import datetime, timezone
from typing import Any

from supabase import create_client, Client

from backend.config import SUPABASE_URL, SUPABASE_KEY, POSTS_TABLE

logger = logging.getLogger(__name__)


class DatabaseError(Exception):
    """Raised when a Supabase operation fails."""


class LeadDatabase:
    """Thin wrapper around the Supabase client for lead insertion."""

    # Columns that exist in the Supabase ``posts`` table.
    # Only keys in this set will be written; extras are silently dropped.
    # Note: 'author' and 'published_at' are NOT in the schema — excluded.
    _ALLOWED_COLUMNS: frozenset[str] = frozenset(
        {
            "post_id",
            "title",
            "body",
            "subreddit",
            "url",
            "created_at",
            "status",
            # Future columns (Groq scorer will populate these):
            "intent_score",
            "confidence",
            "priority",
            "category",
            "recommended_action",
            "reason",
            "draft_reply",
            "keywords",
            "processed_at",
            "lead_summary",
        }
    )

    def __init__(self, client: Client | None = None) -> None:
        """Initialise LeadDatabase.

        Args:
            client: Optional pre-built Supabase client (useful in tests).

        Raises:
            ValueError:     If SUPABASE_URL or SUPABASE_KEY are missing.
            DatabaseError:  If the Supabase client cannot be created.
        """
        if client is not None:
            self._client = client
            return

        if not SUPABASE_URL:
            raise ValueError("SUPABASE_URL is missing from environment.")
        if not SUPABASE_KEY:
            raise ValueError("SUPABASE_KEY is missing from environment.")

        try:
            self._client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialised (URL: %s...).", SUPABASE_URL[:40])
        except Exception as exc:
            raise DatabaseError("Failed to create Supabase client.") from exc

    # ------------------------------------------------------------------
    # Duplicate detection
    # ------------------------------------------------------------------

    def post_exists(self, post_id: str) -> bool:
        """Return True if *post_id* already exists in the posts table.

        Args:
            post_id: The Reddit post ID to check.

        Raises:
            DatabaseError: On Supabase query failure.
        """
        try:
            resp = (
                self._client.table(POSTS_TABLE)
                .select("post_id")
                .eq("post_id", post_id)
                .limit(1)
                .execute()
            )
            return bool(resp.data)
        except Exception as exc:
            raise DatabaseError(
                f"Existence check failed for post_id={post_id!r}."
            ) from exc

    def get_existing_post_ids(self, post_ids: list[str]) -> set[str]:
        """Return the subset of *post_ids* that already exist in Supabase.

        Performs a single batched ``IN`` query rather than one query per post,
        which is much more efficient for large batches.

        Args:
            post_ids: List of Reddit post IDs to check.

        Returns:
            Set of IDs that are already stored.

        Raises:
            DatabaseError: On Supabase query failure.
        """
        if not post_ids:
            return set()

        try:
            resp = (
                self._client.table(POSTS_TABLE)
                .select("post_id")
                .in_("post_id", post_ids)
                .execute()
            )
            return {row["post_id"] for row in resp.data}
        except Exception as exc:
            raise DatabaseError("Batch existence check failed.") from exc

    # ------------------------------------------------------------------
    # Insertion
    # ------------------------------------------------------------------

    def _prepare_record(self, lead: dict[str, Any]) -> dict[str, Any]:
        """Strip unknown columns and inject ``created_at`` if missing."""
        record = {k: v for k, v in lead.items() if k in self._ALLOWED_COLUMNS}

        # Always set created_at to now (UTC) if not already provided
        if "created_at" not in record:
            record["created_at"] = datetime.now(timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )

        return record

    def insert_lead(self, lead: dict[str, Any]) -> dict[str, Any]:
        """Insert a single lead into the posts table.

        Args:
            lead: Normalised lead dict from reddit_parser.

        Returns:
            The row returned by Supabase after insertion.

        Raises:
            ValueError:    If required fields (post_id, title) are absent.
            DatabaseError: On Supabase insertion failure.
        """
        if not lead.get("post_id"):
            raise ValueError("lead must contain a non-empty 'post_id'.")
        if not lead.get("title"):
            raise ValueError("lead must contain a non-empty 'title'.")

        record = self._prepare_record(lead)
        post_id = record["post_id"]

        try:
            resp = self._client.table(POSTS_TABLE).insert(record).execute()
            if not resp.data:
                raise DatabaseError(
                    f"Empty response after inserting post_id={post_id!r}."
                )
            logger.debug("Inserted post_id=%s.", post_id)
            return resp.data[0]
        except DatabaseError:
            raise
        except Exception as exc:
            raise DatabaseError(
                f"Failed to insert post_id={post_id!r}."
            ) from exc

    def insert_leads_batch(
        self,
        leads: list[dict[str, Any]],
        existing_ids: set[str] | None = None,
    ) -> tuple[int, int]:
        """Insert multiple leads, skipping duplicates.

        Args:
            leads:       List of normalised lead dicts.
            existing_ids: Pre-fetched set of already-stored post_ids.  If
                          ``None``, a batch lookup is performed automatically.

        Returns:
            A 2-tuple: (inserted_count, duplicate_count).
        """
        if existing_ids is None:
            all_ids = [lead["post_id"] for lead in leads if lead.get("post_id")]
            existing_ids = self.get_existing_post_ids(all_ids)

        inserted = 0
        duplicates = 0

        for lead in leads:
            post_id = lead.get("post_id", "")
            if not post_id:
                logger.warning("Skipping lead with empty post_id.")
                continue

            if post_id in existing_ids:
                logger.debug("Duplicate — skipping post_id=%s.", post_id)
                duplicates += 1
                continue

            try:
                self.insert_lead(lead)
                existing_ids.add(post_id)  # prevent in-run duplicates
                inserted += 1
            except (ValueError, DatabaseError) as exc:
                logger.error("Failed to insert post_id=%s: %s", post_id, exc)

        return inserted, duplicates
