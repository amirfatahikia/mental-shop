from django.urls import path
from .views import CreateOrderView, UserOrderListView, UserOrderDetailView

urlpatterns = [
    # لیست سفارش‌ها
    path("", UserOrderListView.as_view(), name="orders-list"),
    path("list/", UserOrderListView.as_view(), name="orders-list-alt"),

    # ثبت سفارش
    path("submit/", CreateOrderView.as_view(), name="orders-submit"),

    # جزئیات سفارش
    path("<int:pk>/", UserOrderDetailView.as_view(), name="orders-detail"),
]
