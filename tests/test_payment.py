import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta

# Import the FastAPI app and subscription/payment state
from backend.app_entry import app
import backend.subscription_service as sub_service
import backend.payment_router as payment_router

class TestPaymentRouter(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Clear in-memory fallbacks
        sub_service._IN_MEMORY_SUBSCRIPTIONS.clear()
        
        # Setup mock for Razorpay client and keys
        self.patcher_key_id = patch("backend.payment_router.RAZORPAY_KEY_ID", "rzp_test_key_id")
        self.patcher_key_secret = patch("backend.payment_router.RAZORPAY_KEY_SECRET", "rzp_test_secret")
        
        self.mock_key_id = self.patcher_key_id.start()
        self.mock_key_secret = self.patcher_key_secret.start()
        
        # Create a mock razorpay client
        self.mock_rz_client = MagicMock()
        payment_router.razorpay_client = self.mock_rz_client

    def tearDown(self):
        self.patcher_key_id.stop()
        self.patcher_key_secret.stop()

    def test_create_order_unauthorized(self):
        response = self.client.post("/api/payments/create-order", json={"plan": "pro"})
        self.assertEqual(response.status_code, 401)
        self.assertIn("Header 'X-User-Id' is missing.", response.json()["detail"])

    def test_create_order_invalid_plan(self):
        response = self.client.post(
            "/api/payments/create-order",
            json={"plan": "enterprise"},
            headers={"X-User-Id": "user_123"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only 'pro' plan upgrades are supported", response.json()["detail"])

    def test_create_order_already_pro(self):
        # Set user as Pro in memory
        sub_service._IN_MEMORY_SUBSCRIPTIONS["user_already_pro"] = {
            "plan": "pro",
            "status": "active"
        }
        
        response = self.client.post(
            "/api/payments/create-order",
            json={"plan": "pro"},
            headers={"X-User-Id": "user_already_pro"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("already subscribed to the Pro plan", response.json()["detail"])

    def test_create_order_success(self):
        # Setup mock order create return value
        self.mock_rz_client.order.create.return_value = {"id": "order_XYZ123"}
        
        response = self.client.post(
            "/api/payments/create-order",
            json={"plan": "pro"},
            headers={"X-User-Id": "user_free"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["key"], "rzp_test_key_id")
        self.assertEqual(data["order_id"], "order_XYZ123")
        self.assertEqual(data["amount"], 69900)
        self.assertEqual(data["currency"], "INR")
        
        # Verify Razorpay order.create was called with correct data
        self.mock_rz_client.order.create.assert_called_once()
        args, kwargs = self.mock_rz_client.order.create.call_args
        sent_data = kwargs.get("data") or args[0]
        self.assertEqual(sent_data["amount"], 69900)
        self.assertEqual(sent_data["currency"], "INR")
        self.assertEqual(sent_data["notes"]["user_id"], "user_free")

    def test_verify_payment_unauthorized(self):
        response = self.client.post(
            "/api/payments/verify",
            json={
                "razorpay_order_id": "order_XYZ",
                "razorpay_payment_id": "pay_XYZ",
                "razorpay_signature": "sig_XYZ"
            }
        )
        self.assertEqual(response.status_code, 401)

    def test_verify_payment_invalid_signature(self):
        # Mock verify_payment_signature to raise an error
        self.mock_rz_client.utility.verify_payment_signature.side_effect = Exception("Signature mismatch")
        
        response = self.client.post(
            "/api/payments/verify",
            json={
                "razorpay_order_id": "order_XYZ",
                "razorpay_payment_id": "pay_XYZ",
                "razorpay_signature": "sig_XYZ"
            },
            headers={"X-User-Id": "user_free"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid payment signature.", response.json()["detail"])

    @patch("backend.payment_router.get_supabase_client")
    def test_verify_payment_success(self, mock_get_db):
        # Mock verify_payment_signature to return successfully (default behavior of mock is to return mock/no error)
        self.mock_rz_client.utility.verify_payment_signature.return_value = True
        
        # Mock Supabase to raise exception to trigger resilient fallback (in-memory)
        mock_db = MagicMock()
        mock_db.table.side_effect = Exception("PGRST205: table subscriptions not found")
        mock_get_db.return_value = mock_db

        user_id = "user_to_upgrade"
        response = self.client.post(
            "/api/payments/verify",
            json={
                "razorpay_order_id": "order_XYZ",
                "razorpay_payment_id": "pay_XYZ",
                "razorpay_signature": "sig_XYZ"
            },
            headers={"X-User-Id": user_id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True, "plan": "pro"})
        
        # Check in-memory state upgraded
        self.assertIn(user_id, sub_service._IN_MEMORY_SUBSCRIPTIONS)
        sub_info = sub_service._IN_MEMORY_SUBSCRIPTIONS[user_id]
        self.assertEqual(sub_info["plan"], "pro")
        self.assertEqual(sub_info["status"], "active")
        self.assertEqual(sub_info["razorpay_payment_id"], "pay_XYZ")
        self.assertIsNotNone(sub_info["expires_at"])

    def test_get_status_unauthorized(self):
        response = self.client.get("/api/payments/status")
        self.assertEqual(response.status_code, 401)

    def test_get_status_default_free(self):
        response = self.client.get("/api/payments/status", headers={"X-User-Id": "user_unknown"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["plan"], "free")
        self.assertEqual(data["status"], "active")
        self.assertIsNone(data["expires_at"])

    def test_get_status_pro_in_memory(self):
        user_id = "user_pro_mem"
        expires_str = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        sub_service._IN_MEMORY_SUBSCRIPTIONS[user_id] = {
            "plan": "pro",
            "status": "active",
            "expires_at": expires_str
        }
        
        response = self.client.get("/api/payments/status", headers={"X-User-Id": user_id})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["plan"], "pro")
        self.assertEqual(data["status"], "active")
        self.assertEqual(data["expires_at"], expires_str)

if __name__ == "__main__":
    unittest.main()
