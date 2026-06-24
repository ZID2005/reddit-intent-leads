"""
scheduler.py
------------
Automated lead refresh pipeline scheduler for SignalRadar.

Architecture:
  - APScheduler BackgroundScheduler runs pipeline_job() on a configurable interval.
  - FastAPI HTTP server exposes status/control endpoints consumed by the frontend.
  - Each run writes a record to the Supabase ``scheduler_runs`` table.

Run with:
    python backend/scheduler.py

Endpoints:
    GET  /api/scheduler/status   — current state, last run, next run
    POST /api/scheduler/run      — trigger an immediate run
    POST /api/scheduler/config   — change interval hours
    GET  /api/scheduler/history  — last N run records from Supabase
"""

from __future__ import annotations

import io
import logging
import sys
import threading
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

# Force UTF-8 on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from backend.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SCHEDULER_RUNS_TABLE,
    SCHEDULER_INTERVAL_HOURS,
    SCHEDULER_VALID_INTERVALS,
    SCHEDULER_API_PORT,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
# Silence noisy third-party loggers
for _noisy in ("httpx", "hpack", "httpcore", "apscheduler.executors"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

# Show full insert payloads and Supabase errors during debugging
logging.getLogger("backend.database").setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# In-memory scheduler state
# ---------------------------------------------------------------------------
class SchedulerState:
    """Thread-safe in-memory state for the scheduler service."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.interval_hours: int = SCHEDULER_INTERVAL_HOURS
        self.status: str = "idle"          # idle | running | error
        self.last_run_at: str | None = None
        self.next_run_at: str | None = None
        self.last_run_id: str | None = None
        self.last_run_inserted: int = 0
        self.last_run_fetched: int = 0
        self.last_run_qualified: int = 0
        self.last_run_filtered_out: int = 0
        self.last_run_scored: int = 0
        self.last_run_duplicates: int = 0
        self.last_run_failures: int = 0
        self.last_run_qualified_pct: float = 0.0
        self.last_run_filtered_pct: float = 0.0
        self.last_run_groq_success_pct: float = 0.0
        self.last_run_groq_json_fail_pct: float = 0.0
        self.last_error: str | None = None

    def set(self, **kwargs: Any) -> None:
        with self._lock:
            for k, v in kwargs.items():
                setattr(self, k, v)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "status": self.status,
                "interval_hours": self.interval_hours,
                "last_run_at": self.last_run_at,
                "next_run_at": self.next_run_at,
                "last_run_id": self.last_run_id,
                "last_run_inserted": self.last_run_inserted,
                "last_run_fetched": self.last_run_fetched,
                "last_run_qualified": self.last_run_qualified,
                "last_run_filtered_out": self.last_run_filtered_out,
                "last_run_scored": self.last_run_scored,
                "last_run_duplicates": self.last_run_duplicates,
                "last_run_failures": self.last_run_failures,
                "last_run_qualified_pct": self.last_run_qualified_pct,
                "last_run_filtered_pct": self.last_run_filtered_pct,
                "last_run_groq_success_pct": self.last_run_groq_success_pct,
                "last_run_groq_json_fail_pct": self.last_run_groq_json_fail_pct,
                "last_error": self.last_error,
            }


STATE = SchedulerState()


# ---------------------------------------------------------------------------
# Supabase client (shared across runs)
# ---------------------------------------------------------------------------
def _build_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_KEY are not set.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = _build_supabase_client()
    return _supabase


# ---------------------------------------------------------------------------
# Scheduler run record helpers
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _create_run_record(run_id: str, interval_hours: int, next_run_at: str | None) -> None:
    """Insert a 'running' record into scheduler_runs."""
    try:
        get_supabase().table(SCHEDULER_RUNS_TABLE).insert(
            {
                "run_id": run_id,
                "started_at": _now_iso(),
                "status": "running",
                "interval_hours": interval_hours,
                "next_run_at": next_run_at,
            }
        ).execute()
    except Exception as exc:
        logger.warning("Could not create run record: %s", exc)


def _update_run_record(run_id: str, metrics: dict[str, Any]) -> None:
    """Update the run record with final metrics and status."""
    try:
        get_supabase().table(SCHEDULER_RUNS_TABLE).update(metrics).eq(
            "run_id", run_id
        ).execute()
    except Exception as exc:
        logger.warning("Could not update run record run_id=%s: %s", run_id, exc)


# ---------------------------------------------------------------------------
# Core pipeline job (wraps run_pipeline.main logic, returns metrics)
# ---------------------------------------------------------------------------
def pipeline_job() -> dict[str, Any]:
    """
    Execute the full RSS → Parse → Groq Score → Supabase pipeline.
    Returns a metrics dict with fetched/scored/inserted/duplicates/failures counts.
    Thread-safe — only one run allowed at a time.
    """
    if STATE.status == "running":
        logger.warning("Pipeline already running — skipping this trigger.")
        return {"skipped": True}

    run_id = str(uuid.uuid4())
    started_at = _now_iso()
    run_started_wall = time.monotonic()  # for runtime measurement
    metrics: dict[str, Any] = {
        "fetched": 0,
        "qualified": 0,
        "filtered_out": 0,
        "scored": 0,
        "inserted": 0,
        "duplicates": 0,
        "failures": 0,
    }

    # Compute next_run_at for the record
    next_dt = datetime.now(timezone.utc)
    from datetime import timedelta
    next_dt = next_dt + timedelta(hours=STATE.interval_hours)
    next_run_iso = next_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    STATE.set(
        status="running",
        last_run_id=run_id,
        last_error=None,
    )
    _create_run_record(run_id, STATE.interval_hours, next_run_iso)

    logger.info("=" * 60)
    logger.info("  Scheduler — pipeline run starting (run_id=%s)", run_id)
    logger.info("=" * 60)

    try:
        # ── Step 1: Import pipeline components ───────────────────────────────
        from backend.rss_collector import collect_all
        from backend.reddit_parser import parse_entries
        from backend.lead_qualifier import qualify_leads
        from backend.database import LeadDatabase, DatabaseError
        from app.scorer import load_config, analyze_post
        from datetime import datetime as _dt

        # ── Step 2: Init clients ─────────────────────────────────────────────
        db = LeadDatabase()
        api_key = load_config()

        # ── Step 3: Collect RSS feeds ────────────────────────────────────────
        logger.info("[1/3] Collecting Reddit RSS feeds...")
        raw_entries, counts_per_sub, collect_errors = collect_all()
        total_fetched = len(raw_entries)
        metrics["fetched"] = total_fetched
        metrics["failures"] = collect_errors

        logger.info(
            "Collected %d entries from %d subreddits (%d errors).",
            total_fetched,
            len(counts_per_sub),
            collect_errors,
        )

        if total_fetched == 0:
            logger.warning("No entries collected — skipping scoring step.")
            _finalise(run_id, "success", metrics, next_run_iso)
            return metrics

        # ── Step 4: Parse & deduplicate ──────────────────────────────────────
        logger.info("[2/4] Parsing and deduplicating...")
        leads, skipped_parse = parse_entries(raw_entries)

        if not leads:
            logger.warning("No valid leads after parsing.")
            _finalise(run_id, "success", metrics, next_run_iso)
            return metrics

        all_ids = [lead["post_id"] for lead in leads if lead.get("post_id")]
        existing_ids = db.get_existing_post_ids(all_ids)
        new_leads = [l for l in leads if l.get("post_id") and l["post_id"] not in existing_ids]
        duplicates_count = len(leads) - len(new_leads)
        metrics["duplicates"] = duplicates_count

        logger.info(
            "Leads parsed: %d | New: %d | Duplicates skipped: %d",
            len(leads),
            len(new_leads),
            duplicates_count,
        )

        if not new_leads:
            logger.info("No new leads to score — all are duplicates.")
            _finalise(run_id, "success", metrics, next_run_iso)
            return metrics

        # ── Step 4.5: Lead qualification pre-filter ───────────────────────────
        logger.info("[3/4] Running lead qualification pre-filter...")
        qualified_leads, filtered_leads = qualify_leads(new_leads)
        qualified_count = len(qualified_leads)
        filtered_count = len(filtered_leads)
        metrics["qualified"] = qualified_count
        metrics["filtered_out"] = filtered_count

        logger.info(
            "Pre-filter: %d qualified | %d filtered out (no intent signal)",
            qualified_count,
            filtered_count,
        )

        if not qualified_leads:
            logger.info("No qualified leads to score — all filtered out.")
            total_new = len(new_leads)
            metrics["qualified_pct"] = (qualified_count / total_new * 100) if total_new > 0 else 0.0
            metrics["filtered_pct"] = (filtered_count / total_new * 100) if total_new > 0 else 0.0
            metrics["groq_success_pct"] = 0.0
            metrics["groq_json_fail_pct"] = 0.0
            _finalise(run_id, "success", metrics, next_run_iso)
            return metrics

        # ── Step 5: Score with Groq ──────────────────────────────────────────
        logger.info("[4/4] Scoring %d qualified leads with Groq...", qualified_count)
        scored_leads = []
        successfully_scored = 0
        json_fail_count = 0

        for i, lead in enumerate(qualified_leads, start=1):
            post_id = lead["post_id"]
            title = lead.get("title", "")
            logger.info(
                "[%d/%d] Scoring %s: '%s'", i, qualified_count, post_id, title[:50]
            )
            post_stats = {"json_failed": False, "success": False}
            try:
                scored_lead = analyze_post(lead, api_key, stats=post_stats)
                if not scored_lead.get("reason", "").startswith("Analysis failed") and scored_lead.get("reason") != "classifier_error":
                    successfully_scored += 1
                scored_leads.append(scored_lead)
            except Exception as exc:
                logger.error("Scoring failed for %s: %s", post_id, exc)
                metrics["failures"] = metrics["failures"] + 1
                fallback = lead.copy()
                fallback.update(
                    {
                        "intent_score": 0,
                        "confidence": 0.0,
                        "category": "discussion",
                        "reason": f"Analysis failed: {exc}",
                        "draft_reply": "",
                        "keywords": [],
                        "lead_summary": "",
                        "priority": "low",
                        "recommended_action": "ignore",
                        "processed_at": _now_iso(),
                    }
                )
                scored_leads.append(fallback)

            if post_stats.get("json_failed"):
                json_fail_count += 1

            time.sleep(0.5)  # Rate-limit Groq API gently

        metrics["scored"] = successfully_scored

        # ── Step 6: Insert into Supabase ─────────────────────────────────────
        inserted_count = 0
        if scored_leads:
            try:
                inserted_count, _ = db.insert_leads_batch(scored_leads, existing_ids)
            except DatabaseError as exc:
                logger.error("Batch insertion failed: %s", exc)
                metrics["failures"] = metrics.get("failures", 0) + 1

        metrics["inserted"] = inserted_count
        elapsed_s = time.monotonic() - run_started_wall
        logger.info(
            "Run complete — fetched: %d | qualified: %d | filtered: %d | scored: %d"
            " | inserted: %d | duplicates: %d | failures: %d | runtime: %.0fs (%.1fm)",
            metrics["fetched"],
            qualified_count,
            filtered_count,
            successfully_scored,
            inserted_count,
            duplicates_count,
            metrics["failures"],
            elapsed_s,
            elapsed_s / 60,
        )

        total_new = len(new_leads)
        metrics["qualified_pct"] = (qualified_count / total_new * 100) if total_new > 0 else 0.0
        metrics["filtered_pct"] = (filtered_count / total_new * 100) if total_new > 0 else 0.0
        metrics["groq_success_pct"] = (successfully_scored / qualified_count * 100) if qualified_count > 0 else 0.0
        metrics["groq_json_fail_pct"] = (json_fail_count / qualified_count * 100) if qualified_count > 0 else 0.0

        final_status = "success" if metrics["failures"] == 0 else "partial"
        _finalise(run_id, final_status, metrics, next_run_iso)
        return metrics

    except Exception as exc:
        logger.exception("Pipeline job crashed: %s", exc)
        metrics["failures"] = metrics.get("failures", 0) + 1
        _finalise(run_id, "failed", metrics, next_run_iso, error=str(exc))
        return metrics


def _finalise(
    run_id: str,
    status: str,
    metrics: dict[str, Any],
    next_run_iso: str,
    error: str | None = None,
) -> None:
    """Update Supabase record and STATE after a run."""
    update_payload = {
        "completed_at": _now_iso(),
        "status": status,
        "fetched": metrics.get("fetched", 0),
        "scored": metrics.get("scored", 0),
        "inserted": metrics.get("inserted", 0),
        "duplicates": metrics.get("duplicates", 0),
        "failures": metrics.get("failures", 0),
        "next_run_at": next_run_iso,
    }
    if error:
        update_payload["error_message"] = error

    _update_run_record(run_id, update_payload)

    STATE.set(
        status="idle" if status != "failed" else "error",
        last_run_at=_now_iso(),
        next_run_at=next_run_iso,
        last_run_inserted=metrics.get("inserted", 0),
        last_run_fetched=metrics.get("fetched", 0),
        last_run_qualified=metrics.get("qualified", 0),
        last_run_filtered_out=metrics.get("filtered_out", 0),
        last_run_scored=metrics.get("scored", 0),
        last_run_duplicates=metrics.get("duplicates", 0),
        last_run_failures=metrics.get("failures", 0),
        last_run_qualified_pct=metrics.get("qualified_pct", 0.0),
        last_run_filtered_pct=metrics.get("filtered_pct", 0.0),
        last_run_groq_success_pct=metrics.get("groq_success_pct", 0.0),
        last_run_groq_json_fail_pct=metrics.get("groq_json_fail_pct", 0.0),
        last_error=error,
    )


# ---------------------------------------------------------------------------
# APScheduler
# ---------------------------------------------------------------------------
scheduler = BackgroundScheduler(timezone="UTC")


def _get_next_run_iso(interval_hours: int) -> str | None:
    """
    Safely retrieve next_run_time from the APScheduler job.
    Falls back to computing now() + interval if the attribute is missing
    or None (happens when the scheduler hasn't started yet or the job
    is still in 'pending' state).
    """
    from datetime import timedelta

    job = scheduler.get_job("pipeline")
    if job is not None:
        # Use getattr for full version-safety — avoids AttributeError on
        # older/newer APScheduler builds where the attribute may not exist.
        nrt = getattr(job, "next_run_time", None)
        if nrt is not None:
            return nrt.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Fallback: compute expected next run from current wall-clock time
    fallback = datetime.now(timezone.utc) + timedelta(hours=interval_hours)
    return fallback.strftime("%Y-%m-%dT%H:%M:%SZ")


def _schedule_job(interval_hours: int) -> None:
    """(Re-)schedule the pipeline job at the given interval.

    Safe to call both before and after scheduler.start().
    Uses getattr() for next_run_time access so it never raises
    AttributeError regardless of APScheduler version.
    """
    existing = scheduler.get_job("pipeline")
    if existing is not None:
        scheduler.remove_job("pipeline")

    scheduler.add_job(
        pipeline_job,
        trigger=IntervalTrigger(hours=interval_hours),
        id="pipeline",
        name="RSS -> Groq -> Supabase pipeline",
        replace_existing=True,
    )

    # Defensively read next_run_time — may be None on pending jobs
    next_run_iso = _get_next_run_iso(interval_hours)
    STATE.set(next_run_at=next_run_iso, interval_hours=interval_hours)

    if next_run_iso:
        logger.info(
            "Scheduled pipeline job every %d hour(s). Next run: %s",
            interval_hours,
            next_run_iso,
        )
    else:
        logger.info(
            "Scheduled pipeline job every %d hour(s). Next run time unavailable.",
            interval_hours,
        )


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("  SignalRadar Scheduler Service — Starting Up")
    logger.info("=" * 60)
    logger.info("Scheduler service starting on port %d...", SCHEDULER_API_PORT)

    # Start APScheduler FIRST so jobs get a real next_run_time immediately
    scheduler.start()
    logger.info("Scheduler started.")

    # Now schedule the job — next_run_time will be populated correctly
    _schedule_job(STATE.interval_hours)

    # Re-read next_run_time after scheduler is live
    next_run_iso = _get_next_run_iso(STATE.interval_hours)
    STATE.set(next_run_at=next_run_iso)

    if next_run_iso:
        logger.info("Interval   : %d hour(s)", STATE.interval_hours)
        logger.info("Next run   : %s", next_run_iso)
    else:
        logger.info("Interval   : %d hour(s)", STATE.interval_hours)
        logger.info("Next run   : unavailable")

    logger.info("API docs   : http://localhost:%d/docs", SCHEDULER_API_PORT)
    logger.info("Health     : http://localhost:%d/health", SCHEDULER_API_PORT)
    logger.info("=" * 60)

    yield

    # ── Shutdown ───────────────────────────────────────────────────────────
    logger.info("Shutting down scheduler...")
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped.")


app = FastAPI(
    title="SignalRadar Scheduler API",
    version="1.0.0",
    description="Controls the automated RSS → Groq → Supabase pipeline",
    lifespan=lifespan,
)

# Allow the Vite dev server to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response models ────────────────────────────────────────────────

class ConfigRequest(BaseModel):
    interval_hours: int


class StatusResponse(BaseModel):
    status: str
    interval_hours: int
    last_run_at: str | None
    next_run_at: str | None
    last_run_id: str | None
    last_run_inserted: int
    last_run_fetched: int
    last_run_qualified: int
    last_run_filtered_out: int
    last_run_scored: int
    last_run_duplicates: int
    last_run_failures: int
    last_run_qualified_pct: float
    last_run_filtered_pct: float
    last_run_groq_success_pct: float
    last_run_groq_json_fail_pct: float
    last_error: str | None


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/api/scheduler/status", response_model=StatusResponse)
def get_status() -> dict[str, Any]:
    """Return current scheduler state, last run info, and next scheduled run."""
    snap = STATE.snapshot()

    # Defensively refresh next_run_at from the live APScheduler job.
    # Use getattr to avoid AttributeError on any APScheduler version.
    job = scheduler.get_job("pipeline")
    if job is not None:
        nrt = getattr(job, "next_run_time", None)
        if nrt is not None:
            iso = nrt.strftime("%Y-%m-%dT%H:%M:%SZ")
            snap["next_run_at"] = iso
            STATE.set(next_run_at=iso)

    return snap


@app.post("/api/scheduler/run")
def trigger_run() -> dict[str, str]:
    """Immediately trigger a pipeline run in a background thread."""
    if STATE.status == "running":
        raise HTTPException(status_code=409, detail="Pipeline is already running.")

    thread = threading.Thread(target=pipeline_job, daemon=True, name="manual-run")
    thread.start()
    return {"message": "Pipeline run triggered.", "run_id": STATE.last_run_id or "pending"}


@app.post("/api/scheduler/config")
def update_config(body: ConfigRequest) -> dict[str, Any]:
    """Change the scheduler interval. Immediately reschedules the next run."""
    if body.interval_hours not in SCHEDULER_VALID_INTERVALS:
        raise HTTPException(
            status_code=422,
            detail=f"interval_hours must be one of {list(SCHEDULER_VALID_INTERVALS)}.",
        )

    STATE.set(interval_hours=body.interval_hours)
    _schedule_job(body.interval_hours)

    return {
        "message": f"Interval updated to {body.interval_hours}h.",
        "interval_hours": body.interval_hours,
        "next_run_at": STATE.next_run_at,
    }


@app.get("/api/scheduler/history")
def get_history(limit: int = 20) -> list[dict[str, Any]]:
    """Return the last N run records from Supabase scheduler_runs table."""
    limit = min(max(limit, 1), 100)
    try:
        resp = (
            get_supabase()
            .table(SCHEDULER_RUNS_TABLE)
            .select("*")
            .order("started_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        logger.error("Failed to fetch run history: %s", exc)
        raise HTTPException(status_code=500, detail="Could not fetch history.")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "SignalRadar Scheduler"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Support: python backend/scheduler.py   (direct)
    # Support: python -m backend.scheduler   (module)
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=SCHEDULER_API_PORT,
        reload=False,
        log_level="info",
    )

