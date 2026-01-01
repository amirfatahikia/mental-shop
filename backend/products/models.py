from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )

    class Meta:
        verbose_name = "دسته‌بندی"
        verbose_name_plural = "دسته‌بندی‌ها"

    def save(self, *args, **kwargs):
        if not self.slug and self.title:
            self.slug = slugify(self.title, allow_unicode=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Product(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    # ✅ قبلی بود (ولی توی فایل شما خراب شده بود) - نگه داشتیم و درستش کردیم
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )

    # ✅ قبلی‌ها (حذف نشده)
    source_url = models.URLField(unique=True)
    purchase_price = models.BigIntegerField(default=0)
    base_sale_price = models.BigIntegerField(default=0)
    shipping_fee = models.BigIntegerField(default=0)
    stock = models.PositiveIntegerField(default=0)

    # ✅ قبلی: لینک عکس (اگر خواستی همچنان می‌تونی بزنی)
    image_url = models.URLField(null=True, blank=True)

    # ✅ جدید: آپلود عکس اصلی (به جای URL)
    main_image_file = models.ImageField(upload_to="products/main/", null=True, blank=True)

    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "محصول"
        verbose_name_plural = "محصولات"

    def __str__(self):
        return self.title

    @property
    def main_image(self):
        """
        برای فرانت: یک فیلد واحد برمی‌گردونه.
        اولویت:
        1) main_image_file
        2) image_url
        3) اولین media که primary هست
        4) None
        """
        if self.main_image_file:
            try:
                return self.main_image_file.url
            except Exception:
                return None

        if self.image_url:
            return self.image_url

        primary = self.media.filter(is_primary=True).first()
        if primary:
            try:
                return primary.file.url
            except Exception:
                return None

        any_media = self.media.first()
        if any_media:
            try:
                return any_media.file.url
            except Exception:
                return None

        return None


class ProductSpecification(models.Model):
    """
    ✅ اسپک آزاد: هر محصول هر تعداد
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="specs")
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=1000)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "مشخصات محصول"
        verbose_name_plural = "مشخصات محصولات"
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.product.title} | {self.name}: {self.value}"


class ProductVariant(models.Model):
    """
    ✅ وریانت (مثلاً رنگ) با قیمت/موجودی جدا
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")

    name = models.CharField(max_length=100)  # مثلا "مشکی"
    color_code = models.CharField(max_length=20, null=True, blank=True)  # مثلا "#000000"

    # اگر قیمت این وریانت با پایه فرق داره:
    extra_price = models.BigIntegerField(default=0)

    # اگر خواستی قیمت وریانت کاملا مستقل باشه:
    sale_price_override = models.BigIntegerField(null=True, blank=True)

    stock = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "وریانت محصول"
        verbose_name_plural = "وریانت‌های محصول"
        unique_together = ("product", "name")

    def __str__(self):
        return f"{self.product.title} | {self.name}"

    def save(self, *args, **kwargs):
        """
        ✅ نرمال‌سازی رنگ:
        - 'dde773#' => '#dde773'
        - 'dde773'  => '#dde773'
        """
        if self.color_code:
            s = str(self.color_code).strip()
            if s.endswith("#") and not s.startswith("#"):
                s = "#" + s[:-1]
            elif not s.startswith("#"):
                s = "#" + s
            self.color_code = s
        super().save(*args, **kwargs)

    @property
    def final_price(self):
        if self.sale_price_override is not None:
            return int(self.sale_price_override)
        return int(self.product.base_sale_price) + int(self.extra_price)


class ProductMedia(models.Model):
    """
    ✅ گالری عکس/ویدیو (چندتا فایل)
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")

    # ✅ قبلی شما file و video داشت - حذف نکردیم
    file = models.FileField(upload_to="product_media/")
    video = models.BooleanField(default=False)

    # ✅ جدید
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "مدیا محصول"
        verbose_name_plural = "مدیا محصولات"
        ordering = ["order", "id"]

    def __str__(self):
        t = "ویدیو" if self.video else "عکس"
        return f"{self.product.title} | {t}"
