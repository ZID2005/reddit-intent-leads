import unittest
from unittest.mock import MagicMock, patch
import requests

from app.scraper import RedditScraper, RedditScraperError, scrape_subreddit


class TestRedditScraper(unittest.TestCase):

    def setUp(self):
        self.scraper = RedditScraper()

    @patch("app.scraper.requests.Session.get")
    def test_scrape_success(self, mock_get):
        # Set up mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "children": [
                    {
                        "data": {
                            "id": "abc123_post",
                            "title": "A scraper test",
                            "selftext": "This is the body content of the test post.",
                            "subreddit": "python",
                            "permalink": "/r/python/comments/abc123_post/a_scraper_test/",
                            "url": "https://www.reddit.com/r/python/comments/abc123_post/a_scraper_test/",
                        }
                    }
                ]
            }
        }
        mock_get.return_value = mock_response

        posts = self.scraper.scrape("python", limit=1)

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]["post_id"], "abc123_post")
        self.assertEqual(posts[0]["title"], "A scraper test")
        self.assertEqual(posts[0]["body"], "This is the body content of the test post.")
        self.assertEqual(posts[0]["subreddit"], "python")
        self.assertEqual(
            posts[0]["url"],
            "https://www.reddit.com/r/python/comments/abc123_post/a_scraper_test/",
        )

        # Verify query parameters and url
        mock_get.assert_called_once_with(
            "https://www.reddit.com/r/python/about.json",
            params={"limit": 1},
            timeout=10.0,
        )

    @patch("app.scraper.requests.Session.get")
    def test_scrape_404_error(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        with self.assertRaises(RedditScraperError) as context:
            self.scraper.scrape("nonexistent_sub")

        self.assertIn("not found (404)", str(context.exception))

    @patch("app.scraper.requests.Session.get")
    def test_scrape_429_error(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_get.return_value = mock_response

        with self.assertRaises(RedditScraperError) as context:
            self.scraper.scrape("python")

        self.assertIn("rate limit exceeded", str(context.exception))

    @patch("app.scraper.requests.Session.get")
    def test_scrape_timeout(self, mock_get):
        mock_get.side_effect = requests.exceptions.Timeout("Connection timed out")

        with self.assertRaises(RedditScraperError) as context:
            self.scraper.scrape("python")

        self.assertIn("timed out after 10.0 seconds", str(context.exception))

    @patch("app.scraper.requests.Session.get")
    def test_scrape_http_error(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 500
        # Trigger raise_for_status to raise HTTPError
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
            "500 Internal Server Error"
        )
        mock_get.return_value = mock_response

        with self.assertRaises(RedditScraperError) as context:
            self.scraper.scrape("python")

        self.assertIn("Failed to connect to Reddit JSON feed", str(context.exception))

    def test_invalid_arguments(self):
        with self.assertRaises(ValueError):
            self.scraper.scrape("")  # Empty subreddit

        with self.assertRaises(ValueError):
            self.scraper.scrape("python", feed_type="invalid_type")  # Invalid feed type

    @patch("app.scraper.requests.Session.get")
    def test_convenience_function(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": {"children": []}}
        mock_get.return_value = mock_response

        posts = scrape_subreddit("python", limit=5)
        self.assertEqual(posts, [])
        mock_get.assert_called_once_with(
            "https://www.reddit.com/r/python/about.json",
            params={"limit": 5},
            timeout=10.0,
        )


if __name__ == "__main__":
    unittest.main()
