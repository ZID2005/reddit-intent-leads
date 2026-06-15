import unittest
from unittest.mock import MagicMock, patch
import json
import requests

from app.scorer import (
    load_config,
    call_groq_api,
    get_fallback_category,
    analyze_post,
    score_posts_file,
    GroqScorerError
)


class TestRedditScorer(unittest.TestCase):

    @patch("app.scorer.os.getenv")
    @patch("app.scorer.load_dotenv")
    def test_load_config_success(self, mock_load_dotenv, mock_getenv):
        mock_getenv.return_value = "gsk_test_api_key_12345"
        key = load_config()
        self.assertEqual(key, "gsk_test_api_key_12345")
        mock_load_dotenv.assert_called_once()

    @patch("app.scorer.os.getenv")
    @patch("app.scorer.load_dotenv")
    def test_load_config_missing(self, mock_load_dotenv, mock_getenv):
        mock_getenv.return_value = None
        with self.assertRaises(ValueError):
            load_config()

        mock_getenv.return_value = "   "
        with self.assertRaises(ValueError):
            load_config()

    @patch("app.scorer.requests.post")
    def test_call_groq_api_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps({
                            "intent_score": 85,
                            "confidence": 0.95,
                            "category": "buying_intent",
                            "reason": "Clear request for recommendations to buy a CRM tool.",
                            "draft_reply": "Hi! You might want to look into HubSpot or Salesforce.",
                            "keywords": ["crm", "buy", "recommendation"],
                            "lead_summary": "Looking to buy a CRM tool for small business."
                        })
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        result = call_groq_api("Test Title", "Test Body", "mock_key")
        self.assertEqual(result["intent_score"], 85)
        self.assertEqual(result["confidence"], 0.95)
        self.assertEqual(result["category"], "buying_intent")
        self.assertEqual(result["reason"], "Clear request for recommendations to buy a CRM tool.")
        self.assertEqual(result["draft_reply"], "Hi! You might want to look into HubSpot or Salesforce.")
        self.assertEqual(result["keywords"], ["crm", "buy", "recommendation"])
        self.assertEqual(result["lead_summary"], "Looking to buy a CRM tool for small business.")

    @patch("app.scorer.time.sleep")  # Avoid sleeping during tests
    @patch("app.scorer.requests.post")
    def test_call_groq_api_retry_then_success(self, mock_post, mock_sleep):
        # First call: Rate limit 429
        mock_resp_429 = MagicMock()
        mock_resp_429.status_code = 429

        # Second call: Success 200
        mock_resp_200 = MagicMock()
        mock_resp_200.status_code = 200
        mock_resp_200.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps({
                            "intent_score": 60,
                            "confidence": 0.8,
                            "category": "comparison",
                            "reason": "Comparing tools.",
                            "draft_reply": "Here is a comparison...",
                            "keywords": ["stripe", "paddle"],
                            "lead_summary": "Comparing payment gateways Stripe and Paddle."
                        })
                    }
                }
            ]
        }

        mock_post.side_effect = [mock_resp_429, mock_resp_200]

        result = call_groq_api("Compare title", "Compare body", "mock_key")
        self.assertEqual(result["intent_score"], 60)
        self.assertEqual(result["confidence"], 0.8)
        self.assertEqual(result["category"], "comparison")
        self.assertEqual(result["keywords"], ["stripe", "paddle"])
        self.assertEqual(result["lead_summary"], "Comparing payment gateways Stripe and Paddle.")
        self.assertEqual(mock_post.call_count, 2)
        mock_sleep.assert_called_once()

    @patch("app.scorer.time.sleep")
    @patch("app.scorer.requests.post")
    def test_call_groq_api_all_attempts_fail(self, mock_post, mock_sleep):
        # Mock connection error
        mock_post.side_effect = requests.RequestException("Connection timed out")

        with self.assertRaises(GroqScorerError):
            call_groq_api("Title", "Body", "mock_key")

        self.assertEqual(mock_post.call_count, 5)

    @patch("app.scorer.requests.post")
    def test_call_groq_api_invalid_json(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "Not a JSON string at all"
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        # Note: Since the JSON decoding fails, call_groq_api raises a GroqScorerError
        # after exhausting max retries. Let's patch time.sleep to run quickly.
        with patch("app.scorer.time.sleep"):
            with self.assertRaises(GroqScorerError):
                call_groq_api("Title", "Body", "mock_key")

    @patch("app.scorer.requests.post")
    def test_call_groq_api_missing_keys(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps({
                            "intent_score": 85,
                            # category and reason are missing
                            "draft_reply": "Hello"
                        })
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        with patch("app.scorer.time.sleep"):
            with self.assertRaises(GroqScorerError):
                call_groq_api("Title", "Body", "mock_key")

    def test_get_fallback_category(self):
        self.assertEqual(get_fallback_category("buying-intent"), "buying_intent")
        self.assertEqual(get_fallback_category("seeking info"), "information_seeking")
        self.assertEqual(get_fallback_category("some random text"), "discussion")

    @patch("app.scorer.call_groq_api")
    def test_analyze_post_success(self, mock_call_api):
        mock_call_api.return_value = {
            "intent_score": 90,
            "confidence": 0.88,
            "category": "buying_intent",
            "reason": "Wants to buy something.",
            "draft_reply": "Reach out to them.",
            "keywords": ["buy", "crm"],
            "lead_summary": "Looking to buy CRM tool."
        }

        post = {
            "post_id": "abc_123",
            "title": "Buying CRM",
            "body": "Need a CRM now"
        }

        result = analyze_post(post, "mock_key")
        self.assertEqual(result["post_id"], "abc_123")
        self.assertEqual(result["intent_score"], 90)
        self.assertEqual(result["confidence"], 0.88)
        self.assertEqual(result["category"], "buying_intent")
        self.assertEqual(result["reason"], "Wants to buy something.")
        self.assertEqual(result["draft_reply"], "Reach out to them.")
        self.assertEqual(result["keywords"], ["buy", "crm"])
        self.assertEqual(result["priority"], "high")
        self.assertEqual(result["recommended_action"], "reply_immediately")
        self.assertEqual(result["lead_summary"], "Looking to buy CRM tool.")
        self.assertIn("processed_at", result)

    @patch("app.scorer.call_groq_api")
    def test_analyze_post_failure_fallback(self, mock_call_api):
        mock_call_api.side_effect = GroqScorerError("API down")

        post = {
            "post_id": "xyz_789",
            "title": "Buying CRM",
            "body": "Need a CRM now"
        }

        result = analyze_post(post, "mock_key")
        self.assertEqual(result["post_id"], "xyz_789")
        self.assertEqual(result["intent_score"], 0)
        self.assertEqual(result["confidence"], 0.0)
        self.assertEqual(result["category"], "discussion")
        self.assertIn("Analysis failed due to error", result["reason"])
        self.assertEqual(result["draft_reply"], "")
        self.assertEqual(result["keywords"], [])
        self.assertEqual(result["priority"], "low")
        self.assertEqual(result["recommended_action"], "ignore")
        self.assertEqual(result["lead_summary"], "")
        self.assertIn("processed_at", result)

    @patch("app.scorer.analyze_post")
    @patch("builtins.open")
    @patch("app.scorer.json.load")
    @patch("app.scorer.json.dump")
    def test_score_posts_file(self, mock_dump, mock_load, mock_open, mock_analyze):
        mock_load.return_value = [
            {"post_id": "1", "title": "T1", "body": "B1"}
        ]
        mock_analyze.return_value = {
            "post_id": "1", "title": "T1", "body": "B1",
            "intent_score": 75, "confidence": 0.77, "category": "comparison",
            "reason": "Reason 1", "draft_reply": "Reply 1", "keywords": ["t1"],
            "priority": "medium", "recommended_action": "monitor",
            "processed_at": "2026-06-15T10:30:00Z", "lead_summary": "S1"
        }

        # Mocking time.sleep inside score_posts_file to speed up execution
        with patch("app.scorer.time.sleep"):
            results = score_posts_file("input.json", "output.json", "mock_key")

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["intent_score"], 75)
        self.assertEqual(results[0]["confidence"], 0.77)
        self.assertEqual(results[0]["keywords"], ["t1"])
        self.assertEqual(results[0]["priority"], "medium")
        self.assertEqual(results[0]["recommended_action"], "monitor")
        self.assertEqual(results[0]["processed_at"], "2026-06-15T10:30:00Z")
        self.assertEqual(results[0]["lead_summary"], "S1")
        mock_load.assert_called_once()
        mock_dump.assert_called_once()
        mock_analyze.assert_called_once()


if __name__ == "__main__":
    unittest.main()
