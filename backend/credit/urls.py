from django.urls import path

from .views import (
    UserProfileAPIView,
    UserAddressListCreateAPIView,
    UserAddressDetailAPIView,
    MyCreditRequestsAPIView,
    MyCreditRequestDetailAPIView,
    CreditRequestCreateAPIView,
    CreditRequestInstallmentsAPIView,
    ConfirmPaymentAPIView,
    RegisterAfterPaymentAPIView,  # 🔴 اضافه شده
)

urlpatterns = [
    # ✅ پروفایل (کیف پول)
    path("user-profile/", UserProfileAPIView.as_view(), name="user-profile"),

    # ✅ آدرس‌ها
    path("user-addresses/", UserAddressListCreateAPIView.as_view(), name="user-addresses"),
    path("user-addresses/<int:pk>/", UserAddressDetailAPIView.as_view(), name="user-address-detail"),

    # ✅ درخواست‌های اعتبار
    path("my-requests/", MyCreditRequestsAPIView.as_view(), name="my-requests"),
    path("my-requests/<uuid:id>/", MyCreditRequestDetailAPIView.as_view(), name="my-request-detail"),

    # ✅ ساخت درخواست اعتبار
    path("credit-requests/create/", CreditRequestCreateAPIView.as_view(), name="credit-request-create"),

    # ✅ تایید پرداخت از درگاه
    path("confirm-payment/", ConfirmPaymentAPIView.as_view(), name="confirm-payment"),

    # 🔴 جدید: ثبت بعد از پرداخت موفق
    path("register-after-payment/", RegisterAfterPaymentAPIView.as_view(), name="register-after-payment"),

    # ✅ اقساط یک درخواست
    path("my-requests/<uuid:credit_id>/installments/", CreditRequestInstallmentsAPIView.as_view(), name="installments"),
]