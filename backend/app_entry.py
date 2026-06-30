import logging
import uvicorn
from fastapi import Request
from backend.logging_config import setup_logging

# Set up structured JSON logging for production
setup_logging()
logger = logging.getLogger(__name__)

from backend.scheduler import app, SCHEDULER_API_PORT, scheduler, get_supabase, limiter
from backend.outreach_router import router as outreach_router
from backend.subscription_router import router as subscription_router
from backend.payment_router import router as payment_router
from backend.config import GROQ_API_KEY
import time

START_TIME = time.time()

# Include the outreach router
logger.info("Registering B2B outreach generator router...")
app.include_router(outreach_router)

# Include the subscription router
logger.info("Registering Subscription and Usage Tracking router...")
app.include_router(subscription_router)

# Include the payment router
logger.info("Registering Razorpay payment router...")
app.include_router(payment_router)

# Remove the old health route from scheduler.py to prevent clash
app.router.routes = [r for r in app.router.routes if getattr(r, "path", None) != "/health"]

@app.get("/health")
@limiter.limit("60/minute")
async def detailed_health(request: Request):
    uptime = int(time.time() - START_TIME)
    
    # 1. Check database connectivity
    db_connected = False
    try:
        get_supabase().table("scheduler_runs").select("id").limit(1).execute()
        db_connected = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        
    # 2. Check scheduler status
    sched_running = False
    next_run_str = None
    jobs_count = 0
    try:
        sched_running = scheduler.running
        jobs_count = len(scheduler.get_jobs())
        job = scheduler.get_job("pipeline")
        if job:
            nrt = getattr(job, "next_run_time", None)
            if nrt:
                next_run_str = nrt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception as e:
        logger.error(f"Scheduler health check failed: {e}")
        
    # 3. Check Groq configuration
    groq_configured = bool(GROQ_API_KEY and GROQ_API_KEY.strip())
    
    return {
        "status": "healthy" if db_connected and sched_running else "degraded",
        "scheduler": {
            "running": sched_running,
            "next_run": next_run_str,
            "jobs": jobs_count
        },
        "database": {
            "connected": db_connected
        },
        "groq": {
            "configured": groq_configured
        },
        "uptime_seconds": uptime
    }

@app.get("/health/live")
@limiter.limit("60/minute")
async def live_health(request: Request):
    return {"healthy": True}

@app.get("/version")
async def get_version():
    return {
        "app": "SignalRadar",
        "version": "1.0.0",
        "environment": "production"
    }


import socket
import sys

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

if __name__ == "__main__":
    if is_port_in_use(SCHEDULER_API_PORT):
        logger.error(
            f"Port {SCHEDULER_API_PORT} is already in use! "
            "Another instance of the SignalRadar scheduler is likely running. "
            "Please terminate the existing process before launching a new one."
        )
        sys.exit(1)

    logger.info(f"Starting extended SignalRadar FastAPI server on port {SCHEDULER_API_PORT}...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=SCHEDULER_API_PORT,
        reload=False,
        log_level="info",
    )
