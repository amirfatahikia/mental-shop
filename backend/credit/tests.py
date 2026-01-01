from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient


class CreditSmokeTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="test", password="12345678")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_profile_works(self):
        res = self.client.get("/api/user-profile/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("wallet_balance", res.data)

    def test_addresses_empty(self):
        res = self.client.get("/api/user-addresses/")
        self.assertEqual(res.status_code, 200)
