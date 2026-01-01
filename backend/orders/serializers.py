from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_title = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_title",
            "product_image",
            "quantity",
            "price",
        ]

    def get_product_title(self, obj):
        if getattr(obj, "product_title_snapshot", None):
            return obj.product_title_snapshot
        try:
            return obj.product.title
        except Exception:
            return ""

    def get_product_image(self, obj):
        if getattr(obj, "product_image_snapshot", None):
            return obj.product_image_snapshot
        try:
            if hasattr(obj.product, "image_url") and obj.product.image_url:
                return str(obj.product.image_url)
            if hasattr(obj.product, "image") and obj.product.image:
                return obj.product.image.url
        except Exception:
            pass
        return ""


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_label = serializers.ReadOnlyField()

    class Meta:
        model = Order
        fields = [
            "id",
            "tracking_number",
            "total_price",
            "shipping_fee",
            "payment_method",
            "status",
            "status_label",
            "address",
            "created_at",
            "items",
        ]
        read_only_fields = [
            "id",
            "tracking_number",
            "status",
            "status_label",
            "created_at",
            "items",
        ]


# --------------------------
# ورودی ثبت سفارش (Submit)
# --------------------------
class OrderSubmitItemSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    # اگر کلاینت قیمت هم فرستاد (اختیاری)
    price = serializers.IntegerField(required=False, min_value=0)


class OrderSubmitSerializer(serializers.Serializer):
    payment_method = serializers.CharField(required=False, allow_blank=True)
    shipping_fee = serializers.IntegerField(required=False, min_value=0)
    address_id = serializers.IntegerField(required=False)
    address = serializers.JSONField(required=False)
    items = OrderSubmitItemSerializer(many=True)

    # اگر کلاینت total_price هم فرستاد، نادیده می‌گیریم (امنیت)
    total_price = serializers.IntegerField(required=False)
