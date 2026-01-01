from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

from products.models import Product


class Order(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_PROCESSING = "processing"
    STATUS_SHIPPED = "shipped"
    STATUS_DELIVERED = "delivered"
    STATUS_CANCELED = "canceled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "در انتظار پرداخت"),
        (STATUS_PAID, "پرداخت شده"),
        (STATUS_PROCESSING, "در حال پردازش"),
        (STATUS_SHIPPED, "ارسال شده"),
        (STATUS_DELIVERED, "تحویل شده"),
        (STATUS_CANCELED, "لغو شده"),
    ]

    PAYMENT_WALLET = "wallet"
    PAYMENT_DIRECT = "direct"

    PAYMENT_CHOICES = [
        (PAYMENT_WALLET, "اعتباری/کیف پول"),
        (PAYMENT_DIRECT, "پرداخت آنلاین"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    tracking_number = models.CharField(max_length=32, unique=True, blank=True)

    # مبلغ نهایی پرداختی (جمع کالاها + ارسال)
    total_price = models.BigIntegerField(default=0)
    shipping_fee = models.BigIntegerField(default=0)

    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default=PAYMENT_DIRECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)

    # snapshot آدرس (هم آدرس کامل، هم address_id اگر خواستی)
    address = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)

        # tracking_number را بعد از اینکه pk داریم بساز تا یکتا و تمیز باشد
        if (creating or not self.tracking_number) and not self.tracking_number:
            ts = timezone.now().strftime("%y%m%d%H%M%S")
            self.tracking_number = f"TRK-{ts}-{self.user_id}-{self.pk}"
            Order.objects.filter(pk=self.pk).update(tracking_number=self.tracking_number)

    @property
    def status_label(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.status)

    def __str__(self):
        return f"Order#{self.pk} - {self.user_id} - {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")

    product_title_snapshot = models.CharField(max_length=255, blank=True)
    product_image_snapshot = models.CharField(max_length=500, blank=True)

    quantity = models.PositiveIntegerField(default=1)
    price = models.BigIntegerField(default=0)  # قیمت واحد در زمان خرید

    def save(self, *args, **kwargs):
        if not self.product_title_snapshot:
            self.product_title_snapshot = getattr(self.product, "title", "") or ""

        if not self.product_image_snapshot:
            img = ""
            if hasattr(self.product, "image_url") and self.product.image_url:
                img = str(self.product.image_url)
            elif hasattr(self.product, "image") and self.product.image:
                try:
                    img = self.product.image.url
                except Exception:
                    img = ""
            self.product_image_snapshot = img

        super().save(*args, **kwargs)

    def __str__(self):
        return f"OrderItem#{self.pk} - Order#{self.order_id} - Product#{self.product_id}"
