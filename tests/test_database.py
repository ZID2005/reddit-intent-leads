import unittest
from unittest.mock import MagicMock, patch
from app.database import (
    DatabaseManager,
    SupabaseDatabaseError
)


class TestRedditDatabase(unittest.TestCase):

    @patch("app.database.os.getenv")
    @patch("app.database.load_dotenv")
    def test_init_manager_success(self, mock_load_dotenv, mock_getenv):
        mock_getenv.side_effect = lambda key: {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-anon-key"
        }.get(key)

        with patch("app.database.create_client") as mock_create_client:
            mock_client = MagicMock()
            mock_create_client.return_value = mock_client
            
            manager = DatabaseManager()
            
            self.assertEqual(manager.client, mock_client)
            self.assertEqual(manager.table_name, "posts")
            mock_create_client.assert_called_once_with("https://test.supabase.co", "test-anon-key")
            mock_load_dotenv.assert_called_once()

    @patch("app.database.os.getenv")
    @patch("app.database.load_dotenv")
    def test_init_manager_missing_url(self, mock_load_dotenv, mock_getenv):
        mock_getenv.side_effect = lambda key: {
            "SUPABASE_URL": None,
            "SUPABASE_KEY": "test-anon-key"
        }.get(key)

        with self.assertRaises(ValueError):
            DatabaseManager()

    @patch("app.database.os.getenv")
    @patch("app.database.load_dotenv")
    def test_init_manager_missing_key(self, mock_load_dotenv, mock_getenv):
        mock_getenv.side_effect = lambda key: {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": ""
        }.get(key)

        with self.assertRaises(ValueError):
            DatabaseManager()

    @patch("app.database.os.getenv")
    @patch("app.database.load_dotenv")
    def test_init_manager_init_error(self, mock_load_dotenv, mock_getenv):
        mock_getenv.side_effect = lambda key: {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-anon-key"
        }.get(key)

        with patch("app.database.create_client") as mock_create_client:
            mock_create_client.side_effect = Exception("Connection refused")
            
            with self.assertRaises(SupabaseDatabaseError):
                DatabaseManager()

    def test_lead_exists_true(self):
        mock_client = MagicMock()
        mock_table = mock_client.table.return_value
        mock_select = mock_table.select.return_value
        mock_eq = mock_select.eq.return_value
        mock_response = mock_eq.execute.return_value
        mock_response.data = [{"post_id": "123"}]

        manager = DatabaseManager(client=mock_client)
        exists = manager.lead_exists("123")
        
        self.assertTrue(exists)
        mock_client.table.assert_called_once_with("posts")
        mock_table.select.assert_called_once_with("post_id")
        mock_select.eq.assert_called_once_with("post_id", "123")

    def test_lead_exists_false(self):
        mock_client = MagicMock()
        mock_table = mock_client.table.return_value
        mock_select = mock_table.select.return_value
        mock_eq = mock_select.eq.return_value
        mock_response = mock_eq.execute.return_value
        mock_response.data = []

        manager = DatabaseManager(client=mock_client)
        exists = manager.lead_exists("123")
        
        self.assertFalse(exists)

    def test_lead_exists_invalid_post_id(self):
        mock_client = MagicMock()
        manager = DatabaseManager(client=mock_client)
        with self.assertRaises(ValueError):
            manager.lead_exists("")
        with self.assertRaises(ValueError):
            manager.lead_exists(None)

    def test_lead_exists_database_error(self):
        mock_client = MagicMock()
        mock_client.table.side_effect = Exception("Database is locked")

        manager = DatabaseManager(client=mock_client)
        with self.assertRaises(SupabaseDatabaseError):
            manager.lead_exists("123")

    def test_insert_lead_success(self):
        mock_client = MagicMock()
        mock_table = mock_client.table.return_value
        mock_insert = mock_table.insert.return_value
        mock_response = mock_insert.execute.return_value
        mock_response.data = [{"post_id": "123", "title": "CRM Tool"}]

        lead_to_insert = {
            "post_id": "123",
            "title": "CRM Tool",
            "body": "Need a CRM",
            "intent_score": 90,
            "extra_unsupported_field": "ignore_me"
        }

        manager = DatabaseManager(client=mock_client)
        inserted = manager.insert_lead(lead_to_insert)
        
        self.assertEqual(inserted["post_id"], "123")
        self.assertEqual(inserted["title"], "CRM Tool")
        
        expected_arg = {
            "post_id": "123",
            "title": "CRM Tool",
            "body": "Need a CRM",
            "intent_score": 90
        }
        mock_client.table.assert_called_once_with("posts")
        mock_table.insert.assert_called_once_with(expected_arg)

    def test_insert_lead_missing_required(self):
        mock_client = MagicMock()
        manager = DatabaseManager(client=mock_client)
        # Missing post_id
        with self.assertRaises(ValueError):
            manager.insert_lead({"title": "CRM Tool"})
        # Missing title
        with self.assertRaises(ValueError):
            manager.insert_lead({"post_id": "123"})

    def test_insert_lead_db_error(self):
        mock_client = MagicMock()
        mock_table = mock_client.table.return_value
        mock_table.insert.side_effect = Exception("Primary key conflict")

        manager = DatabaseManager(client=mock_client)
        with self.assertRaises(SupabaseDatabaseError):
            manager.insert_lead({"post_id": "123", "title": "T1"})

    def test_get_all_leads_success(self):
        mock_client = MagicMock()
        mock_table = mock_client.table.return_value
        mock_select = mock_table.select.return_value
        mock_order = mock_select.order.return_value
        mock_response = mock_order.execute.return_value
        mock_response.data = [
            {"post_id": "1", "intent_score": 95},
            {"post_id": "2", "intent_score": 80}
        ]

        manager = DatabaseManager(client=mock_client)
        leads = manager.get_all_leads()
        
        self.assertEqual(len(leads), 2)
        self.assertEqual(leads[0]["post_id"], "1")
        mock_client.table.assert_called_once_with("posts")
        mock_table.select.assert_called_once_with("*")
        mock_select.order.assert_called_once_with("intent_score", desc=True)

    def test_get_all_leads_db_error(self):
        mock_client = MagicMock()
        mock_client.table.side_effect = Exception("Read timeout")

        manager = DatabaseManager(client=mock_client)
        with self.assertRaises(SupabaseDatabaseError):
            manager.get_all_leads()

    def test_delete_lead_success_true(self):
        mock_client = MagicMock()
        mock_table = mock_client.table.return_value
        mock_delete = mock_table.delete.return_value
        mock_eq = mock_delete.eq.return_value
        mock_response = mock_eq.execute.return_value
        mock_response.data = [{"post_id": "123"}]

        manager = DatabaseManager(client=mock_client)
        success = manager.delete_lead("123")
        
        self.assertTrue(success)
        mock_client.table.assert_called_once_with("posts")
        mock_table.delete.assert_called_once()
        mock_delete.eq.assert_called_once_with("post_id", "123")

    def test_delete_lead_success_false(self):
        mock_client = MagicMock()
        mock_table = mock_client.table.return_value
        mock_delete = mock_table.delete.return_value
        mock_eq = mock_delete.eq.return_value
        mock_response = mock_eq.execute.return_value
        mock_response.data = []

        manager = DatabaseManager(client=mock_client)
        success = manager.delete_lead("123")
        
        self.assertFalse(success)

    def test_delete_lead_invalid_post_id(self):
        mock_client = MagicMock()
        manager = DatabaseManager(client=mock_client)
        with self.assertRaises(ValueError):
            manager.delete_lead("")
        with self.assertRaises(ValueError):
            manager.delete_lead(None)

    def test_delete_lead_db_error(self):
        mock_client = MagicMock()
        mock_client.table.side_effect = Exception("Connection refused")

        manager = DatabaseManager(client=mock_client)
        with self.assertRaises(SupabaseDatabaseError):
            manager.delete_lead("123")


if __name__ == "__main__":
    unittest.main()
