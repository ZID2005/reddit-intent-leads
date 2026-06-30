import logging
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Header, Request

import razorpay

from backend.subscription_service import (
    get_user_plan,
    get_supabase_client,
    _IN_MEMORY_SUBSCRIPTIONS
)
from backend.scheduler import limiter

logger = logging.getLogger(__name__)

# Load keys from environment
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

# Initialize Razorpay client client-side validation
razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        logger.info("Razorpay client successfully initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize Razorpay client: {e}")
else:
    logger.warning("Razorpay credentials missing from environment. Payment endpoints will fail gracefully.")

router = APIRouter(prefix="/api/payments", tags=["Payments"])

class CreateOrderRequest(BaseModel):
    plan: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/create-order")
@limiter.limit("10/minute")
async def create_payment_order(request: Request, req: CreateOrderRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Header 'X-User-Id' is missing.")
    
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or razorpay_client is None:
        logger.error("Attempted payment order creation but Razorpay is not configured.")
        raise HTTPException(
            status_code=500,
            detail="Payment provider is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        )

    plan = req.plan.lower().strip()
    if plan != "pro":
        raise HTTPException(status_code=400, detail="Only 'pro' plan upgrades are supported currently.")

    # Verify user is not already Pro
    current_plan = get_user_plan(x_user_id)
    if current_plan == "pro":
        raise HTTPException(status_code=400, detail="User is already subscribed to the Pro plan.")

    # SignalRadar Pro Details:
    # Amount: 699 INR = 69900 paise
    amount_paise = 69900
    currency = "INR"

    order_data = {
        "amount": amount_paise,
        "currency": currency,
        "receipt": f"receipt_order_{x_user_id}_{int(time.time())}",
        "notes": {
            "plan": "pro",
            "user_id": x_user_id
        }
    }

    try:
        logger.info(f"Creating Razorpay order for user {x_user_id}")
        order = razorpay_client.order.create(data=order_data)
        order_id = order.get("id")
        
        return {
            "key": RAZORPAY_KEY_ID,
            "order_id": order_id,
            "amount": amount_paise,
            "currency": currency
        }
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment order with Razorpay: {e}")

@router.post("/verify")
@limiter.limit("10/minute")
async def verify_payment(request: Request, req: VerifyPaymentRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Header 'X-User-Id' is missing.")

    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or razorpay_client is None:
        logger.error("Attempted signature verification but Razorpay is not configured.")
        raise HTTPException(
            status_code=500,
            detail="Payment provider is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        )

    # Use razorpay.utility.verify_payment_signature()
    params_dict = {
        'razorpay_order_id': req.razorpay_order_id,
        'razorpay_payment_id': req.razorpay_payment_id,
        'razorpay_signature': req.razorpay_signature
    }

    try:
        razorpay_client.utility.verify_payment_signature(params_dict)
    except Exception as sig_err:
        logger.warning(f"Payment signature verification failed: {sig_err}")
        raise HTTPException(status_code=400, detail="Invalid payment signature.")

    # Successful payment: Update subscription
    client = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()
    expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    try:
        # Check if subscription exists in DB
        res = client.table("subscriptions").select("*").eq("user_id", x_user_id).execute()

        db_payload = {
            "plan": "pro",
            "status": "active",
            "starts_at": now,
            "expires_at": expires,
            "updated_at": now,
            "razorpay_payment_id": req.razorpay_payment_id
        }

        try:
            if res.data:
                client.table("subscriptions").update(db_payload).eq("user_id", x_user_id).execute()
            else:
                db_payload["user_id"] = x_user_id
                db_payload["created_at"] = now
                client.table("subscriptions").insert(db_payload).execute()
            logger.info(f"Updated database subscription for user {x_user_id} to pro.")
        except Exception as db_col_err:
            # Fallback in case columns like razorpay_payment_id do not exist
            logger.warning(f"DB update failed with full payload: {db_col_err}. Retrying without razorpay_payment_id.")
            db_payload.pop("razorpay_payment_id", None)
            if res.data:
                client.table("subscriptions").update(db_payload).eq("user_id", x_user_id).execute()
            else:
                db_payload["user_id"] = x_user_id
                db_payload["created_at"] = now
                client.table("subscriptions").insert(db_payload).execute()
            logger.info(f"Updated database subscription (no razorpay_payment_id column) for user {x_user_id} to pro.")

        # Update Supabase user auth metadata
        try:
            client.auth.admin.update_user_by_id(x_user_id, attributes={"user_metadata": {"plan": "pro"}})
            logger.info(f"Updated auth user metadata plan to pro for user {x_user_id}")
        except Exception as auth_err:
            logger.error(f"Could not update auth user metadata: {auth_err}")

    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "relation" in err_msg:
            # Fallback to in-memory save
            _IN_MEMORY_SUBSCRIPTIONS[x_user_id] = {
                "plan": "pro",
                "status": "active",
                "starts_at": now,
                "expires_at": expires,
                "razorpay_payment_id": req.razorpay_payment_id,
                "updated_at": now
            }
            logger.warning(f"Subscriptions table not found. Upgraded plan in-memory for user {x_user_id}.")
        else:
            logger.error(f"Error upgrading subscription in DB: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update subscription: {e}")

    return {
        "success": True,
        "plan": "pro"
    }

@router.get("/status")
@limiter.limit("60/minute")
async def get_payment_status(request: Request, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Header 'X-User-Id' is missing.")

    client = get_supabase_client()
    plan = "free"
    status = "active"
    expires_at = None

    try:
        res = client.table("subscriptions").select("plan", "status", "expires_at").eq("user_id", x_user_id).execute()
        if res.data:
            plan = res.data[0].get("plan", "free")
            status = res.data[0].get("status", "active")
            expires_at = res.data[0].get("expires_at")
        else:
            # Fallback to in-memory check
            if x_user_id in _IN_MEMORY_SUBSCRIPTIONS:
                plan = _IN_MEMORY_SUBSCRIPTIONS[x_user_id].get("plan", "free")
                status = _IN_MEMORY_SUBSCRIPTIONS[x_user_id].get("status", "active")
                expires_at = _IN_MEMORY_SUBSCRIPTIONS[x_user_id].get("expires_at")
    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "relation" in err_msg:
            if x_user_id in _IN_MEMORY_SUBSCRIPTIONS:
                plan = _IN_MEMORY_SUBSCRIPTIONS[x_user_id].get("plan", "free")
                status = _IN_MEMORY_SUBSCRIPTIONS[x_user_id].get("status", "active")
                expires_at = _IN_MEMORY_SUBSCRIPTIONS[x_user_id].get("expires_at")
        else:
            logger.error(f"Error getting payment status from DB: {e}")

    return {
        "plan": plan,
        "status": status,
        "expires_at": expires_at
    }
