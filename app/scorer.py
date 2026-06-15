import json
import logging
import os
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

# Constants
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "llama-3.3-70b-versatile"
MAX_RETRIES = 5
INITIAL_BACKOFF = 2.0  # seconds

VALID_CATEGORIES = {
    "buying_intent",
    "comparison",
    "frustration",
    "information_seeking",
    "discussion"
}


class GroqScorerError(Exception):
    """Exception class for errors during post scoring via Groq API."""
    pass


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


def call_groq_api(title: str, body: str, api_key: str, model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Calls the Groq API to analyze a single post with retry logic.

    Args:
        title: Title of the Reddit post.
        body: Body of the Reddit post.
        api_key: The Groq API key.
        model: Model identifier.

    Returns:
        A dictionary containing the keys: intent_score, confidence, category, reason, draft_reply, keywords.

    Raises:
        GroqScorerError: If the API call fails or returns invalid/malformed JSON.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are an AI assistant that analyzes Reddit posts to determine customer intent, categorize them, "
        "and draft responses.\n\n"
        "Analyze the user's title and body, then output a JSON object containing the following keys:\n"
        '1. "intent_score": an integer between 0 and 100. High scores indicate strong interest, immediate needs, or buying signals.\n'
        '2. "confidence": a float between 0.0 and 1.0 representing your certainty in the intent score and category.\n'
        '3. "category": a string representing the classification. It MUST be exactly one of the following:\n'
        '   - "buying_intent": explicit request to purchase, hire, or search for a paid product/service.\n'
        '   - "comparison": comparing two or more products, platforms, or services.\n'
        '   - "frustration": complaining about a tool, service, or current manual process.\n'
        '   - "information_seeking": general questions about how to do things, best practices, or tools.\n'
        '   - "discussion": start a debate, share an opinion, or talk about industry trends.\n'
        '4. "reason": a brief one-sentence reason explaining why you chose this score and category.\n'
        '5. "draft_reply": a helpful, professional, and personalized response to the user\'s post that addresses their needs without sounding overly salesy.\n'
        '6. "keywords": a list of lowercase strings representing key terms, technologies, brands, or topics identified in the post.\n'
        '7. "lead_summary": a concise, one-sentence executive summary highlighting the user\'s main need, budget, and timeline (e.g., "Agency of 5 employees actively evaluating CRM tools with budget under $100/month and purchase intent within 1 week").\n\n'
        "You MUST return ONLY a valid JSON object. Do not include any explanation or formatting outside the JSON block."
    )

    user_content = f"Title: {title}\nBody: {body}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.0,
        "response_format": {"type": "json_object"}
    }

    backoff = INITIAL_BACKOFF
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(f"Sending request to Groq API (Attempt {attempt}/{MAX_RETRIES})...")
            response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=15.0)
            
            # If rate limited or standard HTTP error
            if response.status_code == 429:
                logger.warning(f"Groq API returned 429 (Rate Limit). Retrying in {backoff:.2f}s...")
            else:
                response.raise_for_status()
                
                # Parse response
                result = response.json()
                content_text = result["choices"][0]["message"]["content"]
                
                # Load response string to verify it's valid JSON
                analysis = json.loads(content_text)
                
                # Validate response schema
                required_keys = {"intent_score", "confidence", "category", "reason", "draft_reply", "keywords", "lead_summary"}
                if not required_keys.issubset(analysis.keys()):
                    missing = required_keys - analysis.keys()
                    raise ValueError(f"Missing required keys in API response: {missing}")
                
                # Enforce category values
                category = analysis["category"]
                if category not in VALID_CATEGORIES:
                    logger.warning(f"Returned category '{category}' is invalid. Mapping to nearest category.")
                    # Match standard categorization fallback
                    analysis["category"] = get_fallback_category(category)

                # Ensure score is integer
                try:
                    analysis["intent_score"] = int(analysis["intent_score"])
                except (ValueError, TypeError):
                    analysis["intent_score"] = 50

                # Ensure confidence is float
                try:
                    analysis["confidence"] = float(analysis["confidence"])
                except (ValueError, TypeError):
                    analysis["confidence"] = 0.5

                # Ensure keywords is a list of strings
                if not isinstance(analysis["keywords"], list):
                    analysis["keywords"] = [str(analysis["keywords"])] if analysis["keywords"] else []
                else:
                    analysis["keywords"] = [str(k).lower().strip() for k in analysis["keywords"] if k]

                # Ensure lead_summary is a string
                analysis["lead_summary"] = str(analysis.get("lead_summary", "")).strip()

                return analysis

        except (requests.RequestException, json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Attempt {attempt} failed with error: {e}")
            if attempt == MAX_RETRIES:
                raise GroqScorerError(f"All {MAX_RETRIES} attempts to Groq API failed.") from e
        
        # Exponential backoff with jitter
        sleep_time = backoff + random.uniform(0, 1)
        time.sleep(sleep_time)
        backoff *= 2.0

    raise GroqScorerError("Max retries reached without success.")


def get_fallback_category(category: str) -> str:
    """Standardizes non-compliant categories to the closest valid category."""
    category_lower = str(category).lower().strip()
    for valid in VALID_CATEGORIES:
        if valid in category_lower:
            return valid
    if "question" in category_lower or "seek" in category_lower or "ask" in category_lower:
        return "information_seeking"
    if "buy" in category_lower or "purchase" in category_lower or "pricing" in category_lower or "cost" in category_lower:
        return "buying_intent"
    return "discussion"


def analyze_post(post: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    """Analyzes a single post and appends scoring metrics.

    Args:
        post: The dictionary representing a Reddit post.
        api_key: The Groq API key.

    Returns:
        The post dictionary updated with intent_score, confidence, category, reason, draft_reply, keywords, priority, recommended_action, processed_at, and lead_summary.
    """
    post_id = post.get("post_id", "unknown")
    title = post.get("title", "")
    body = post.get("body", "")

    logger.info(f"Analyzing post {post_id}: '{title[:40]}...'")
    
    # Return structure defaults if API fails
    scored_post = post.copy()
    try:
        analysis = call_groq_api(title, body, api_key)
        scored_post.update(analysis)
    except Exception as e:
        logger.error(f"Failed to analyze post {post_id}: {e}")
        scored_post.update({
            "intent_score": 0,
            "confidence": 0.0,
            "category": "discussion",
            "reason": f"Analysis failed due to error: {str(e)}",
            "draft_reply": "",
            "keywords": [],
            "lead_summary": ""
        })
        
    # Programmatically calculate priority and recommended action based on the intent_score
    score = scored_post.get("intent_score", 0)
    if 80 <= score <= 100:
        scored_post["priority"] = "high"
        scored_post["recommended_action"] = "reply_immediately"
    elif 60 <= score <= 79:
        scored_post["priority"] = "medium"
        scored_post["recommended_action"] = "monitor"
    else:
        scored_post["priority"] = "low"
        scored_post["recommended_action"] = "ignore"
        
    # Set the processing timestamp in UTC
    scored_post["processed_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
    return scored_post


def score_posts_file(input_path: str, output_path: str, api_key: str) -> List[Dict[str, Any]]:
    """Reads posts from input_path, analyzes each, and writes to output_path.

    Args:
        input_path: Path to the input JSON file containing posts.
        output_path: Path to write the output JSON file.
        api_key: The Groq API key.

    Returns:
        The list of scored posts.
    """
    logger.info(f"Reading posts from {input_path}")
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            posts = json.load(f)
    except FileNotFoundError:
        logger.error(f"Input file {input_path} not found.")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from {input_path}: {e}")
        raise

    if not isinstance(posts, list):
        raise ValueError(f"Input file {input_path} must contain a list of posts.")

    scored_posts = []
    for post in posts:
        scored = analyze_post(post, api_key)
        scored_posts.append(scored)
        # Gentle rate limit avoidance delay
        time.sleep(0.5)

    logger.info(f"Writing {len(scored_posts)} scored posts to {output_path}")
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(scored_posts, f, indent=4, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to write scored posts to {output_path}: {e}")
        raise

    return scored_posts


def main():
    """Main execution block when run as a script."""
    input_file = "sample_posts.json"
    output_file = "scored_posts.json"
    
    # Fallback to reddit_posts.json if sample_posts.json is not present
    if not os.path.exists(input_file) and os.path.exists("reddit_posts.json"):
        input_file = "reddit_posts.json"

    logger.info("Initializing Reddit Scorer")
    try:
        api_key = load_config()
        score_posts_file(input_file, output_file, api_key)
        logger.info("Scoring pipeline completed successfully.")
    except Exception as e:
        logger.error(f"Scoring pipeline failed: {e}")
        exit(1)


if __name__ == "__main__":
    main()
