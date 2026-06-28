import logging
import requests
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from backend.scheduler import limiter
from pydantic import BaseModel, Field
from backend.config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/outreach", tags=["Outreach"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

class OutreachGenerateRequest(BaseModel):
    post_id: str
    channel: str = Field(..., description="Channel for outreach: 'reddit', 'linkedin', or 'email'")
    title: str
    body: Optional[str] = ""
    subreddit: str
    category: str
    intent_score: int
    lead_summary: str
    notes: Optional[str] = ""

class OutreachGenerateResponse(BaseModel):
    channel: str
    message: str

def get_groq_api_key() -> str:
    if not GROQ_API_KEY or not GROQ_API_KEY.strip():
        logger.error("GROQ_API_KEY is missing from configuration.")
        raise HTTPException(
            status_code=500,
            detail="Groq API key is not configured on the server. Please set GROQ_API_KEY in the environment."
        )
    return GROQ_API_KEY.strip()

@router.post("/generate", response_model=OutreachGenerateResponse)
@limiter.limit("10/minute")
async def generate_outreach(
    request: Request,
    req: OutreachGenerateRequest,
    api_key: str = Depends(get_groq_api_key)
) -> OutreachGenerateResponse:
    """
    Generate an AI outreach message on-demand for a given lead, tailored to the selected channel.
    """
    x_user_id = request.headers.get("x-user-id")
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Header 'X-User-Id' is required.")

    from backend.subscription_service import can_generate_outreach, increment_usage
    if not can_generate_outreach(x_user_id):
        raise HTTPException(
            status_code=403,
            detail="Daily AI generation limit exceeded. Please upgrade to Pro for unlimited access."
        )

    channel = req.channel.lower().strip()
    if channel not in ("reddit", "linkedin", "email"):
        raise HTTPException(status_code=400, detail="Invalid channel. Must be 'reddit', 'linkedin', or 'email'.")

    # 1. Build System and User prompts based on the channel
    if channel == "reddit":
        system_prompt = (
            "You are a helpful and community-oriented B2B marketing assistant. "
            "Your goal is to write a Reddit comment reply that is highly conversational, value-first, and "
            f"directly aligned with the community culture of the r/{req.subreddit} subreddit."
        )
        user_content = (
            f"Analyze this Reddit post and write a natural, non-spammy, highly helpful reply for r/{req.subreddit}.\n"
            f"Rules:\n"
            f"1. Add real value first. Answer their questions or validate their frustration.\n"
            f"2. Gently and naturally mention how a B2B SaaS solution could solve their problem, without being pushy or sounding like an ad.\n"
            f"3. Keep it strictly to 2 to 3 sentences. No greetings like 'Hi there!' or sign-offs.\n"
            f"4. Do NOT use placeholder text.\n\n"
            f"Post Title: {req.title}\n"
            f"Post Body: {req.body}\n"
            f"Subreddit: r/{req.subreddit}\n"
            f"Lead Category: {req.category}\n"
            f"Lead Summary: {req.lead_summary}\n"
            f"User Notes: {req.notes or 'None'}"
        )
    elif channel == "linkedin":
        system_prompt = (
            "You are a professional B2B business development representative. "
            "Your goal is to write a highly personalized, concise LinkedIn outreach message "
            "that feels human, professional, and targeted."
        )
        user_content = (
            f"Write a LinkedIn connection request or short InMail message for the author of this post.\n"
            f"Rules:\n"
            f"1. Keep it under 300 characters (extremely concise).\n"
            f"2. Acknowledge the operational problem or post topic they discussed (from Lead Summary and Notes).\n"
            f"3. Propose a connection or ask a quick question to open a dialog. Do NOT try to sell immediately.\n"
            f"4. Do NOT use placeholder brackets like [Your Name] or [Company Name]. Use general, professional phrasing.\n\n"
            f"Post Title: {req.title}\n"
            f"Lead Summary: {req.lead_summary}\n"
            f"User Notes: {req.notes or 'None'}"
        )
    else:  # email
        system_prompt = (
            "You are an expert cold outreach specialist. "
            "Your goal is to write a high-converting, personalized cold email that focuses on solving a specific business pain point."
        )
        user_content = (
            f"Write a cold email to the author of this post.\n"
            f"Rules:\n"
            f"1. Include a short, catchy Subject Line at the very top, formatted as 'Subject: <line>'.\n"
            f"2. Keep the email body short and punchy (under 120 words).\n"
            f"3. Reference the specific problem they shared (from Lead Summary and Notes).\n"
            f"4. Present a brief value proposition showing how we help companies solve this specific challenge.\n"
            f"5. End with a low-friction Call to Action (CTA) asking for a quick reply or a 5-minute chat.\n"
            f"6. Do NOT use placeholder brackets like [Your Name] or [Company]. Use a generic professional sign-off.\n\n"
            f"Post Title: {req.title}\n"
            f"Lead Summary: {req.lead_summary}\n"
            f"User Notes: {req.notes or 'None'}"
        )

    # 2. Setup Groq request payload
    payload = {
        "model": GROQ_MODEL or "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.5,
        "max_tokens": 300 if channel != "email" else 500,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # 3. Request completion from Groq API
    try:
        logger.info(f"Generating outreach for channel={channel}, post_id={req.post_id} using model={payload['model']}")
        response = requests.post(
            GROQ_API_URL, headers=headers, json=payload, timeout=15.0
        )

        if response.status_code != 200:
            logger.error(f"Groq API returned error status {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=502,
                detail=f"Groq API returned an error: {response.text}"
            )

        resp_json = response.json()
        choices = resp_json.get("choices", [])
        if not choices:
            raise HTTPException(
                status_code=502,
                detail="Groq API returned an empty response choices list."
            )

        message_content = choices[0].get("message", {}).get("content", "").strip()
        if not message_content:
            raise HTTPException(
                status_code=502,
                detail="Groq API returned empty message content."
            )

        increment_usage(x_user_id, "ai_generations")

        return OutreachGenerateResponse(
            channel=channel,
            message=message_content
        )

    except requests.exceptions.RequestException as exc:
        logger.error(f"Network request to Groq API failed: {exc}")
        raise HTTPException(
            status_code=504,
            detail=f"Failed to connect to the Groq API: {str(exc)}"
        )
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        logger.error(f"Unexpected error during outreach generation: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(exc)}"
        )
