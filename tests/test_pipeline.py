import unittest
from unittest.mock import patch, MagicMock, mock_open
import io
import json
from app.pipeline import main
from app.database import SupabaseDatabaseError


class TestPipeline(unittest.TestCase):

    @patch("app.pipeline.os.path.exists")
    @patch("sys.stdout", new_callable=io.StringIO)
    def test_main_input_file_not_found(self, mock_stdout, mock_exists):
        mock_exists.return_value = False
        
        main()
        
        output = mock_stdout.getvalue()
        self.assertIn("Error loading posts: Input file 'sample_posts.json' not found.", output)

    @patch("app.pipeline.os.path.exists")
    @patch("builtins.open", new_callable=mock_open, read_data='{"not_a": "list"}')
    @patch("sys.stdout", new_callable=io.StringIO)
    def test_main_input_file_not_list(self, mock_stdout, mock_file_open, mock_exists):
        mock_exists.return_value = True
        
        main()
        
        output = mock_stdout.getvalue()
        self.assertIn("Error loading posts: Expected a list of posts", output)

    @patch("app.pipeline.os.path.exists")
    @patch("builtins.open", new_callable=mock_open, read_data='[]')
    @patch("app.pipeline.DatabaseManager")
    @patch("sys.stdout", new_callable=io.StringIO)
    def test_main_db_manager_init_failure(self, mock_stdout, mock_db_manager, mock_file_open, mock_exists):
        mock_exists.return_value = True
        mock_db_manager.side_effect = Exception("DB Connection Refused")
        
        main()
        
        output = mock_stdout.getvalue()
        self.assertIn("Error initializing DatabaseManager: DB Connection Refused", output)

    @patch("app.pipeline.os.path.exists")
    @patch("builtins.open", new_callable=mock_open, read_data='[]')
    @patch("app.pipeline.DatabaseManager")
    @patch("app.pipeline.load_config")
    @patch("sys.stdout", new_callable=io.StringIO)
    def test_main_scorer_config_failure(self, mock_stdout, mock_load_config, mock_db_manager, mock_file_open, mock_exists):
        mock_exists.return_value = True
        mock_db_manager.return_value = MagicMock()
        mock_load_config.side_effect = ValueError("GROQ_API_KEY is missing")
        
        main()
        
        output = mock_stdout.getvalue()
        self.assertIn("Error loading Scorer configuration: GROQ_API_KEY is missing", output)

    @patch("app.pipeline.os.path.exists")
    @patch("builtins.open", new_callable=mock_open)
    @patch("app.pipeline.DatabaseManager")
    @patch("app.pipeline.load_config")
    @patch("app.pipeline.analyze_post")
    @patch("sys.stdout", new_callable=io.StringIO)
    def test_main_success_flow(self, mock_stdout, mock_analyze, mock_load_config, mock_db_manager, mock_file_open, mock_exists):
        mock_exists.return_value = True
        
        posts_data = [
            {"post_id": "post_1", "title": "CRM Recommendation"},
            {"post_id": "post_2", "title": "Stripe vs Paddle"},
            {"post_id": "post_3", "title": "Frustrated with tools"}
        ]
        mock_file_open.return_value.read.return_value = json.dumps(posts_data)
        
        mock_db = MagicMock()
        mock_db_manager.return_value = mock_db
        def mock_lead_exists(post_id):
            if post_id == "post_1":
                return True
            if post_id == "post_2":
                return False
            if post_id == "post_3":
                raise SupabaseDatabaseError("DB query failed")
            return False
        
        mock_db.lead_exists.side_effect = mock_lead_exists
        
        mock_analyze.side_effect = lambda post, api_key: {
            "post_1": {"post_id": "post_1", "title": "CRM Recommendation", "intent_score": 90},
            "post_2": {"post_id": "post_2", "title": "Stripe vs Paddle", "intent_score": 70},
            "post_3": {"post_id": "post_3", "title": "Frustrated with tools", "intent_score": 80}
        }.get(post["post_id"])
        
        mock_load_config.return_value = "mock_api_key"

        main()
        
        output = mock_stdout.getvalue()
        self.assertIn("Total posts loaded: 3", output)
        self.assertIn("Total posts scored: 3", output)
        self.assertIn("Total inserted: 1", output)
        self.assertIn("Total duplicates skipped: 1", output)
        
        mock_db.lead_exists.assert_any_call("post_1")
        mock_db.lead_exists.assert_any_call("post_2")
        mock_db.lead_exists.assert_any_call("post_3")
        mock_db.insert_lead.assert_called_once_with({"post_id": "post_2", "title": "Stripe vs Paddle", "intent_score": 70})

    @patch("app.pipeline.os.path.exists")
    @patch("builtins.open", new_callable=mock_open)
    @patch("app.pipeline.DatabaseManager")
    @patch("app.pipeline.load_config")
    @patch("sys.stdout", new_callable=io.StringIO)
    def test_main_missing_post_id(self, mock_stdout, mock_load_config, mock_db_manager, mock_file_open, mock_exists):
        mock_exists.return_value = True
        
        posts_data = [
            {"post_id": "post_1", "title": "Valid"},
            {"title": "Missing ID"}
        ]
        mock_file_open.return_value.read.return_value = json.dumps(posts_data)
        
        mock_db = MagicMock()
        mock_db_manager.return_value = mock_db
        mock_db.lead_exists.return_value = True
        mock_load_config.return_value = "mock_key"
        
        with patch("app.pipeline.analyze_post") as mock_analyze:
            mock_analyze.return_value = {"post_id": "post_1", "intent_score": 50}
            main()
            
        output = mock_stdout.getvalue()
        self.assertIn("Total posts loaded: 2", output)
        self.assertIn("Total posts scored: 1", output)
        self.assertIn("Total inserted: 0", output)
        self.assertIn("Total duplicates skipped: 1", output)


if __name__ == "__main__":
    unittest.main()
