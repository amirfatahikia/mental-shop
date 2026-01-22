import json
import uuid
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product, Category, ProductSpecification, ProductVariant

class Command(BaseCommand):
    help = 'Import laptop and tablet products from JSON'

    def handle(self, *args, **options):
        file_path = 'laptop_products.json'
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                products_data = json.load(f)

            with transaction.atomic():
                for item in products_data:
                    # ایجاد یک URL یکتا برای دور زدن محدودیت UNIQUE در دیتابیس
                    random_suffix = uuid.uuid4().hex[:6]
                    unique_url = f"{item.get('source_url', 'http://sample.com')}-{random_suffix}"

                    # پیدا کردن دسته لپ‌تاپ (ID: 2)
                    category = Category.objects.get(id=int(item['category_id']))
                    
                    # ۱. ثبت محصول اصلی
                    product = Product.objects.create(
                        title=item['title'],
                        description=item['description'],
                        category=category,
                        purchase_price=item['purchase_price'],
                        base_sale_price=item['base_sale_price'],
                        shipping_fee=item.get('shipping_fee', 50000),
                        stock=item['stock'],
                        source_url=unique_url
                    )

                    # ۲. ثبت مشخصات فنی (Specifications)
                    for spec in item.get('specifications', []):
                        ProductSpecification.objects.create(
                            product=product,
                            name=spec['name'],
                            value=spec['value'],
                            order=spec.get('order', 0)
                        )

                    # ۳. ثبت رنگ‌ها و مدل‌ها (Variants)
                    for var in item.get('variants', []):
                        ProductVariant.objects.create(
                            product=product,
                            name=var['name'],
                            color_code=var.get('color_code', '#000000'),
                            extra_price=var.get('extra_price', 0),
                            stock=var.get('stock', 1)
                        )
                    self.stdout.write(self.style.SUCCESS(f'محصول وارد شد: {product.title}'))

            self.stdout.write(self.style.SUCCESS('--- تمام لپ‌تاپ‌ها با موفقیت وارد شدند ---'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'خطا: {str(e)}'))