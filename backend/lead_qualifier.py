"""
lead_qualifier.py
-----------------
Strict lead qualification pre-filter.

BUG FIX 1 — Hard Block Not Checking Body Text and Running Out of Order.
BUG FIX 2 — Business Context List Too Narrow.
BUG FIX 3 — Missing Pain Signals.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


class QualifierStats:
    collected = 0
    hard_blocked = 0
    title_match = 0
    body_match = 0
    triggered_phrases: dict[str, int] = {}
    no_business_context = 0
    no_problem_signal = 0
    career_discussion = 0
    self_promotion = 0
    founder_validation = 0
    weak_problem_signal = 0
    passed_to_groq = 0
    groq_accepted = 0
    groq_rejected = 0
    leads_saved = 0
    scored_count = 0
    groq_rejections: list[dict[str, Any]] = []
    rejected_reasons: dict[str, int] = {}

    @classmethod
    def reset(cls):
        cls.collected = 0
        cls.hard_blocked = 0
        cls.title_match = 0
        cls.body_match = 0
        cls.triggered_phrases = {}
        cls.no_business_context = 0
        cls.no_problem_signal = 0
        cls.career_discussion = 0
        cls.self_promotion = 0
        cls.founder_validation = 0
        cls.weak_problem_signal = 0
        cls.rejected_reasons = {}
        cls.passed_to_groq = 0
        cls.groq_accepted = 0
        cls.groq_rejected = 0
        cls.leads_saved = 0
        cls.scored_count = 0
        cls.groq_rejections = []

    @classmethod
    def print_report(cls):
        import sys
        pass_rate = round((cls.passed_to_groq / cls.collected * 100)) if cls.collected else 0
        
        report_lines = [
            "--- QUALIFIER REPORT ---",
            f"Collected:              {cls.collected}",
            f"Hard blocked:           {cls.hard_blocked}",
            f"  └ title match:        {cls.title_match}",
            f"  └ body match:         {cls.body_match}",
            "  └ top triggered phrases:"
        ]
        
        top_phrases = sorted(cls.triggered_phrases.items(), key=lambda x: x[1], reverse=True)[:3]
        for p, count in top_phrases:
            report_lines.append(f"    - {p}: {count}")
            
        report_lines.extend([
            f"No business context:    {cls.no_business_context}",
            f"No problem signal:      {cls.no_problem_signal}",
            f"Career discussion:      {cls.career_discussion}",
            f"Self promotion:         {cls.self_promotion}",
            f"Founder validation:     {cls.founder_validation}",
            f"Weak problem signal:    {cls.weak_problem_signal}",
            f"Passed to Groq:         {cls.passed_to_groq}",
            f"Groq accepted (>=40):   {cls.groq_accepted}",
            f"Groq rejected (<40):    {cls.groq_rejected}",
            f"Leads saved:            {cls.leads_saved}",
            f"Pass rate:              {pass_rate}%",
            "------------------------"
        ])

        if cls.rejected_reasons:
            report_lines.append("\nTop 10 Rejected Reasons:")
            sorted_reasons = sorted(cls.rejected_reasons.items(), key=lambda x: x[1], reverse=True)[:10]
            for r, count in sorted_reasons:
                report_lines.append(f"  - {r}: {count}")
            report_lines.append("------------------------")
        
        if cls.groq_rejections:
            report_lines.append("\nTop 10 Groq Rejections:")
            sorted_rejections = sorted(cls.groq_rejections, key=lambda x: x["groq_score"])[:10]
            for r in sorted_rejections:
                report_lines.append(f"post_id: {r['post_id']}")
                report_lines.append(f"title: {r['title']}")
                report_lines.append(f"qualification_rule: {r['qualification_rule']}")
                report_lines.append(f"groq_score: {r['groq_score']}")
                report_lines.append("")
        
        for line in report_lines:
            try:
                sys.stdout.buffer.write((line + "\n").encode("utf-8"))
                sys.stdout.flush()
            except Exception:
                safe_line = line.replace("└", "-").replace("≥", ">=").replace("≤", "<=")
                print(safe_line)
                
        cls.reset()


# ---------------------------------------------------------------------------
# Normalization Helper
# ---------------------------------------------------------------------------

def normalize_text(text: str) -> str:
    """
    1. Convert to lowercase.
    2. Remove all punctuation (characters matching [^\w\s] or _).
    3. Collapse repeated whitespace into single spaces.
    """
    text = text.lower()
    text = re.sub(r"[^\w\s]|_", "", text)
    text = " ".join(text.split())
    return text


# ---------------------------------------------------------------------------
# LAYER 1 — Hard Block Phrases
# ---------------------------------------------------------------------------

_HARD_BLOCK_PHRASES = [
    # New ones from Bug Fix 1:
    "built a tool", "i built", "we built", "made a tool", "created a tool", "would love feedback",
    "would love honest feedback", "love some feedback", "feedback on my", "check it out", "launching today",
    "just shipped", "just released", "show hn", "rate my", "roast my", "built this", "made this",
    "heres my tool", "here is my tool", "im launching", "we are launching", "product hunt", "producthunt",
    
    # Old self promo / build in public / generic poll ones:
    "introducing", "we just launched", "i made", "i created", "check out my", "i am looking for beta testers",
    "free tool i made", "open source project i built", "just launched my", "check out my product",
    "building in public", "day 1 of building", "week 1 of building",
    "what is your favorite", "what do you prefer", "hot take", "unpopular opinion", "weekly thread",
    "monthly thread", "discussion thread", "what do you think about",
    
    # Feedback Requests (Audit additions)
    "looking for feedback", "prelaunch feedback", "website feedback", "product feedback",
    "feedback on website", "feedback on product", "site review", "review my website", "review my product"
]

_HARD_BLOCK_MAPPINGS = [(p, normalize_text(p)) for p in _HARD_BLOCK_PHRASES]

_CAREER_BLOCK_PHRASES = [
    "learn jira", "career transition", "certification", "pmp",
    "course recommendation", "which certification", "job interview",
    "career advice", "salary", "promotion",
    
    # Career / networking exclusions
    "looking for a mentor", "looking for mentor", "looking for friends",
    "looking for a cofounder", "looking for co-founder", "seeking a cofounder",
    "seeking a co-founder", "available for freelance", "freelancer looking",
    "hire me", "looking for work", "portfolio review"
]

_CAREER_BLOCK_MAPPINGS = [(p, normalize_text(p)) for p in _CAREER_BLOCK_PHRASES]

_SELF_PROMOTION_PHRASES = [
    "my first saas",
    "feedback on my landing page",
    "would love this subs feedback",
    "drop a location and a niche",
    "im building a tool",
    "i built a tool",
    "i created a tool"
]

_SELF_PROMOTION_MAPPINGS = [(p, normalize_text(p)) for p in _SELF_PROMOTION_PHRASES]

_FOUNDER_VALIDATION_PHRASES = [
    "looking for users",
    "looking for beta users",
    "waitlist",
    "waitlist signup",
    "first users",
    "first customers",
    "validate my idea",
    "validate an idea",
    "product validation",
    "mvp",
    "minimum viable product",
    "startup idea",
    "need early adopters",
    "finding users",
    "getting users",
    "user acquisition",
    "launched my saas",
    "growing my saas",
    "building a saas",
    "bootstrapping",
    "pre launch",
    "prelaunch"
]

_FOUNDER_VALIDATION_MAPPINGS = [(p, normalize_text(p)) for p in _FOUNDER_VALIDATION_PHRASES]


# ---------------------------------------------------------------------------
# LAYER 2 — Condition A (Buying / Pain / Problem / Compliance / Scaling)
# ---------------------------------------------------------------------------

_CONDITION_A_SUBSTRINGS = [
    # Buying signals
    "looking for", "recommend", "suggestions for", "what tool", "which software", "best option for",
    "anyone using", "worth it", "should I use", "alternatives to", "switching from", "replacing", "comparison between",
    # Pain point signals
    "struggling with", "frustrated with", "tired of managing", "tired of using", "tired of dealing with",
    "sick of", "impossible to manage", "can't keep up", "overwhelmed", "drowning in", "falling behind",
    "losing track", "wasting time on", "manual process", "takes forever", "hours every week", "keeps breaking",
    "constantly failing", "nothing works", "no solution for", "missed deadlines", "customer complaints",
    "too many spreadsheets", "duplicate work", "manual reporting", "data entry", "follow up", "lead tracking",
    "churn", "retention",
    # Problem statement signals
    "how do you handle", "how do you manage", "how does your team", "what does your workflow look like",
    "anyone else dealing with", "is it just me or", "we keep running into", "our biggest problem is",
    "main bottleneck is", "biggest challenge is", "what are you using for", "how do you deal with",
    # Compliance and operational signals
    "being sued", "legal issue", "privacy policy", "compliance requirement", "audit", "regulation",
    "data breach", "security issue", "not compliant", "regulatory",
    # Scaling/growth pain signals
    "scaling", "growth", "scale up", "scaling issues", "growth pains", "scaling bottlenecks", "growing pains", "scaling up",
    
    # BUG FIX 3 — Missing Pain Signals additions
    "refund scam", "refund request", "chargeback", "fraud orders", "fraudulent", "suspicious orders",
    "flood of", "sudden spike", "getting scammed", "being scammed", "security breach", "account compromised",
    "app issue", "app broken", "app not working", "plugin issue", "integration broken", "sync issue",
    "not syncing", "data missing", "data lost", "losing data", "losing customers", "losing clients",
    "losing revenue", "negative reviews", "support tickets", "overloaded", "cannot scale", "growth problem",
    "scaling pain", "too many requests", "slow system", "system down", "outage", "downtime",
    
    # Audit Recommendation additions (Operational, Sync, SaaS Waste, Manual Overhead)
    "syncing", "sync", "integration issue", "integration problem",
    "nobody uses", "nobody is using", "no one uses", "wasting money", "waste of money", "unused", "underutilized",
    "renew", "renewal", "renewing", "manually", "by hand", "time consuming",
    
    # Part 2 Audit additions (Buying signals & Budget pain)
    "what's the cheapest", "cheapest software", "cheapest tool", "most affordable", "best invoicing software",
    "waste of budget", "wasting budget"
]

_CONDITION_A_REGEXES = [
    re.compile(r"\bvs\b", re.IGNORECASE),
    re.compile(r"\bversus\b", re.IGNORECASE),
    re.compile(r"\bbetter than\b", re.IGNORECASE),
    re.compile(r"\bgdpr\b", re.IGNORECASE),
]


# ---------------------------------------------------------------------------
# LAYER 2 — Condition B (Business Context Words)
# ---------------------------------------------------------------------------

_BUSINESS_WORDS = [
    # Existing context words
    "business", "startup", "agency", "clients", "customers", "revenue", "workflow", "process", "team",
    "operations", "software", "tool", "platform", "vendor", "service", "company", "employees",
    "contractors", "invoices", "billing", "onboarding", "sales", "marketing", "support", "automation",
    "integration", "dashboard", "reporting", "analytics", "saas", "freelance", "project management",
    "client work", "small business", "enterprise",
    
    # BUG FIX 2 — Business Context List additions
    "website", "web app", "web application", "application", "app", "store", "ecommerce", "e-commerce",
    "online store", "shopify", "woocommerce", "law firm", "legal", "compliance", "privacy", "regulation",
    "gdpr", "policy", "contract", "freelancer", "solopreneur", "consultant", "coach", "creator",
    "subscriber", "membership", "subscription", "user", "visitor", "traffic", "conversion", "landing page",
    "funnel", "campaign", "ad spend", "budget", "invoice", "payment", "refund", "chargeback", "fraud",
    "order", "fulfillment", "shipping", "delivery", "supplier", "product", "inventory"
]

_CONDITION_B_REGEXES = [
    re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE) for word in _BUSINESS_WORDS
]


# ---------------------------------------------------------------------------
# Database category mapping
# ---------------------------------------------------------------------------

_SIGNAL_CATEGORY_MAP: dict[str, str] = {
    # Buying signals
    "looking for": "tool_search",
    "recommend": "recommendation_request",
    "suggestions for": "recommendation_request",
    "what tool": "tool_search",
    "which software": "tool_search",
    "best option for": "tool_search",
    "anyone using": "recommendation_request",
    "worth it": "pricing_signal",
    "what's the cheapest": "pricing_signal",
    "most affordable": "pricing_signal",
    "cheapest software": "tool_search",
    "cheapest tool": "tool_search",
    "best invoicing software": "tool_search",
    "should I use": "recommendation_request",
    "alternatives to": "comparison_signal",
    "switching from": "migration_signal",
    "replacing": "migration_signal",
    "comparison between": "comparison_signal",
    "vs": "comparison_signal",
    "versus": "comparison_signal",
    "better than": "comparison_signal",
    
    # Pain point signals
    "struggling with": "problem_signal",
    "frustrated with": "problem_signal",
    "tired of managing": "problem_signal",
    "tired of using": "problem_signal",
    "tired of dealing with": "problem_signal",
    "sick of": "problem_signal",
    "impossible to manage": "problem_signal",
    "can't keep up": "problem_signal",
    "overwhelmed": "problem_signal",
    "drowning in": "problem_signal",
    "falling behind": "problem_signal",
    "losing track": "problem_signal",
    "wasting time on": "problem_signal",
    "manual process": "problem_signal",
    "takes forever": "problem_signal",
    "hours every week": "problem_signal",
    "keeps breaking": "problem_signal",
    "constantly failing": "problem_signal",
    "nothing works": "problem_signal",
    "no solution for": "problem_signal",
    "missed deadlines": "problem_signal",
    "customer complaints": "problem_signal",
    "too many spreadsheets": "problem_signal",
    "duplicate work": "problem_signal",
    "manual reporting": "problem_signal",
    "data entry": "problem_signal",
    "follow up": "problem_signal",
    "lead tracking": "problem_signal",
    "churn": "problem_signal",
    "retention": "problem_signal",
    
    # Problem statement signals
    "how do you handle": "problem_signal",
    "how do you manage": "problem_signal",
    "how does your team": "problem_signal",
    "what does your workflow look like": "problem_signal",
    "anyone else dealing with": "problem_signal",
    "is it just me or": "problem_signal",
    "we keep running into": "problem_signal",
    "our biggest problem is": "problem_signal",
    "main bottleneck is": "problem_signal",
    "biggest challenge is": "problem_signal",
    "what are you using for": "problem_signal",
    "how do you deal with": "problem_signal",
    
    # Compliance and operational signals
    "being sued": "problem_signal",
    "legal issue": "problem_signal",
    "privacy policy": "problem_signal",
    "GDPR": "problem_signal",
    "compliance requirement": "problem_signal",
    "audit": "problem_signal",
    "regulation": "problem_signal",
    "data breach": "problem_signal",
    "security issue": "problem_signal",
    "not compliant": "problem_signal",
    "regulatory": "problem_signal",
    
    # Scaling/growth pain signals
    "scaling": "problem_signal",
    "growth": "problem_signal",
    "scale up": "problem_signal",
    "scaling issues": "problem_signal",
    "growth pains": "problem_signal",
    "scaling bottlenecks": "problem_signal",
    "growing pains": "problem_signal",
    "scaling up": "problem_signal"
}

# Populate maps dynamically for new pain signals
for signal in [
    "refund scam", "refund request", "chargeback", "fraud orders", "fraudulent", "suspicious orders",
    "flood of", "sudden spike", "getting scammed", "being scammed", "security breach", "account compromised",
    "app issue", "app broken", "app not working", "plugin issue", "integration broken", "sync issue",
    "not syncing", "data missing", "data lost", "losing data", "losing customers", "losing clients",
    "losing revenue", "negative reviews", "support tickets", "overloaded", "cannot scale", "growth problem",
    "scaling pain", "too many requests", "slow system", "system down", "outage", "downtime",
    "syncing", "sync", "integration issue", "integration problem",
    "nobody uses", "nobody is using", "no one uses", "wasting money", "waste of money", "unused", "underutilized",
    "renew", "renewal", "renewing", "manually", "by hand", "time consuming",
    "waste of budget", "wasting budget"
]:
    _SIGNAL_CATEGORY_MAP[signal] = "problem_signal"


def map_to_signal_category(raw_reason: str) -> str:
    """
    Convert the matched Condition A pattern/phrase into one of the 6 database values.
    """
    clean_reason = raw_reason.strip("'\"")
    return _SIGNAL_CATEGORY_MAP.get(clean_reason, "tool_search")


# ---------------------------------------------------------------------------
# Exclusion Layer (Layer 1)
# ---------------------------------------------------------------------------

def _is_excluded(title: str, body: str) -> tuple[bool, str]:
    """
    Check Layer 1 exclusions.
    Returns (True, "hard_block:source:orig") if excluded, else (False, "").
    """
    title_norm = normalize_text(title)
    body_norm = normalize_text(body)

    # Check normalized title
    for orig, norm in _HARD_BLOCK_MAPPINGS:
        if norm in title_norm:
            return True, f"hard_block:title:{orig}"

    # Check normalized body
    for orig, norm in _HARD_BLOCK_MAPPINGS:
        if norm in body_norm:
            return True, f"hard_block:body:{orig}"

    return False, ""


# ---------------------------------------------------------------------------
# Core qualification logic
# ---------------------------------------------------------------------------

def _qualify_single(lead: dict[str, Any]) -> tuple[bool, str]:
    """
    Run Layer 1 and Layer 2 qualification checks on a single lead.
    Returns (passed: bool, reason: str).
    """
    title = lead.get("title", "") or ""
    body = lead.get("body", "") or ""

    # LAYER 1.2: Self-Promotion Exclusions
    title_norm = normalize_text(title)
    body_norm = normalize_text(body)
    for orig, norm in _SELF_PROMOTION_MAPPINGS:
        if norm in title_norm or norm in body_norm:
            return False, "self_promotion"

    # LAYER 1.3: Founder Validation Exclusions
    for orig, norm in _FOUNDER_VALIDATION_MAPPINGS:
        if norm in title_norm or norm in body_norm:
            return False, "founder_validation"

    # LAYER 1.5: Career / Education Exclusion
    for orig, norm in _CAREER_BLOCK_MAPPINGS:
        if norm in title_norm or norm in body_norm:
            return False, "career_discussion"

    # LAYER 1: Hard Block (first execution)
    excluded, reason = _is_excluded(title, body)
    if excluded:
        return False, reason

    # LAYER 2: Condition A & B
    combined_text = f"{title} {body}"
    combined_lower = combined_text.lower()

    matched_a = None

    # Check Condition A substrings
    for p in _CONDITION_A_SUBSTRINGS:
        if p.lower() in combined_lower:
            matched_a = p
            break

    # Check Condition A regexes (vs, GDPR, etc.)
    if not matched_a:
        for r in _CONDITION_A_REGEXES:
            m = r.search(combined_text)
            if m:
                matched_a = m.group(0)
                break

    # Tighten rules for scaling, growth, retention, vs, better than
    if matched_a:
        matched_a_clean = matched_a.lower().strip()
        if any(tk in matched_a_clean for tk in {"scaling", "growth", "retention", "vs", "better than"}):
            problem_words = {
                "problem", "issue", "broken", "failing", "error",
                "bottleneck", "nightmare", "frustrated", "pain point",
                "manual", "inefficient"
            }
            has_problem = any(pw in combined_lower for pw in problem_words)
            if not has_problem:
                return False, "weak_problem_signal"

    # Check Condition B business context
    matched_b = None
    for r in _CONDITION_B_REGEXES:
        m = r.search(combined_text)
        if m:
            matched_b = m.group(0)
            break

    if matched_a and matched_b:
        return True, matched_a
    elif matched_a and not matched_b:
        return False, "no_business_context"
    else:
        return False, "no_problem_signal"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def qualify_leads(
    leads: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Process leads through Layer 1 (Exclusion) and Layer 2 (Problem & Business Context).
    """
    QualifierStats.reset()
    QualifierStats.collected = len(leads)

    qualified: list[dict[str, Any]] = []
    filtered_out: list[dict[str, Any]] = []

    for lead in leads:
        passed, reason = _qualify_single(lead)
        if passed:
            enriched = lead.copy()
            enriched["qualification_reason"] = map_to_signal_category(reason)
            enriched["qualification_rule"] = reason
            qualified.append(enriched)
            logger.info(
                "QUALIFIED  post_id=%-10s  reason=%s  rule=%r  title=%r",
                lead.get("post_id", "?"),
                enriched["qualification_reason"],
                reason,
                lead.get("title", "")[:70],
            )
        else:
            stub = lead.copy()
            stub["filtered_out"] = True
            
            # Track all rejected reasons
            clean_reason = reason
            if reason.startswith("hard_block:"):
                clean_reason = "hard_block"
            QualifierStats.rejected_reasons[clean_reason] = QualifierStats.rejected_reasons.get(clean_reason, 0) + 1

            if reason.startswith("hard_block:"):
                _, source, phrase = reason.split(":", 2)
                stub["filter_reason"] = "hard_block"
                QualifierStats.hard_blocked += 1
                
                if source == "title":
                    QualifierStats.title_match += 1
                elif source == "body":
                    QualifierStats.body_match += 1
                    
                QualifierStats.triggered_phrases[phrase] = QualifierStats.triggered_phrases.get(phrase, 0) + 1
            elif reason == "career_discussion":
                stub["filter_reason"] = "career_discussion"
                QualifierStats.career_discussion += 1
            elif reason == "self_promotion":
                stub["filter_reason"] = "self_promotion"
                QualifierStats.self_promotion += 1
            elif reason == "founder_validation":
                stub["filter_reason"] = "founder_validation"
                QualifierStats.founder_validation += 1
            elif reason == "weak_problem_signal":
                stub["filter_reason"] = "weak_problem_signal"
                QualifierStats.weak_problem_signal += 1
            elif reason == "no_business_context":
                stub["filter_reason"] = "no_business_context"
                QualifierStats.no_business_context += 1
            else:
                stub["filter_reason"] = "no_problem_signal"
                QualifierStats.no_problem_signal += 1

            filtered_out.append(stub)
            logger.info(
                "FILTERED post_id=%s reason=%s rule=%s title=%r",
                lead.get("post_id", "?"),
                stub["filter_reason"],
                reason,
                lead.get("title", "")[:70],
            )

    QualifierStats.passed_to_groq = len(qualified)

    # Diagnostics mode: log top 20 filtered titles
    logger.info("=== DIAGNOSTICS: TOP 20 FILTERED POSTS ===")
    for idx, f_lead in enumerate(filtered_out[:20], start=1):
        logger.info(
            "  #%d [%s] post_id=%s | sub=%s | title=%r",
            idx,
            f_lead.get("filter_reason", "unknown"),
            f_lead.get("post_id", "?"),
            f_lead.get("subreddit", "?"),
            f_lead.get("title", "")[:80]
        )

    if QualifierStats.passed_to_groq == 0:
        QualifierStats.print_report()

    return qualified, filtered_out
