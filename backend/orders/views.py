from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from products.models import Product
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderSubmitSerializer
from .utils import pay_with_wallet, InsufficientWallet


def _get_unit_price(product: Product, fallback: int = 0) -> int:
    """
    تلاش می‌کنیم با هر اسم فیلدی که در Product داری قیمت را پیدا کنیم.
    """
    candidate_fields = [
        "final_price",
        "discounted_price",
        "sale_price",
        "price",
        "current_price",
        "amount",
    ]
    for f in candidate_fields:
        if hasattr(product, f):
            try:
                v = int(getattr(product, f) or 0)
                if v > 0:
                    return v
            except Exception:
                continue
    try:
        return int(fallback or 0)
    except Exception:
        return 0


class CreateOrderView(generics.GenericAPIView):
    """
    POST /api/my-orders/submit/
    یا
    POST /api/orders/submit/

    ورودی نمونه:
    {
      "payment_method": "wallet" | "installment" | "direct",
      "shipping_fee": 30000,
      "address_id": 1,
      "address": {...},
      "items": [{"product": 12, "quantity": 2}]
    }

    خروجی: OrderSerializer
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSubmitSerializer

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        submit_ser = self.get_serializer(data=request.data)
        submit_ser.is_valid(raise_exception=True)
        v = submit_ser.validated_data

        raw_pm = (v.get("payment_method") or "").strip().lower()
        # انعطاف برای اسم‌های مختلفی که فرانت/کلاینت می‌فرسته
        is_wallet = raw_pm in ["wallet", "installment", "credit"]

        shipping_fee = int(v.get("shipping_fee") or 0)

        address = v.get("address") or {}
        if not isinstance(address, dict):
            address = {}

        if "address_id" in v and "address_id" not in address:
            address["address_id"] = v.get("address_id")

        items = v.get("items") or []
        if not items:
            raise ValidationError({"detail": "empty_cart"})

        # محاسبه مبلغ از دیتابیس محصول
        basket_lines = []
        subtotal = 0
        for it in items:
            product_id = it.get("product")
            qty = int(it.get("quantity") or 1)

            product = get_object_or_404(Product, pk=product_id)
            unit_price = _get_unit_price(product, fallback=it.get("price", 0))

            subtotal += unit_price * qty
            basket_lines.append((product, qty, unit_price))

        total_payable = int(subtotal + shipping_fee)

        # پرداخت کیف پول: اول کیف پول را قفل کن و کم کن (اتمی)
        if is_wallet:
            try:
                pay_with_wallet(request.user, total_payable)
            except InsufficientWallet as e:
                raise ValidationError(
                    {
                        "detail": "insufficient_wallet",
                        "need": int(e.need),
                        "balance": int(e.balance),
                    }
                )

        order = Order.objects.create(
            user=request.user,
            total_price=total_payable,
            shipping_fee=shipping_fee,
            payment_method=Order.PAYMENT_WALLET if is_wallet else Order.PAYMENT_DIRECT,
            status=Order.STATUS_PAID if is_wallet else Order.STATUS_PENDING,
            address=address,
        )

        # ساخت آیتم‌ها
        for product, qty, unit_price in basket_lines:
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=qty,
                price=unit_price,
            )

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class UserOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by("-created_at")


class UserOrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
