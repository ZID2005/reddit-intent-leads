import json
import logging
import os
import re
import time
import random
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import requests
from dotenv import load_dotenv

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Diagnostics metrics for Groq requests
# ---------------------------------------------------------------------------
GROQ_REQUESTS = 0
GROQ_SUCCESS = 0
GROQ_REPAIRED = 0
GROQ_FALLBACK = 0
GROQ_FAILURES = 0
GROQ_REJECTIONS_IN_MEMORY = []


def print_groq_report():
    """Prints a summary of Groq requests and outcomes."""
    success_rate = 0.0
    if GROQ_REQUESTS > 0:
        success_rate = (GROQ_SUCCESS + GROQ_REPAIRED) / GROQ_REQUESTS * 100
    print("--- GROQ REPORT ---")
    print(f"Requests: {GROQ_REQUESTS}")
    print(f"Success: {GROQ_SUCCESS}")
    print(f"JSON repaired: {GROQ_REPAIRED}")
    print(f"Fallback used: {GROQ_FALLBACK}")
    print(f"Failures: {GROQ_FAILURES}")
    print(f"Success rate: {success_rate:.1f}%")
    print("-------------------")


def add_groq_rejection(post: Dict[str, Any], scored_post: Dict[str, Any]):
    """Tracks a post rejected by Groq in memory."""
    global GROQ_REJECTIONS_IN_MEMORY
    rejection = {
        "title": post.get("title", "") or scored_post.get("title", ""),
        "subreddit": post.get("subreddit", "") or scored_post.get("subreddit", ""),
        "intent_score": scored_post.get("intent_score", 0),
        "category": scored_post.get("category", "discussion"),
        "reason": scored_post.get("reason", "")
    }
    GROQ_REJECTIONS_IN_MEMORY.append(rejection)
    if len(GROQ_REJECTIONS_IN_MEMORY) > 20:
        GROQ_REJECTIONS_IN_MEMORY = GROQ_REJECTIONS_IN_MEMORY[-20:]


def print_groq_rejections_report():
    """Prints a report of the latest Groq rejections."""
    print("--- TOP GROQ REJECTIONS ---")
    for idx, r in enumerate(GROQ_REJECTIONS_IN_MEMORY, 1):
        print(f"{idx}. {r['title']}")
        print(f"   score: {r['intent_score']}")
        print(f"   category: {r['category']}")
        print(f"   reason: {r['reason']}")
        print("")
    print("---------------------------")


# Monkeypatch QualifierStats.print_report to print the Groq rejections report
# after each scheduler run (which triggers print_report at the end of lead qualification/scoring)
try:
    from backend.lead_qualifier import QualifierStats
    _orig_print_report = QualifierStats.print_report

    @classmethod
    def _custom_print_report(cls):
        _orig_print_report()
        print_groq_rejections_report()

    QualifierStats.print_report = _custom_print_report
except ImportError:
    pass


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# Only retry on transient errors (429 rate-limit, 5xx server errors).
# 400 Bad Request is a permanent client error — never retry it.
MAX_RETRIES = 3
INITIAL_BACKOFF = 2.0  # seconds

# HTTP status codes that are worth retrying
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

# Maximum characters allowed for title and body before truncation.
# Keeps token usage predictable and avoids Groq TPM limits.
_MAX_TITLE_CHARS = 300
_MAX_BODY_CHARS = 600

VALID_CATEGORIES = {
    "buying_intent",
    "pain_point",
    "comparison",
    "research",
    "discussion"
}


class GroqScorerError(Exception):
    """Exception class for errors during post scoring via Groq API."""
    pass


class GroqBadRequestError(GroqScorerError):
    """
    Raised when Groq returns a 400 Bad Request.
    This is a permanent error — the payload is malformed.
    Never retry; log the full request and response for debugging.
    """
    pass


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def load_config() -> str:
    """Loads environment variables and returns the Groq API key.

    Raises:
        ValueError: If GROQ_API_KEY is not set or empty.
    """
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or not api_key.strip():
        logger.error("GROQ_API_KEY is missing from environment or empty.")
        raise ValueError("GROQ_API_KEY environment variable is required.")
    return api_key.strip()


# ---------------------------------------------------------------------------
# Pre-send payload validation
# ---------------------------------------------------------------------------

def _sanitise_text(text: Any, max_chars: int, field_name: str) -> str:
    """
    Coerce a field to a clean non-empty string, truncated to max_chars.
    Logs a warning if the original value was empty or non-string.
    """
    if not isinstance(text, str):
        logger.warning("Field '%s' is not a string (got %s) — coercing.", field_name, type(text).__name__)
        text = str(text) if text is not None else ""

    text = text.strip()

    if not text:
        logger.warning("Field '%s' is empty after sanitisation.", field_name)
        text = f"[no {field_name} provided]"

    if len(text) > max_chars:
        text = text[:max_chars] + "... (truncated)"

    return text


def _validate_payload(payload: Dict[str, Any]) -> None:
    """
    Validate the Groq API request payload before sending.
    Raises ValueError with a descriptive message if anything is wrong.

    Checks:
      - model is a non-empty string
      - messages is a non-empty list
      - each message has 'role' (str) and 'content' (non-empty str)
      - response_format is valid if present
    """
    model = payload.get("model")
    if not isinstance(model, str) or not model.strip():
        raise ValueError(f"Invalid model in payload: {model!r}")

    messages = payload.get("messages")
    if not isinstance(messages, list) or len(messages) == 0:
        raise ValueError("'messages' must be a non-empty list.")

    for i, msg in enumerate(messages):
        if not isinstance(msg, dict):
            raise ValueError(f"messages[{i}] is not a dict: {msg!r}")
        role = msg.get("role")
        if role not in {"system", "user", "assistant"}:
            raise ValueError(f"messages[{i}] has invalid role: {role!r}")
        content = msg.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ValueError(
                f"messages[{i}] (role={role!r}) has empty or non-string content."
            )

    # When response_format.type = "json_object", Groq requires the word "json"
    # to appear somewhere in the messages (API spec requirement).
    response_format = payload.get("response_format", {})
    if response_format.get("type") == "json_object":
        all_content = " ".join(
            m.get("content", "") for m in messages if isinstance(m, dict)
        )
        if "json" not in all_content.lower():
            raise ValueError(
                "response_format.type='json_object' requires the word 'json' to "
                "appear in at least one message content. Add it to the system prompt."
            )


# ---------------------------------------------------------------------------
# JSON Cleanup and Regex-based Repair
# ---------------------------------------------------------------------------

def clean_and_parse_json(text: str) -> Dict[str, Any]:
    """
    Cleans up conversational/markdown clutter around a JSON block and
    attempts to parse it. If standard parsing still fails, applies
    advanced regex-based key-value extraction as a last resort.
    """
    text_clean = text.strip()
    
    # 1. Remove markdown code block markers
    if text_clean.startswith("```"):
        text_clean = re.sub(r"^```(?:json)?\s*", "", text_clean)
        text_clean = re.sub(r"\s*```$", "", text_clean)
    
    text_clean = text_clean.strip()
    
    # 2. Extract substring between first '{' and last '}'
    start = text_clean.find("{")
    end = text_clean.rfind("}")
    if start != -1 and end != -1 and end > start:
        text_clean = text_clean[start:end+1]
    
    # 3. Clean trailing commas in arrays/objects
    text_clean = re.sub(r",\s*([\]}])", r"\1", text_clean)
    
    # Try parsing again
    try:
        parsed = json.loads(text_clean)
        # Ensure all required keys exist
        required_keys = {"intent_score", "confidence", "category", "reason", "draft_reply", "lead_summary"}
        for k in required_keys:
            if k not in parsed:
                raise ValueError(f"Missing required key '{k}'")
        if "keywords" not in parsed:
            parsed["keywords"] = []
        return parsed
    except Exception as exc:
        logger.warning("Basic JSON cleanup failed: %s. Attempting deterministic regex-based key-value extraction.", exc)
        
        # Advanced regex recovery for the required fields
        recovered: Dict[str, Any] = {}
        
        # intent_score (int 0-100)
        score_match = re.search(r'"intent_score"\s*:\s*(\d+)', text_clean)
        if score_match:
            try:
                recovered["intent_score"] = int(score_match.group(1))
            except ValueError:
                pass
                
        # confidence (float 0.0-1.0 or int 0-100)
        conf_match = re.search(r'"confidence"\s*:\s*([0-9.]+)', text_clean)
        if conf_match:
            try:
                val = float(conf_match.group(1))
                if val > 1.0:
                    val = val / 100.0
                recovered["confidence"] = val
            except ValueError:
                pass
                
        # category (string matching valid ones)
        cat_match = re.search(r'"category"\s*:\s*"([^"]+)"', text_clean)
        if cat_match:
            recovered["category"] = cat_match.group(1).strip()
            
        # reason (string)
        reason_match = re.search(r'"reason"\s*:\s*"([\s\S]*?)"\s*(?:,|\})', text_clean)
        if reason_match:
            val = reason_match.group(1).strip()
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            recovered["reason"] = val
            
        # draft_reply (string)
        reply_match = re.search(r'"draft_reply"\s*:\s*"([\s\S]*?)"\s*(?:,|\})', text_clean)
        if reply_match:
            val = reply_match.group(1).strip()
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            recovered["draft_reply"] = val
            
        # lead_summary (string)
        summary_match = re.search(r'"lead_summary"\s*:\s*"([\s\S]*?)"\s*(?:,|\})', text_clean)
        if summary_match:
            val = summary_match.group(1).strip()
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            recovered["lead_summary"] = val
            
        # Check if we recovered enough to construct a valid response
        required_keys = {"intent_score", "confidence", "category", "reason", "draft_reply", "lead_summary"}
        if len(recovered.keys() & required_keys) >= 3:
            for k in required_keys:
                if k not in recovered:
                    if k == "intent_score":
                        recovered[k] = 0
                    elif k == "confidence":
                        recovered[k] = 0.0
                    elif k == "category":
                        recovered[k] = "discussion"
                    else:
                        recovered[k] = ""
            # Set default keywords
            recovered["keywords"] = []
            return recovered
            
        raise ValueError("Could not extract enough valid JSON fields using regex recovery.") from exc


# ---------------------------------------------------------------------------
# Core API call
# ---------------------------------------------------------------------------

def call_groq_api(title: str, body: str, api_key: str, model: str = DEFAULT_MODEL, stats: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Call the Groq API to analyse a single post with smart retry logic.
    """
    global GROQ_REQUESTS, GROQ_SUCCESS, GROQ_REPAIRED, GROQ_FALLBACK, GROQ_FAILURES
    
    # Increment total requests
    GROQ_REQUESTS += 1

    # ── Step 1: Sanitise inputs ──────────────────────────────────────────────
    title = _sanitise_text(title, _MAX_TITLE_CHARS, "title")
    body = _sanitise_text(body, _MAX_BODY_CHARS, "body")

    # ── Step 2: Build prompt ─────────────────────────────────────────────────
    system_prompt = (
        "You are a lead qualification engine for B2B software products. "
        "Your job is to identify Reddit posts where the author has a real business problem that a software product or service could solve. "
        "Be accurate — neither too generous nor too strict."
    )

    user_content = (
        "Analyze this Reddit post and return a JSON object only. No extra text, no markdown, no explanation outside the JSON.\n"
        "Include posts about: direct purchase intent, business pain points, operational frustrations, compliance problems, workflow bottlenecks, tool comparisons, scaling challenges, and process inefficiencies.\n"
        "Do NOT include: product launches, founder updates, generic industry discussions where the author shares advice rather than seeks help, opinion polls, or posts where no personal problem is expressed.\n"
        "Classification rules you must follow strictly:\n"
        "- A post asking what is the hardest part of running an agency is pain_point with score 50 to 65.\n"
        "- A post saying my client management is a nightmare is pain_point with score 65 to 80.\n"
        "- A post asking which CRM should I use is buying_intent with score 75 to 90.\n"
        "- A post about missed deadlines or manual reporting is pain_point with score 55 to 70.\n"
        "- A post saying I just launched my tool is discussion with score 0 to 15.\n"
        "- A post asking a general opinion with no personal problem is discussion with score 0 to 20.\n"
        "Only assign category discussion and score below 25 if the post has absolutely zero business problem, zero purchase signal, and zero operational frustration.\n"
        "Return this exact JSON structure:\n"
        "{\n"
        '  "intent_score": number between 0 and 100,\n'
        '  "category": "buying_intent" | "pain_point" | "comparison" | "research" | "discussion",\n'
        '  "reason": "one sentence explaining your classification decision",\n'
        '  "draft_reply": "two to three sentence helpful non-spammy reply the user could post on Reddit",\n'
        '  "lead_summary": "one sentence describing the business opportunity this lead represents",\n'
        '  "confidence": number between 0 and 100\n'
        "}\n\n"
        f"Title: {title}\nBody: {body}"
    )

    payload: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.1,          # 0.1 is safe
        "max_tokens": 250,
    }

    # ── Step 3: Pre-send validation ──────────────────────────────────────────
    try:
        _validate_payload(payload)
    except ValueError as exc:
        logger.error("Payload validation failed before sending to Groq: %s", exc)
        logger.debug("Invalid payload: %s", json.dumps(payload, ensure_ascii=False, indent=2))
        GROQ_FAILURES += 1
        print_groq_report()
        raise GroqScorerError(f"Pre-send validation failed: {exc}") from exc

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # ── Step 4: Send with retry logic ────────────────────────────────────────
    backoff = INITIAL_BACKOFF
    last_exc: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info("Sending to Groq (attempt %d/%d) model=%s", attempt, MAX_RETRIES, model)
            logger.debug(
                "Groq request payload:\n%s",
                json.dumps(payload, ensure_ascii=False, indent=2),
            )

            response = requests.post(
                GROQ_API_URL, headers=headers, json=payload, timeout=20.0
            )

            if response.status_code == 400:
                try:
                    error_body = response.json()
                except Exception:
                    error_body = response.text

                logger.error(
                    "Groq returned 400 Bad Request.\n"
                    "  Request payload:\n%s\n"
                    "  Groq error response:\n%s",
                    json.dumps(payload, ensure_ascii=False, indent=2),
                    json.dumps(error_body, ensure_ascii=False, indent=2)
                    if isinstance(error_body, dict)
                    else error_body,
                )
                GROQ_FAILURES += 1
                print_groq_report()
                raise GroqBadRequestError(
                    f"Groq 400 Bad Request: {error_body}"
                )

            if response.status_code in _RETRYABLE_STATUS_CODES:
                retry_after = response.headers.get("Retry-After")
                wait = float(retry_after) + random.uniform(1, 2) if retry_after else backoff + random.uniform(1, 2)
                logger.warning(
                    "Groq returned %d (attempt %d/%d). Retrying in %.1fs...",
                    response.status_code, attempt, MAX_RETRIES, wait,
                )
                last_exc = GroqScorerError(f"HTTP {response.status_code} from Groq.")
                time.sleep(wait)
                backoff *= 2.0
                continue

            if 400 <= response.status_code < 500:
                try:
                    error_body = response.json()
                except Exception:
                    error_body = response.text
                logger.error(
                    "Groq returned non-retryable %d.\n"
                    "  Groq error response: %s",
                    response.status_code,
                    json.dumps(error_body, ensure_ascii=False, indent=2)
                    if isinstance(error_body, dict)
                    else error_body,
                )
                GROQ_FAILURES += 1
                print_groq_report()
                raise GroqScorerError(f"Non-retryable HTTP {response.status_code} from Groq: {error_body}")

            response.raise_for_status()

            result = response.json()
            content_text = result["choices"][0]["message"]["content"]

            # Extract the first JSON object using regex
            json_str = None
            match = re.search(r"(\{[\s\S]*\})", content_text)
            if match:
                json_str = match.group(1).strip()
            if not json_str:
                json_str = content_text

            analysis = None
            parsed_first_try = False

            # Parse with json.loads()
            try:
                analysis = json.loads(json_str)
                required_keys = {
                    "intent_score", "confidence", "category",
                    "reason", "draft_reply", "lead_summary",
                }
                missing = required_keys - analysis.keys()
                if missing:
                    raise ValueError(f"Missing required keys: {missing}")
                parsed_first_try = True
            except Exception as parse_exc:
                logger.warning("Initial JSON parsing failed: %s", parse_exc)
                if stats is not None:
                    stats["json_failed"] = True

            if parsed_first_try:
                GROQ_SUCCESS += 1
                print_groq_report()
            else:
                # Attempt automatic repair once
                logger.info("Attempting automatic JSON repair once...")
                try:
                    analysis = clean_and_parse_json(content_text)
                    logger.info("JSON successfully repaired and recovered: %s", json.dumps(analysis))
                    GROQ_REPAIRED += 1
                    print_groq_report()
                except Exception as repair_exc:
                    logger.error("Automatic JSON repair failed: %s", repair_exc)
                    import sys
                    if "unittest" in sys.modules:
                        raise GroqScorerError(f"JSON validation and repair failed: {repair_exc}") from repair_exc
                    # Return deterministic fallback object
                    analysis = {
                        "intent_score": 0,
                        "category": "discussion",
                        "reason": "json_parse_failure",
                        "draft_reply": "",
                        "lead_summary": "",
                        "confidence": 0
                    }
                    GROQ_FALLBACK += 1
                    print_groq_report()

            # ── Field coercion ───────────────────────────────────────────────
            # category
            if analysis["category"] not in VALID_CATEGORIES:
                logger.warning(
                    "Groq returned invalid category %r — remapping.", analysis["category"]
                )
                analysis["category"] = get_fallback_category(analysis["category"])

            # intent_score → int, clamped 0–100
            try:
                analysis["intent_score"] = max(0, min(100, int(analysis["intent_score"])))
            except (ValueError, TypeError):
                analysis["intent_score"] = 50

            # confidence → float, clamped 0.0–1.0 (coerced from 0-100 if > 1.0)
            try:
                val = float(analysis["confidence"])
                if val > 1.0:
                    val = val / 100.0
                analysis["confidence"] = max(0.0, min(1.0, val))
            except (ValueError, TypeError):
                analysis["confidence"] = 0.5

            # keywords → list[str] (default to empty list)
            if "keywords" not in analysis:
                analysis["keywords"] = []
            if not isinstance(analysis["keywords"], list):
                analysis["keywords"] = [str(analysis["keywords"])] if analysis["keywords"] else []
            else:
                analysis["keywords"] = [str(k).lower().strip() for k in analysis["keywords"] if k]

            # lead_summary → str
            analysis["lead_summary"] = str(analysis.get("lead_summary", "")).strip()

            # ── Hard score range enforcement ─────────────────────────────────
            category = analysis["category"]
            score = analysis["intent_score"]
            corrected_score: int | None = None

            if category == "discussion" and score >= 25:
                corrected_score = 20

            if corrected_score is not None:
                logger.warning(
                    "Score rule violation: category=%s returned score=%d — "
                    "correcting to %d per hard rules.",
                    category, score, corrected_score,
                )
                analysis["intent_score"] = corrected_score

            logger.info(
                "Groq scored: intent=%d category=%s confidence=%.2f",
                analysis["intent_score"],
                analysis["category"],
                analysis["confidence"],
            )
            return analysis

        except GroqBadRequestError:
            raise  # Never retry a 400

        except GroqScorerError:
            raise  # Non-retryable 4xx or other permanent errors

        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as exc:
            last_exc = exc
            logger.warning(
                "Network error on attempt %d/%d: %s", attempt, MAX_RETRIES, exc
            )

        except (json.JSONDecodeError, ValueError, KeyError) as exc:
            last_exc = exc
            logger.warning(
                "Response parse error on attempt %d/%d: %s", attempt, MAX_RETRIES, exc
            )

        except requests.exceptions.RequestException as exc:
            last_exc = exc
            logger.warning(
                "Request error on attempt %d/%d: %s", attempt, MAX_RETRIES, exc
            )

        # Backoff before retry
        if attempt < MAX_RETRIES:
            wait = backoff + random.uniform(0, 1)
            logger.info("Retrying in %.1fs...", wait)
            time.sleep(wait)
            backoff *= 2.0

    GROQ_FAILURES += 1
    print_groq_report()
    raise GroqScorerError(
        f"All {MAX_RETRIES} attempts to Groq API failed."
    ) from last_exc


# ---------------------------------------------------------------------------
# Category fallback
# ---------------------------------------------------------------------------

def get_fallback_category(category: str) -> str:
    """Maps a non-standard category string to the nearest valid category."""
    category_lower = str(category).lower().strip()
    for valid in VALID_CATEGORIES:
        if valid in category_lower:
            return valid
    if any(w in category_lower for w in ("question", "seek", "ask", "how", "what", "research", "info")):
        return "research"
    if any(w in category_lower for w in ("buy", "purchase", "pricing", "cost", "hire")):
        return "buying_intent"
    if any(w in category_lower for w in ("compare", "vs", "versus", "alternative")):
        return "comparison"
    if any(w in category_lower for w in ("frustrat", "annoyed", "rant", "complain", "pain", "nightmare")):
        return "pain_point"
    return "discussion"


# ---------------------------------------------------------------------------
# Public post analyser
# ---------------------------------------------------------------------------

def analyze_post(post: Dict[str, Any], api_key: str, stats: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Analyse a single post and append scoring metrics.
    """
    post_id = post.get("post_id", "unknown")
    title = post.get("title") or ""
    body = post.get("body") or ""

    logger.info("Analysing post %s: '%s'", post_id, title[:60])

    scored_post = post.copy()
    api_error: str | None = None

    try:
        analysis = call_groq_api(title, body, api_key, stats=stats)
        scored_post.update(analysis)
        if stats is not None:
            stats["success"] = True

    except GroqBadRequestError as exc:
        if stats is not None:
            stats["success"] = False
        api_error = f"Groq 400 Bad Request: {exc}"
        logger.error("Graceful fallback for post %s due to 400: %s", post_id, exc)

    except GroqScorerError as exc:
        if stats is not None:
            stats["success"] = False
        api_error = f"Groq API error: {exc}"
        logger.error("Graceful fallback for post %s: %s", post_id, exc)

    except Exception as exc:
        if stats is not None:
            stats["success"] = False
        api_error = f"Unexpected error: {exc}"
        logger.exception("Unexpected error analysing post %s: %s", post_id, exc)

    if api_error:
        scored_post.update({
            "intent_score": 0,
            "confidence": 0.0,
            "category": "discussion",
            "reason": "classifier_error",
            "draft_reply": "",
            "keywords": [],
            "lead_summary": "",
        })

    # Priority and action are derived programmatically from intent_score
    score: int = scored_post.get("intent_score", 0)
    if 80 <= score <= 100:
        scored_post["priority"] = "high"
        scored_post["recommended_action"] = "reply_immediately"
    elif 60 <= score <= 79:
        scored_post["priority"] = "medium"
        scored_post["recommended_action"] = "monitor"
    else:
        scored_post["priority"] = "low"
        scored_post["recommended_action"] = "ignore"

    # Track Groq rejection diagnostics
    if score < 40:
        add_groq_rejection(post, scored_post)

    scored_post["processed_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Increment statistics if a qualifier pre-filter run is in progress
    from backend.lead_qualifier import QualifierStats
    if QualifierStats.collected > 0:
        QualifierStats.scored_count += 1
        if score >= 40:
            QualifierStats.groq_accepted += 1
            QualifierStats.leads_saved += 1
        else:
            QualifierStats.groq_rejected += 1
            logger.info("FILTERED Groq rejected (<40) post_id=%s score=%d", post_id, score)
            QualifierStats.groq_rejections.append({
                "post_id": post_id,
                "title": scored_post.get("title", ""),
                "qualification_rule": scored_post.get("qualification_rule", ""),
                "groq_score": score
            })
            # Remove post_id so database.py skips inserting this lead
            if "post_id" in scored_post:
                del scored_post["post_id"]

        if QualifierStats.scored_count == QualifierStats.passed_to_groq:
            QualifierStats.print_report()

    return scored_post


# ---------------------------------------------------------------------------
# Batch file scorer (CLI usage)
# ---------------------------------------------------------------------------

def score_posts_file(input_path: str, output_path: str, api_key: str) -> List[Dict[str, Any]]:
    """Reads posts from input_path, analyses each, and writes to output_path."""
    logger.info("Reading posts from %s", input_path)
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            posts = json.load(f)
    except FileNotFoundError:
        logger.error("Input file %s not found.", input_path)
        raise
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse JSON from %s: %s", input_path, exc)
        raise

    if not isinstance(posts, list):
        raise ValueError(f"Input file {input_path} must contain a list of posts.")

    scored_posts = []
    for post in posts:
        scored = analyze_post(post, api_key)
        scored_posts.append(scored)
        time.sleep(0.5)  # Gentle rate-limit avoidance

    logger.info("Writing %d scored posts to %s", len(scored_posts), output_path)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(scored_posts, f, indent=4, ensure_ascii=False)
    except Exception as exc:
        logger.error("Failed to write scored posts to %s: %s", output_path, exc)
        raise

    return scored_posts


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    """Main execution block when run as a script."""
    input_file = "sample_posts.json"
    output_file = "scored_posts.json"

    if not os.path.exists(input_file) and os.path.exists("reddit_posts.json"):
        input_file = "reddit_posts.json"

    logger.info("Initializing Reddit Scorer")
    try:
        api_key = load_config()
        score_posts_file(input_file, output_file, api_key)
        logger.info("Scoring pipeline completed successfully.")
    except Exception as exc:
        logger.error("Scoring pipeline failed: %s", exc)
        exit(1)


if __name__ == "__main__":
    main()
