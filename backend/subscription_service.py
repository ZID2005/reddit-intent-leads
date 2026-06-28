import logging
from datetime import datetime, timezone
from typing import Any, Dict
from supabase import create_client, Client
from backend.config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

_client: Client | None = None

# Resilient in-memory fallbacks if database tables do not exist
_IN_MEMORY_SUBSCRIPTIONS: Dict[str, Dict[str, Any]] = {}  # user_id -> subscription info
_IN_MEMORY_USAGE: Dict[str, Dict[str, Any]] = {}         # (user_id, month) -> usage counts
_IN_MEMORY_DAILY_USAGE: Dict[str, Dict[str, Any]] = {}   # (user_id, date_str) -> usage counts

def get_supabase_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL or SUPABASE_KEY is missing from environment.")
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client

def get_user_plan(user_id: str) -> str:
    """
    Get the user's plan. If the subscription doesn't exist, create a default 'free' plan.
    Resilient to missing database tables.
    """
    client = get_supabase_client()
    try:
        res = client.table("subscriptions").select("plan").eq("user_id", user_id).execute()
        if res.data:
            return res.data[0]["plan"]
        
        # Insert a default 'free' subscription
        client.table("subscriptions").insert({
            "user_id": user_id,
            "plan": "free",
            "status": "active"
        }).execute()
        return "free"
    except Exception as e:
        # Check if the table doesn't exist
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "relation" in err_msg:
            logger.warning(f"Subscriptions table not found. Using in-memory fallback for user {user_id}.")
            if user_id not in _IN_MEMORY_SUBSCRIPTIONS:
                _IN_MEMORY_SUBSCRIPTIONS[user_id] = {
                    "plan": "free",
                    "status": "active",
                    "starts_at": datetime.now(timezone.utc).isoformat()
                }
            return _IN_MEMORY_SUBSCRIPTIONS[user_id]["plan"]
        
        logger.error(f"Error getting plan for user {user_id}: {e}")
        return "free"

def increment_usage(user_id: str, feature: str) -> None:
    """
    Increment the user's usage for a given feature in the current month.
    Also update daily_usage if the feature is ai_generations or csv_exports.
    """
    if feature not in ["ai_generations", "csv_exports", "leads_viewed", "notifications_sent"]:
        logger.warning(f"Unknown feature increment requested: {feature}")
        return

    client = get_supabase_client()
    now = datetime.now(timezone.utc)
    month_str = now.strftime("%Y-%m")
    date_str = now.strftime("%Y-%m-%d")

    try:
        # 1. Update monthly usage in DB
        res = client.table("usage_tracking").select("*").eq("user_id", user_id).eq("month", month_str).execute()
        if res.data:
            current_val = res.data[0].get(feature, 0) or 0
            client.table("usage_tracking").update({
                feature: current_val + 1,
                "updated_at": now.isoformat()
            }).eq("user_id", user_id).eq("month", month_str).execute()
        else:
            insert_data = {
                "user_id": user_id,
                "month": month_str,
                "ai_generations": 0,
                "csv_exports": 0,
                "leads_viewed": 0,
                "notifications_sent": 0,
                "updated_at": now.isoformat()
            }
            insert_data[feature] = 1
            client.table("usage_tracking").insert(insert_data).execute()

        # 2. Update daily usage in DB if applicable
        if feature in ["ai_generations", "csv_exports"]:
            daily_res = client.table("daily_usage").select("*").eq("user_id", user_id).eq("date", date_str).execute()
            if daily_res.data:
                current_daily_val = daily_res.data[0].get(feature, 0) or 0
                client.table("daily_usage").update({
                    feature: current_daily_val + 1,
                    "updated_at": now.isoformat()
                }).eq("user_id", user_id).eq("date", date_str).execute()
            else:
                daily_insert_data = {
                    "user_id": user_id,
                    "date": date_str,
                    "ai_generations": 0,
                    "csv_exports": 0,
                    "updated_at": now.isoformat()
                }
                daily_insert_data[feature] = 1
                client.table("daily_usage").insert(daily_insert_data).execute()

    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "relation" in err_msg:
            # Fallback to in-memory tracking
            month_key = f"{user_id}_{month_str}"
            if month_key not in _IN_MEMORY_USAGE:
                _IN_MEMORY_USAGE[month_key] = {
                    "ai_generations": 0,
                    "csv_exports": 0,
                    "leads_viewed": 0,
                    "notifications_sent": 0
                }
            _IN_MEMORY_USAGE[month_key][feature] += 1
            
            if feature in ["ai_generations", "csv_exports"]:
                daily_key = f"{user_id}_{date_str}"
                if daily_key not in _IN_MEMORY_DAILY_USAGE:
                    _IN_MEMORY_DAILY_USAGE[daily_key] = {
                        "ai_generations": 0,
                        "csv_exports": 0
                    }
                _IN_MEMORY_DAILY_USAGE[daily_key][feature] += 1
            logger.debug(f"Logged {feature} increment in memory for user {user_id}.")
        else:
            logger.error(f"Error incrementing usage for user {user_id}, feature {feature}: {e}")

def can_generate_outreach(user_id: str) -> bool:
    """
    Check if the user is allowed to generate outreach.
    Pro plan: unlimited.
    Free plan: 5 per day.
    """
    plan = get_user_plan(user_id)
    if plan == "pro":
        return True
    
    client = get_supabase_client()
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        res = client.table("daily_usage").select("ai_generations").eq("user_id", user_id).eq("date", date_str).execute()
        if res.data:
            usage = res.data[0].get("ai_generations", 0) or 0
            return usage < 5
        return True
    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "relation" in err_msg:
            daily_key = f"{user_id}_{date_str}"
            usage = _IN_MEMORY_DAILY_USAGE.get(daily_key, {}).get("ai_generations", 0)
            return usage < 5
        logger.error(f"Error checking AI generation limit for user {user_id}: {e}")
        return True

def can_export_csv(user_id: str) -> bool:
    """
    Check if the user is allowed to export CSV.
    Pro plan: unlimited.
    Free plan: 2 per day.
    """
    plan = get_user_plan(user_id)
    if plan == "pro":
        return True
    
    client = get_supabase_client()
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        res = client.table("daily_usage").select("csv_exports").eq("user_id", user_id).eq("date", date_str).execute()
        if res.data:
            usage = res.data[0].get("csv_exports", 0) or 0
            return usage < 2
        return True
    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "relation" in err_msg:
            daily_key = f"{user_id}_{date_str}"
            usage = _IN_MEMORY_DAILY_USAGE.get(daily_key, {}).get("csv_exports", 0)
            return usage < 2
        logger.error(f"Error checking CSV export limit for user {user_id}: {e}")
        return True

def can_view_unlimited_leads(user_id: str) -> bool:
    """
    Check if the user is allowed to view unlimited leads.
    Pro plan: yes.
    Free plan: no (limited to 100).
    """
    plan = get_user_plan(user_id)
    return plan == "pro"
