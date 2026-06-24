"""
database.py
-----------
Supabase integration layer for the SignalRadar RSS pipeline.

Responsibilities:
- Initialise the Supabase client from environment variables.
- Check for duplicate posts before insertion.
- Insert new lead records into the ``posts`` table.
- Batch-check post_ids to minimise round-trips.

Schema notes
------------
``keywords`` is stored as a Supabase ``jsonb`` column.  The Python supabase
client does NOT automatically serialise Python lists to JSON for jsonb columns
— we must call ``json.dumps()`` before inserting.  Sending a raw Python list
causes a silent 400 / type-mismatch rejection from PostgREST.

``status`` defaults to ``'new'`` in the schema; we inject it explicitly so the
insert never relies on a server-side default that might not exist.
"""

import json
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
            "qualification_reason",
        }
    )

    # Columns whose Python value must be JSON-serialised before sending to
    # PostgREST (i.e. they are ``jsonb`` in Postgres, not a native array type).
    _JSONB_COLUMNS: frozenset[str] = frozenset({"keywords"})

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
        """Return True if *post_id* already exists in the posts table."""
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
        """Return the subset of *post_ids* that already exist in Supabase."""
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
    # Record preparation
    # ------------------------------------------------------------------

    def _prepare_record(self, lead: dict[str, Any]) -> dict[str, Any]:
        """
        Strip unknown columns, serialise jsonb fields, and inject defaults.

        Key transformations:
          - ``keywords`` (list[str]) → JSON string (required for jsonb columns)
          - ``status`` defaulted to ``'new'`` if absent
          - ``created_at`` defaulted to now (UTC) if absent
          - ``confidence`` coerced to float (Postgres ``numeric`` column)
          - ``intent_score`` coerced to int (Postgres ``integer`` column)
        """
        record: dict[str, Any] = {}

        for k, v in lead.items():
            if k not in self._ALLOWED_COLUMNS:
                continue

            # ── jsonb columns: serialise Python list/dict → JSON string ──────
            if k in self._JSONB_COLUMNS:
                if v is None:
                    record[k] = json.dumps([])
                elif isinstance(v, (list, dict)):
                    record[k] = json.dumps(v)
                elif isinstance(v, str):
                    # Already a JSON string (e.g. from a previous serialisation)
                    try:
                        json.loads(v)   # validate it's valid JSON
                        record[k] = v
                    except json.JSONDecodeError:
                        record[k] = json.dumps([v])
                else:
                    record[k] = json.dumps([str(v)])
                continue

            # ── Numeric coercions ─────────────────────────────────────────────
            if k == "intent_score":
                try:
                    record[k] = max(0, min(100, int(v))) if v is not None else 0
                except (TypeError, ValueError):
                    record[k] = 0
                continue

            if k == "confidence":
                try:
                    record[k] = max(0.0, min(1.0, float(v))) if v is not None else 0.0
                except (TypeError, ValueError):
                    record[k] = 0.0
                continue

            record[k] = v

        # ── Inject required defaults ─────────────────────────────────────────
        if "status" not in record or not record["status"]:
            record["status"] = "new"

        if "created_at" not in record:
            record["created_at"] = datetime.now(timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )

        return record

    # ------------------------------------------------------------------
    # Insertion
    # ------------------------------------------------------------------

    def insert_lead(self, lead: dict[str, Any]) -> dict[str, Any]:
        """
        Insert a single lead into the posts table.

        Logs the full payload and the full Supabase error response on failure
        so schema mismatches are immediately visible in logs.

        Args:
            lead: Normalised + scored lead dict.

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

        # Log the exact payload going to Supabase at DEBUG level
        logger.debug(
            "INSERT payload for post_id=%s:\n%s",
            post_id,
            json.dumps(record, ensure_ascii=False, indent=2, default=str),
        )

        try:
            resp = self._client.table(POSTS_TABLE).insert(record).execute()

            if not resp.data:
                # Supabase returned no error but also no data — unexpected
                raise DatabaseError(
                    f"Empty response after inserting post_id={post_id!r}. "
                    "Check RLS policies — the anon key may not have INSERT permission."
                )

            logger.debug("Inserted post_id=%s.", post_id)
            return resp.data[0]

        except DatabaseError:
            raise

        except Exception as exc:
            # Extract the raw Supabase / PostgREST error body if available
            raw_error = _extract_supabase_error(exc)

            logger.error(
                "Supabase INSERT failed for post_id=%s.\n"
                "  Error       : %s\n"
                "  Raw detail  : %s\n"
                "  Payload sent:\n%s",
                post_id,
                exc,
                raw_error,
                json.dumps(record, ensure_ascii=False, indent=2, default=str),
            )
            raise DatabaseError(
                f"Failed to insert post_id={post_id!r}: {raw_error or exc}"
            ) from exc

    def insert_leads_batch(
        self,
        leads: list[dict[str, Any]],
        existing_ids: set[str] | None = None,
    ) -> tuple[int, int]:
        """Insert multiple leads, skipping duplicates.

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
                existing_ids.add(post_id)
                inserted += 1
            except (ValueError, DatabaseError) as exc:
                # exc already contains the full Supabase error (logged inside insert_lead)
                logger.error(
                    "Skipping post_id=%s after insert failure: %s", post_id, exc
                )

        logger.info(
            "Batch insert complete — inserted: %d | duplicates: %d | total: %d",
            inserted,
            duplicates,
            len(leads),
        )
        return inserted, duplicates


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_supabase_error(exc: Exception) -> str:
    """
    Try to extract the raw PostgREST / Supabase error message from an exception.

    The supabase-py client wraps HTTP errors in several layers.  We try each
    known attribute path and return the most informative string found.
    """
    # postgrest-py >= 0.10 wraps errors in APIError with a .message and .details
    for attr in ("message", "details", "hint", "code"):
        val = getattr(exc, attr, None)
        if val:
            return str(val)

    # Older versions / requests.HTTPError have a response body
    response = getattr(exc, "response", None)
    if response is not None:
        try:
            body = response.json()
            return json.dumps(body, ensure_ascii=False)
        except Exception:
            try:
                return response.text
            except Exception:
                pass

    # Last resort: string representation of the cause chain
    cause = getattr(exc, "__cause__", None)
    if cause:
        return str(cause)

    return str(exc)
