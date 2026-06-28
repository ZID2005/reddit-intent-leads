import logging
from fastapi import APIRouter, HTTPException, Header, Request
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from backend.subscription_service import (
    get_user_plan,
    increment_usage,
    get_supabase_client,
    _IN_MEMORY_SUBSCRIPTIONS,
    _IN_MEMORY_USAGE,
    _IN_MEMORY_DAILY_USAGE
)
from backend.scheduler import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscription", tags=["Subscription"])

class UpgradeRequest(BaseModel):
    plan: str

class UsageIncrementRequest(BaseModel):
    feature: str

@router.get("/status")
@limiter.limit("60/minute")
async def get_subscription_status(request: Request, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Header 'X-User-Id' is missing.")
    
    plan = get_user_plan(x_user_id)
    client = get_supabase_client()
    now = datetime.now(timezone.utc)
    month_str = now.strftime("%Y-%m")
    date_str = now.strftime("%Y-%m-%d")

    # Default values
    monthly_usage = {
        "month": month_str,
        "ai_generations": 0,
        "csv_exports": 0,
        "leads_viewed": 0,
        "notifications_sent": 0
    }
    daily_usage = {
        "ai_generations": 0,
        "csv_exports": 0
    }
    sub_info = {
        "starts_at": now.isoformat(),
        "expires_at": None,
        "status": "active"
    }

    use_db = True
    try:
        # Fetch monthly usage from DB
        res = client.table("usage_tracking").select("*").eq("user_id", x_user_id).eq("month", month_str).execute()
        if res.data:
            monthly_usage = res.data[0]
    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "relation" in err_msg:
            use_db = False
            month_key = f"{x_user_id}_{month_str}"
            if month_key in _IN_MEMORY_USAGE:
                monthly_usage.update(_IN_MEMORY_USAGE[month_key])
        else:
            logger.error(f"Error fetching monthly usage from DB: {e}")

    if use_db:
        try:
            # Fetch daily usage from DB
            res = client.table("daily_usage").select("*").eq("user_id", x_user_id).eq("date", date_str).execute()
            if res.data:
                daily_usage = res.data[0]
        except Exception as e:
            logger.error(f"Error fetching daily usage: {e}")

        try:
            # Fetch subscription details from DB
            res = client.table("subscriptions").select("starts_at", "expires_at", "status").eq("user_id", x_user_id).execute()
            if res.data:
                sub_info = res.data[0]
        except Exception as e:
            logger.error(f"Error fetching subscription details: {e}")
    else:
        # Load from in-memory cache
        daily_key = f"{x_user_id}_{date_str}"
        if daily_key in _IN_MEMORY_DAILY_USAGE:
            daily_usage.update(_IN_MEMORY_DAILY_USAGE[daily_key])
        if x_user_id in _IN_MEMORY_SUBSCRIPTIONS:
            sub_info.update(_IN_MEMORY_SUBSCRIPTIONS[x_user_id])

    return {
        "plan": plan,
        "status": sub_info.get("status", "active"),
        "starts_at": sub_info.get("starts_at"),
        "expires_at": sub_info.get("expires_at"),
        "usage": {
            "month": month_str,
            "ai_generations": monthly_usage.get("ai_generations", 0),
            "csv_exports": monthly_usage.get("csv_exports", 0),
            "leads_viewed": monthly_usage.get("leads_viewed", 0),
            "notifications_sent": monthly_usage.get("notifications_sent", 0),
            "ai_generations_today": daily_usage.get("ai_generations", 0),
            "csv_exports_today": daily_usage.get("csv_exports", 0),
        },
        "limits": {
            "ai_generations_limit": 5 if plan == "free" else -1,
            "csv_exports_limit": 2 if plan == "free" else -1,
            "leads_limit": 100 if plan == "free" else -1,
            "analytics": "basic" if plan == "free" else "advanced",
            "pipeline": "read_only" if plan == "free" else "full",
            "notifications": "disabled" if plan == "free" else "enabled"
        }
    }

@router.post("/upgrade")
@limiter.limit("10/minute")
async def upgrade_subscription(request: Request, req: UpgradeRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Header 'X-User-Id' is missing.")
    
    plan = req.plan.lower().strip()
    if plan not in ["free", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan name. Must be 'free' or 'pro'.")

    client = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()
    try:
        # Check if subscription exists in DB
        res = client.table("subscriptions").select("*").eq("user_id", x_user_id).execute()
        if res.data:
            client.table("subscriptions").update({
                "plan": plan,
                "updated_at": now
            }).eq("user_id", x_user_id).execute()
        else:
            client.table("subscriptions").insert({
                "user_id": x_user_id,
                "plan": plan,
                "status": "active",
                "starts_at": now,
                "created_at": now,
                "updated_at": now
            }).execute()

        # Update Supabase user auth metadata
        try:
            client.auth.admin.update_user_by_id(x_user_id, attributes={"user_metadata": {"plan": plan}})
            logger.info(f"Updated auth user metadata plan to {plan} for user {x_user_id}")
        except Exception as auth_err:
            logger.error(f"Could not update auth user metadata: {auth_err}")

    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "relation" in err_msg:
            # Fallback to in-memory save
            _IN_MEMORY_SUBSCRIPTIONS[x_user_id] = {
                "plan": plan,
                "status": "active",
                "starts_at": now,
                "updated_at": now
            }
            logger.warning(f"Subscriptions table not found. Upgraded plan in-memory for user {x_user_id}.")
        else:
            logger.error(f"Error upgrading subscription in DB: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upgrade subscription: {e}")

    return {"status": "success", "plan": plan}

@router.post("/increment-usage")
@limiter.limit("60/minute")
async def track_usage(request: Request, req: UsageIncrementRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Header 'X-User-Id' is missing.")
    
    feature = req.feature.lower().strip()
    increment_usage(x_user_id, feature)
    return {"status": "success", "feature": feature}
