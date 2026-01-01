from typing import Optional

from rest_framework import serializers

from .models import (
    Category,
    Product,
    ProductSpecification,
    ProductMedia,
    ProductVariant,
)


def _abs_url(request, url: Optional[str]) -> Optional[str]:
    """
    تبدیل آدرس نسبی مدیا به آدرس کامل
    """
    if not url:
        return None
    u = str(url)
    if u.startswith("http://") or u.startswith("https://"):
        return u
    if request is None:
        return u
    return request.build_absolute_uri(u)


# ---------------------------
# Category
# ---------------------------
class CategoryFlatSerializer(serializers.ModelSerializer):
    parent = serializers.IntegerField(source="parent_id", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "title", "slug", "parent"]


class CategoryTreeSerializer(serializers.ModelSerializer):
    parent = serializers.IntegerField(source="parent_id", read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "title", "slug", "parent", "children"]

    def get_children(self, obj):
        # اگر related_name=children باشه
        if hasattr(obj, "children"):
            qs = obj.children.all().order_by("id")
        else:
            # fallback (اگر parent داشته باشی)
            qs = Category.objects.filter(parent=obj).order_by("id")
        return CategoryTreeSerializer(qs, many=True, context=self.context).data


# ---------------------------
# Product - Specs
# ---------------------------
class ProductSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSpecification
        # ✅ مدل شما name داره نه title
        fields = ["id", "name", "value", "order"]


# ---------------------------
# Product - Media
# ---------------------------
class ProductMediaSerializer(serializers.ModelSerializer):
    """
    ✅ این نسخه با فرانت شما هماهنگه:
    - فرانت دنبال m.file می‌گرده (نه url)
    - is_video باید از فیلد video مدل بیاد
    """

    # ✅ مهم‌ترین فیلد برای فرانت
    file = serializers.SerializerMethodField()

    # ✅ alias های اضافی برای اینکه هر جای فرانت/ادمین خواست کار کنه
    url = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    src = serializers.SerializerMethodField()

    # ✅ بقیه اطلاعات
    media_type = serializers.SerializerMethodField()
    is_video = serializers.SerializerMethodField()

    class Meta:
        model = ProductMedia
        fields = [
            "id",
            "file",        # ✅ کلیدی که فرانت لازم داره
            "url",
            "file_url",
            "image_url",
            "src",
            "media_type",
            "is_video",
            "video",       # ✅ برای سازگاری
            "is_primary",
            "order",
        ]

    def _file_url_raw(self, obj) -> Optional[str]:
        f = getattr(obj, "file", None)
        if not f:
            return None
        try:
            return f.url
        except Exception:
            return None

    def _abs(self, obj) -> Optional[str]:
        request = self.context.get("request")
        return _abs_url(request, self._file_url_raw(obj))

    # ✅ این همون چیزیه که فرانت می‌خواد
    def get_file(self, obj):
        return self._abs(obj)

    # ✅ alias ها همه یکی
    def get_url(self, obj):
        return self._abs(obj)

    def get_file_url(self, obj):
        return self._abs(obj)

    def get_image_url(self, obj):
        return self._abs(obj)

    def get_src(self, obj):
        return self._abs(obj)

    def get_is_video(self, obj):
        # ✅ مدل شما video داره
        return bool(getattr(obj, "video", False))

    def get_media_type(self, obj):
        return "video" if self.get_is_video(obj) else "image"


# ---------------------------
# Product - Variants (Color)
# ---------------------------
class ProductVariantSerializer(serializers.ModelSerializer):
    # alias های اسم
    title = serializers.CharField(source="name", read_only=True)
    label = serializers.CharField(source="name", read_only=True)
    color_name = serializers.CharField(source="name", read_only=True)

    # alias های کد رنگ
    color_hex = serializers.CharField(source="color_code", read_only=True)
    hex = serializers.CharField(source="color_code", read_only=True)
    color = serializers.CharField(source="color_code", read_only=True)

    price = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "name",
            "title",
            "label",
            "color_name",
            "color_code",
            "color_hex",
            "hex",
            "color",
            "extra_price",
            "sale_price_override",
            "price",
            "sale_price",
            "stock",
        ]

    def _calc_price(self, obj) -> int:
        product = getattr(obj, "product", None)

        base = 0
        try:
            if product and product.base_sale_price is not None:
                base = int(product.base_sale_price)
        except Exception:
            base = 0

        extra = 0
        try:
            if obj.extra_price is not None:
                extra = int(obj.extra_price)
        except Exception:
            extra = 0

        override = getattr(obj, "sale_price_override", None)
        if override is not None:
            try:
                return int(override)
            except Exception:
                pass

        return base + extra

    def get_price(self, obj):
        return self._calc_price(obj)

    def get_sale_price(self, obj):
        return self._calc_price(obj)


# ---------------------------
# Product
# ---------------------------
class ProductSerializer(serializers.ModelSerializer):
    category_slug = serializers.SerializerMethodField()
    main_image = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    specs = ProductSpecSerializer(many=True, read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "description",
            "base_sale_price",
            "stock",
            "shipping_fee",
            "last_updated",
            "category_slug",
            "main_image",
            "image_url",
            "specs",
            "media",
            "variants",
        ]

    def get_category_slug(self, obj):
        try:
            return obj.category.slug if obj.category else None
        except Exception:
            return None

    def _pick_main_image_url(self, obj) -> Optional[str]:
        # 1) اگر فیلد مستقیم داشت
        for attr in ["main_image_file", "main_image", "image", "thumbnail", "file"]:
            if hasattr(obj, attr):
                f = getattr(obj, attr, None)
                try:
                    if f and hasattr(f, "url"):
                        return f.url
                except Exception:
                    pass

        # 2) primary media
        try:
            primary = obj.media.filter(is_primary=True).order_by("order", "id").first()
            if primary:
                f = getattr(primary, "file", None)
                if f:
                    return f.url
        except Exception:
            pass

        # 3) first media
        try:
            first = obj.media.order_by("order", "id").first()
            if first:
                f = getattr(first, "file", None)
                if f:
                    return f.url
        except Exception:
            pass

        return None

    def get_main_image(self, obj):
        request = self.context.get("request")
        return _abs_url(request, self._pick_main_image_url(obj))

    def get_image_url(self, obj):
        request = self.context.get("request")
        return _abs_url(request, self._pick_main_image_url(obj))
