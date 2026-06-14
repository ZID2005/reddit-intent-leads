import json
import logging
from typing import Any, Dict, List, Optional
import requests

logger = logging.getLogger(__name__)


class RedditScraperError(Exception):
    """Base exception class for errors during Reddit scraping."""

    pass


class RedditScraper:
    """A scraper to retrieve posts from Reddit subreddits using JSON feeds."""

    def __init__(self, user_agent: Optional[str] = None):
        """Initializes the Reddit scraper with a User-Agent header.

        Args:
            user_agent: Optional custom User-Agent string. If not provided,
              a default descriptive one is used.
        """
        # A custom User-Agent is required because Reddit returns HTTP 429
        # (Too Many Requests) for default library User-Agents (like python-requests).
        self.user_agent = (
            user_agent
            or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
        )
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": self.user_agent,
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
        })

    def scrape(
        self,
        subreddit: str,
        limit: int = 25,
        feed_type: str = "hot",
        timeout: float = 10.0,
    ) -> List[Dict[str, Any]]:
        """Scrapes posts from a specific subreddit's JSON feed.

        Args:
            subreddit: The name of the subreddit to scrape (e.g. 'Python',
              'solopreneur').
            limit: The maximum number of posts to retrieve (Reddit maximum is
              100).
            feed_type: The feed sort type ('hot', 'new', 'top', 'rising').
            timeout: Timeout for the HTTP request in seconds.

        Returns:
            A list of dictionaries, where each dictionary represents a post
            containing:
                - post_id (str)
                - title (str)
                - body (str)
                - subreddit (str)
                - url (str)

        Raises:
            ValueError: If the parameters are invalid.
            RedditScraperError: If a request, timeout, or parsing error occurs.
        """
        if not subreddit or not isinstance(subreddit, str):
            raise ValueError("Subreddit name must be a non-empty string.")

        # Clean the subreddit name to avoid bad URLs (e.g. remove leading r/)
        clean_sub = subreddit.strip().lstrip("r/").split("/")[0]
        if not clean_sub:
            raise ValueError("Invalid subreddit name format.")

        valid_feeds = {"hot", "new", "top", "rising"}
        if feed_type not in valid_feeds:
            raise ValueError(
                f"feed_type must be one of {valid_feeds}. Got '{feed_type}'."
            )

        url = f"https://www.reddit.com/r/{clean_sub}/about.json"
        params = {"limit": limit}

        try:
            logger.info(
                f"Fetching {limit} posts from r/{clean_sub} ({feed_type} feed)..."
            )
            # 1. The Reddit request URL
            req = requests.Request("GET", url, params=params)
            prepared_url = req.prepare().url
            print(f"DEBUG: Request URL: {prepared_url}")

            # 2. Request headers
            print(f"DEBUG: Request headers: {dict(self.session.headers)}")

            response = self.session.get(url, params=params, timeout=timeout)

            # 3. HTTP status code
            print(f"DEBUG: HTTP Status Code: {response.status_code}")

            # First 300 characters of response text
            print(f"DEBUG: Response Text (first 300 chars): {response.text[:300]}")

            # Handle common Reddit HTTP errors explicitly for better context
            if response.status_code == 404:
                raise RedditScraperError(
                    f"Subreddit 'r/{clean_sub}' not found (404)."
                )
            elif response.status_code == 429:
                raise RedditScraperError(
                    "Reddit API rate limit exceeded (429). Try again later."
                )

            # Raise exceptions for other HTTP status codes (4xx, 5xx)
            response.raise_for_status()

            data = response.json()
        except requests.exceptions.Timeout as e:
            logger.error(
                f"Timeout occurred while connecting to r/{clean_sub}: {e}"
            )
            raise RedditScraperError(
                f"Request to Reddit timed out after {timeout} seconds."
            ) from e
        except requests.exceptions.RequestException as e:
            logger.error(
                f"Network error while connecting to r/{clean_sub}: {e}"
            )
            raise RedditScraperError(
                f"Failed to connect to Reddit JSON feed: {e}"
            ) from e
        except ValueError as e:
            logger.error(
                f"Failed to parse JSON response from r/{clean_sub}: {e}"
            )
            raise RedditScraperError(
                "Invalid response format from Reddit (failed to parse JSON)."
            ) from e

        # Extract post details from the Reddit API structure
        try:
            posts_list = data.get("data", {}).get("children", [])
            # 3. Number of posts found in the Reddit API response
            print(f"DEBUG: Number of posts in response for r/{clean_sub}: {len(posts_list)}")
        except AttributeError as e:
            logger.error(
                f"Unexpected JSON structure from Reddit response: {e}"
            )
            raise RedditScraperError(
                "Failed to parse Reddit response structure: missing 'data' or"
                " 'children'."
            ) from e

        scraped_posts = []
        for post in posts_list:
            post_data = post.get("data", {})
            if not post_data:
                continue

            # Construct the canonical URL to the Reddit discussion thread
            permalink = post_data.get("permalink")
            post_url = (
                f"https://www.reddit.com{permalink}"
                if permalink
                else post_data.get("url", "")
            )

            scraped_posts.append(
                {
                    "post_id": post_data.get("id", ""),
                    "title": post_data.get("title", ""),
                    "body": post_data.get("selftext", ""),
                    "subreddit": post_data.get("subreddit", clean_sub),
                    "url": post_url,
                }
            )

        # 4. Number of posts extracted into scraped_posts
        print(f"DEBUG: Number of posts extracted for r/{clean_sub}: {len(scraped_posts)}")

        logger.info(
            f"Successfully scraped {len(scraped_posts)} posts from"
            f" r/{clean_sub}."
        )
        return scraped_posts


def scrape_subreddit(
    subreddit: str,
    limit: int = 25,
    feed_type: str = "hot",
    timeout: float = 10.0,
    user_agent: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """A convenience function to scrape a subreddit using RedditScraper.

    Args:
        subreddit: The name of the subreddit.
        limit: The number of posts to retrieve.
        feed_type: The sorting feed type ('hot', 'new', etc.).
        timeout: Timeout for HTTP request.
        user_agent: Custom User-Agent string.

    Returns:
        List of dictionaries with post details.
    """
    scraper = RedditScraper(user_agent=user_agent)
    return scraper.scrape(
        subreddit=subreddit, limit=limit, feed_type=feed_type, timeout=timeout
    )


def main():
    scraper = RedditScraper()
    subreddits = ["SaaS", "smallbusiness", "startups", "entrepreneur", "marketing"]

    all_posts = []
    subreddit_counts = {}

    for sub in subreddits:
        try:
            posts = scraper.scrape(subreddit=sub, limit=10, feed_type="new")
            all_posts.extend(posts)
            subreddit_counts[sub] = len(posts)
        except RedditScraperError as e:
            # Print the error but continue scraping the other subreddits
            print(f"Error scraping r/{sub}: {e}")
            subreddit_counts[sub] = 0

    print(f"\nTotal posts collected: {len(all_posts)}")
    print("Posts per subreddit:")
    for sub, count in subreddit_counts.items():
        print(f"  r/{sub}: {count}")

    # Save all collected posts to reddit_posts.json in the project root
    output_filename = "reddit_posts.json"
    try:
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(all_posts, f, indent=4, ensure_ascii=False)
        print(f"\nSuccessfully saved all posts to '{output_filename}'.")
        # 5. Number of posts written to reddit_posts.json
        print(f"DEBUG: Number of posts written to {output_filename}: {len(all_posts)}")
    except Exception as e:
        print(f"\nFailed to save posts to '{output_filename}': {e}")

    if all_posts:
        print("\nSample of collected posts:")
        for i, post in enumerate(all_posts[:3], start=1):
            print(f"\nPost {i}")
            print(f"Title: {post['title']}")
            print(f"Subreddit: {post['subreddit']}")
            print(f"URL: {post['url']}")





if __name__ == "__main__":
    main()

