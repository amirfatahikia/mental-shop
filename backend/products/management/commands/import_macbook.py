import json
import os
from django.core.management.base import BaseCommand
from products.models import Product, Category, ProductSpecification, ProductVariant
from django.utils.text import slugify

class Command(BaseCommand):
    help = 'وارد کردن محصولات از JSON با قابلیت تشخیص دسته‌بندی و حل مشکل نام فیلدها'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='آدرس فایل JSON')

    def handle(self, *args, **options):
        file_path = options['json_file']
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'فایل {file_path} پیدا نشد!'))
            return

        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)

        for item in data:
            # خواندن ID دسته‌بندی از فایل یا پیش‌فرض روی 2 (لپ‌تاپ)
            cat_id = item.get('category_id', 2)
            try:
                category = Category.objects.get(id=cat_id)
            except Category.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'خطا: دسته‌بندی با ID {cat_id} یافت نشد!'))
                continue

            # ایجاد یک مقدار یکتا برای source_url جهت جلوگیری از IntegrityError
            unique_source = f"https://mentalshop.ir/products/{slugify(item['title'][:50])}"

            # ۱. ایجاد یا آپدیت محصول
            product = Product.objects.create(
                title=item['title'],
                description=item['description'],
                category=category,
                base_sale_price=item['base_price'],
                source_url=unique_source,
                stock=10
            )

            # ۲. وارد کردن مشخصات فنی
            for name, value in item['specifications'].items():
                ProductSpecification.objects.create(
                    product=product,
                    name=name,
                    value=value
                )

            # ۳. وارد کردن وارینت‌ها
            for variant in item['variants']:
                ProductVariant.objects.create(
                    product=product,
                    name=variant['color'],
                    color_code=variant['hexCode'],
                    sale_price_override=variant['price'],
                    stock=5
                )

            # اصلاح شده: استفاده از خود شیء category برای نمایش نام (فیلد title در دیتابیس شما)
            self.stdout.write(self.style.SUCCESS(f'محصول "{product.title}" در دسته "{category}" با موفقیت اضافه شد.'))