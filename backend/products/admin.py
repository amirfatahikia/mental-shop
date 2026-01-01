from django.contrib import admin
from .models import Category, Product, ProductMedia, ProductSpecification, ProductVariant


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "slug", "parent")
    search_fields = ("title", "slug")
    list_filter = ("parent",)


class ProductMediaInline(admin.TabularInline):
    model = ProductMedia
    extra = 1
    fields = ("file", "video", "is_primary", "order")
    ordering = ("order", "id")


class ProductSpecInline(admin.TabularInline):
    model = ProductSpecification
    extra = 2
    fields = ("name", "value", "order")
    ordering = ("order", "id")


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ("name", "color_code", "extra_price", "sale_price_override", "stock")
    ordering = ("id",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "category", "base_sale_price", "stock", "last_updated")
    search_fields = ("title", "source_url")
    list_filter = ("category",)

    inlines = [ProductSpecInline, ProductVariantInline, ProductMediaInline]

    fieldsets = (
        ("اطلاعات اصلی", {"fields": ("title", "description", "category")}),
        ("قیمت و موجودی", {"fields": ("purchase_price", "base_sale_price", "shipping_fee", "stock")}),
        ("عکس اصلی", {"fields": ("main_image_file", "image_url")}),  # ✅ هر دو رو داری (URL حذف نشده)
        ("سایر", {"fields": ("source_url",)}),
    )


@admin.register(ProductMedia)
class ProductMediaAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "video", "is_primary", "order")
    list_filter = ("video", "is_primary")
    search_fields = ("product__title",)


@admin.register(ProductSpecification)
class ProductSpecificationAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "name", "value", "order")
    search_fields = ("product__title", "name", "value")


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "name", "final_price", "stock")
    search_fields = ("product__title", "name")
