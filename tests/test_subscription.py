import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
import backend.subscription_service as sub_service

class TestSubscriptionService(unittest.TestCase):
    def setUp(self):
        # Reset the in-memory fallback dicts before each test
        sub_service._IN_MEMORY_SUBSCRIPTIONS.clear()
        sub_service._IN_MEMORY_USAGE.clear()
        sub_service._IN_MEMORY_DAILY_USAGE.clear()

    @patch("backend.subscription_service.get_supabase_client")
    def test_get_user_plan_default_free(self, mock_get_client):
        # Mock supabase execution to raise a PGRST205 error to force the resilient fallback
        mock_client = MagicMock()
        mock_client.table.side_effect = Exception("PGRST205: relation subscriptions does not exist")
        mock_get_client.return_value = mock_client

        plan = sub_service.get_user_plan("test_user_123")
        self.assertEqual(plan, "free")

    @patch("backend.subscription_service.get_supabase_client")
    def test_increment_usage_and_limits(self, mock_get_client):
        # Force fallback
        mock_client = MagicMock()
        mock_client.table.side_effect = Exception("PGRST205: relation does not exist")
        mock_get_client.return_value = mock_client

        user_id = "test_user_limits"
        
        # Default plan is free, they should be able to generate outreach and export CSV initially
        self.assertTrue(sub_service.can_generate_outreach(user_id))
        self.assertTrue(sub_service.can_export_csv(user_id))
        self.assertFalse(sub_service.can_view_unlimited_leads(user_id))

        # Increment AI generations 5 times
        for _ in range(5):
            self.assertTrue(sub_service.can_generate_outreach(user_id))
            sub_service.increment_usage(user_id, "ai_generations")

        # Now they should be blocked
        self.assertFalse(sub_service.can_generate_outreach(user_id))

        # Increment CSV exports 2 times
        for _ in range(2):
            self.assertTrue(sub_service.can_export_csv(user_id))
            sub_service.increment_usage(user_id, "csv_exports")

        # Now they should be blocked
        self.assertFalse(sub_service.can_export_csv(user_id))

    @patch("backend.subscription_service.get_supabase_client")
    def test_pro_plan_unlimited(self, mock_get_client):
        # Force fallback
        mock_client = MagicMock()
        mock_client.table.side_effect = Exception("PGRST205: relation does not exist")
        mock_get_client.return_value = mock_client

        user_id = "test_user_pro"
        # Set user as Pro in-memory
        sub_service._IN_MEMORY_SUBSCRIPTIONS[user_id] = {
            "plan": "pro",
            "status": "active"
        }

        self.assertEqual(sub_service.get_user_plan(user_id), "pro")
        self.assertTrue(sub_service.can_view_unlimited_leads(user_id))

        # Increment usage past the free limits
        for _ in range(10):
            self.assertTrue(sub_service.can_generate_outreach(user_id))
            sub_service.increment_usage(user_id, "ai_generations")
            
        for _ in range(5):
            self.assertTrue(sub_service.can_export_csv(user_id))
            sub_service.increment_usage(user_id, "csv_exports")

        # Pro should still have access
        self.assertTrue(sub_service.can_generate_outreach(user_id))
        self.assertTrue(sub_service.can_export_csv(user_id))

if __name__ == "__main__":
    unittest.main()
