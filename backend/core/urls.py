from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import TokenRefreshView
from core.views import RegisterAPIView, CustomTokenObtainPairView

urlpatterns = [
    path("admin/", admin.site.urls),

    # ✅ محصولات و دسته‌بندی‌ها
    path("api/", include("products.urls")),

    # ✅ credit
    path("api/", include("credit.urls")),

    # ✅ orders
    path("api/orders/", include("orders.urls")),

    # ✅ ثبت نام
    path("api/register/", RegisterAPIView.as_view(), name="register"),

    # ✅ لاگین JWT
    path("api/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),

    # ✅ رفرش توکن
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
