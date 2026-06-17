import logging
import os
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


class SupabaseDatabaseError(Exception):
    """Exception class for database operations errors."""
    pass


class DatabaseManager:
    """Manages database operations with Supabase for Reddit posts."""

    def __init__(self, client: Optional[Client] = None):
        """Initializes the DatabaseManager.

        If a Client is not provided, it will initialize one using environment credentials.

        Raises:
            ValueError: If SUPABASE_URL or SUPABASE_KEY is missing from environment.
            SupabaseDatabaseError: If connection initialization fails.
        """
        if client:
            self.client = client
        else:
            self.client = self._init_client()
        self.table_name = "posts"

    def _init_client(self) -> Client:
        """Loads credentials from .env and initializes the client."""
        load_dotenv()
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")

        if not url or not url.strip():
            logger.error("SUPABASE_URL is missing from environment or empty.")
            raise ValueError("SUPABASE_URL environment variable is required.")
        
        if not key or not key.strip():
            logger.error("SUPABASE_KEY is missing from environment or empty.")
            raise ValueError("SUPABASE_KEY environment variable is required.")

        try:
            return create_client(url.strip(), key.strip())
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise SupabaseDatabaseError("Could not initialize Supabase connection.") from e

    def lead_exists(self, post_id: str) -> bool:
        """Checks if a post with the given post_id already exists in the table.

        Args:
            post_id: The unique Reddit post identifier.

        Returns:
            True if the post exists, False otherwise.

        Raises:
            ValueError: If post_id is empty.
            SupabaseDatabaseError: If any database error occurs.
        """
        if not post_id or not isinstance(post_id, str) or not post_id.strip():
            raise ValueError("post_id must be a non-empty string.")

        try:
            logger.info(f"Checking if post {post_id} exists in table '{self.table_name}'...")
            response = (
                self.client.table(self.table_name)
                .select("post_id")
                .eq("post_id", post_id)
                .execute()
            )
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error checking existence for post {post_id}: {e}")
            raise SupabaseDatabaseError(f"Database query failed for post {post_id}.") from e

    def insert_lead(self, lead: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a scored post into the table.

        Args:
            lead: A dictionary containing scored lead details.

        Returns:
            The inserted lead record from the database.

        Raises:
            ValueError: If lead is missing required fields.
            SupabaseDatabaseError: If any database error occurs.
        """
        if not lead or not isinstance(lead, dict):
            raise ValueError("Lead data must be a valid dictionary.")

        required_fields = {"post_id", "title"}
        missing = required_fields - lead.keys()
        if missing:
            raise ValueError(f"Lead data is missing required fields: {missing}")

        # Prune lead dictionary to only contain database columns
        db_columns = {
            "post_id", "title", "body", "subreddit", "url", 
            "intent_score", "confidence", "priority", "category", 
            "recommended_action", "reason", "draft_reply", "keywords", 
            "processed_at", "lead_summary"
        }
        
        lead_data = {k: v for k, v in lead.items() if k in db_columns}
        post_id = lead_data["post_id"]

        try:
            logger.info(f"Inserting post {post_id} into table '{self.table_name}'...")
            response = self.client.table(self.table_name).insert(lead_data).execute()
            
            if not response.data:
                logger.error(f"No data returned after inserting post {post_id}.")
                raise SupabaseDatabaseError(f"Failed to insert post {post_id} (empty response).")
                
            logger.info(f"Successfully inserted post {post_id}.")
            return response.data[0]
        except Exception as e:
            logger.error(f"Error inserting post {post_id}: {e}")
            raise SupabaseDatabaseError(f"Failed to insert post {post_id} into database.") from e

    def get_all_leads(self) -> List[Dict[str, Any]]:
        """Retrieves all leads from the database sorted by intent_score descending.

        Returns:
            A list of post records from the database.

        Raises:
            SupabaseDatabaseError: If any database error occurs.
        """
        try:
            logger.info(f"Fetching all posts from table '{self.table_name}'...")
            response = self.client.table(self.table_name).select("*").order("intent_score", desc=True).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching all posts: {e}")
            raise SupabaseDatabaseError("Failed to retrieve posts from database.") from e

    def delete_lead(self, post_id: str) -> bool:
        """Deletes a post by post_id from the database.

        Args:
            post_id: The unique post identifier to delete.

        Returns:
            True if the deletion request completed and deleted at least one row, False otherwise.

        Raises:
            ValueError: If post_id is empty.
            SupabaseDatabaseError: If any database error occurs.
        """
        if not post_id or not isinstance(post_id, str) or not post_id.strip():
            raise ValueError("post_id must be a non-empty string.")

        try:
            logger.info(f"Deleting post {post_id} from table '{self.table_name}'...")
            response = self.client.table(self.table_name).delete().eq("post_id", post_id).execute()
            
            deleted_count = len(response.data) if response.data else 0
            logger.info(f"Deleted {deleted_count} rows for post_id {post_id}.")
            return deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting post {post_id}: {e}")
            raise SupabaseDatabaseError(f"Failed to delete post {post_id} from database.") from e
