import unittest
from unittest.mock import patch, MagicMock
import time
import requests

from backend.rss_collector import (
    collect_all,
    fetch_feed,
    _get_next_ua,
    _USER_AGENTS,
    clear_cache
)

class TestRSSCollector(unittest.TestCase):
    def setUp(self):
        clear_cache()
        # Reset UA counter and delay clock
        import backend.rss_collector
        backend.rss_collector._ua_index = 0
        backend.rss_collector._last_request_time = 0.0

    def test_ua_rotation(self):
        # We call _get_next_ua multiple times and verify rotation order
        ua1 = _get_next_ua()
        ua2 = _get_next_ua()
        ua3 = _get_next_ua()
        ua4 = _get_next_ua()
        
        self.assertEqual(ua1, _USER_AGENTS[0])
        self.assertEqual(ua2, _USER_AGENTS[1])
        self.assertEqual(ua3, _USER_AGENTS[2])
        self.assertEqual(ua4, _USER_AGENTS[0])

    @patch("backend.rss_collector.time.sleep")
    @patch("backend.rss_collector.requests.get")
    def test_rate_limiting_delay(self, mock_get, mock_sleep):
        # Setup mock responses
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = b"<rss><channel><title>SaaS</title></channel></rss>"
        mock_get.return_value = mock_resp

        # Trigger two rapid calls
        # The second call should cause a sleep since time hasn't elapsed
        fetch_feed("SaaS", limit=1)
        fetch_feed("startups", limit=1)

        self.assertTrue(mock_sleep.called)
        # Check that sleep was called with close to 2.0 seconds
        args, kwargs = mock_sleep.call_args_list[0]
        self.assertAlmostEqual(args[0], 2.0, delta=0.5)

    @patch("backend.rss_collector.time.sleep")
    @patch("backend.rss_collector.requests.get")
    def test_rss_retry_logic(self, mock_get, mock_sleep):
        # 1st attempt fails, 2nd attempt succeeds
        mock_fail = MagicMock()
        mock_fail.status_code = 500
        
        mock_ok = MagicMock()
        mock_ok.status_code = 200
        mock_ok.content = b"<rss><channel><item><title>Test Item</title><link>http://link</link></item></channel></rss>"
        
        mock_get.side_effect = [mock_fail, mock_ok]

        entries, status = fetch_feed("SaaS", limit=1)
        self.assertEqual(status, "succeeded after retry")
        self.assertEqual(len(entries), 1)
        # Ensure it slept 3 seconds between retries
        mock_sleep.assert_any_call(3.0)

    @patch("backend.rss_collector.time.sleep")
    @patch("backend.rss_collector.requests.get")
    def test_json_fallback(self, mock_get, mock_sleep):
        # RSS attempts 1 & 2 fail. JSON fallback succeeds.
        mock_fail = MagicMock()
        mock_fail.status_code = 500
        
        mock_json_ok = MagicMock()
        mock_json_ok.status_code = 200
        mock_json_ok.json.return_value = {
            "data": {
                "children": [
                    {
                        "data": {
                            "id": "12345",
                            "title": "JSON Fallback Title",
                            "selftext": "Fallback Body",
                            "permalink": "/r/SaaS/comments/12345/json_title/",
                            "author": "john_doe",
                            "created_utc": 1600000000
                        }
                    }
                ]
            }
        }
        
        mock_get.side_effect = [mock_fail, mock_fail, mock_json_ok]

        entries, status = fetch_feed("SaaS", limit=1)
        self.assertEqual(status, "succeeded via json fallback")
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["title"], "JSON Fallback Title")
        self.assertEqual(entries[0]["summary"], "Fallback Body")
        self.assertEqual(entries[0]["link"], "https://www.reddit.com/r/SaaS/comments/12345/json_title/")

    @patch("backend.rss_collector.time.sleep")
    @patch("backend.rss_collector.requests.get")
    def test_collect_all_report(self, mock_get, mock_sleep):
        # Let's test a complete collect_all with different statuses
        # Subreddit 1: succeeds first try
        # Subreddit 2: succeeds after retry
        # Subreddit 3: succeeds via JSON fallback
        # Subreddit 4: fails completely
        
        mock_ok = MagicMock()
        mock_ok.status_code = 200
        mock_ok.content = b"<rss><channel><title>Sub</title></channel></rss>"
        
        mock_fail = MagicMock()
        mock_fail.status_code = 500
        
        mock_json = MagicMock()
        mock_json.status_code = 200
        mock_json.json.return_value = {"data": {"children": []}}

        mock_get.side_effect = [
            # Sub 1 RSS Try 1
            mock_ok,
            # Sub 2 RSS Try 1 (fail)
            mock_fail,
            # Sub 2 RSS Try 2 (ok)
            mock_ok,
            # Sub 3 RSS Try 1 (fail)
            mock_fail,
            # Sub 3 RSS Try 2 (fail)
            mock_fail,
            # Sub 3 JSON (ok)
            mock_json,
            # Sub 4 RSS Try 1 (fail)
            mock_fail,
            # Sub 4 RSS Try 2 (fail)
            mock_fail,
            # Sub 4 JSON (fail)
            mock_fail
        ]

        subs = ["saas", "startups", "marketing", "freelance"]
        # Use patch to capture print output
        import io
        captured = io.StringIO()
        with patch("sys.stdout", new=captured), patch("backend.rss_collector.random.shuffle") as mock_shuffle:
            mock_shuffle.side_effect = lambda x: None  # Keep original order
            raw, counts, errors = collect_all(subreddits=subs)

        self.assertEqual(errors, 1) # Sub 4 failed completely
        
        report = captured.getvalue()
        self.assertIn("--- RSS REPORT ---", report)
        self.assertIn("Total feeds:                4", report)
        self.assertIn("Succeeded first try:        1", report)
        self.assertIn("Succeeded after retry:      1", report)
        self.assertIn("Succeeded via JSON fallback:1", report)
        self.assertIn("Failed completely:          1", report)
        self.assertIn("Success rate:               75%", report)
        self.assertIn("Failed subreddits:          freelance", report)


if __name__ == "__main__":
    unittest.main()
