from django.test import TestCase

# فعلاً تست خاصی ننوشتم؛ وقتی APIها کامل پایدار شد،
# می‌تونیم برای submit/list/detail تست‌های کامل اضافه کنیم.
class OrdersSmokeTest(TestCase):
    def test_ok(self):
        self.assertTrue(True)
