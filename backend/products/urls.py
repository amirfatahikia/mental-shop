from django.urls import path
from .views import (
    ProductListAPIView,
    ProductSearchAPIView,  # ✅ اضافه شد برای جستجوی هوشمند
    ProductDetailAPIView,
    CategoryTreeApi,
    CategoryFlat,
    CategoryDetailApi,
)

urlpatterns = [
    # --- بخش محصولات ---
    path("products/", ProductListAPIView.as_view(), name="product-list"),
    
    # ✅ آدرس جدید جستجوی هوشمند (باید قبل از آدرس ID قرار بگیرد تا تداخل ایجاد نشود)
    path("products/search/", ProductSearchAPIView.as_view(), name="product-search"),
    
    path("products/<int:pk>/", ProductDetailAPIView.as_view(), name="product-detail"),

    # --- بخش دسته‌بندی‌ها ---
    path("categories/", CategoryTreeApi.as_view(), name="category-tree"),
    path("categories/flat/", CategoryFlat.as_view(), name="category-flat"),
    
    # نمایش محصولات بر اساس اسلاگ دسته‌بندی
    path("categories/<slug:slug>/", CategoryDetailApi.as_view(), name="category-detail"),
]