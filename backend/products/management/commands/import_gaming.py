import json
import uuid
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product, Category, ProductSpecification, ProductVariant

class Command(BaseCommand):
    help = 'Import gaming products from JSON'

    def handle(self, *args, **options):
        file_path = 'gaming_products.json'
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                products_data = json.load(f)

            with transaction.atomic():
                for item in products_data:
                    # تولید URL منحصربه‌فرد برای دور زدن محدودیت UNIQUE در دیتابیس
                    unique_url = f"{item.get('source_url', 'https://gaming-store.com')}-{uuid.uuid4().hex[:6]}"

                    # پیدا کردن دسته‌ی گیمینگ (ID: 4) بر اساس عکس پنل مدیریت شما
                    category = Category.objects.get(id=4)
                    
                    # ۱. ایجاد محصول اصلی
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

                    # ۲. ایجاد مشخصات فنی (Specifications)
                    for spec in item.get('specifications', []):
                        ProductSpecification.objects.create(
                            product=product,
                            name=spec['name'],
                            value=spec['value'],
                            order=spec.get('order', 0)
                        )

                    # ۳. ایجاد واریانت‌ها (رنگ‌ها و مدل‌ها)
                    for var in item.get('variants', []):
                        ProductVariant.objects.create(
                            product=product,
                            name=var['name'],
                            color_code=var.get('color_code', '#000000'),
                            extra_price=var.get('extra_price', 0),
                            stock=var.get('stock', 5)
                        )
                    self.stdout.write(self.style.SUCCESS(f'محصول گیمینگ وارد شد: {product.title}'))

            self.stdout.write(self.style.SUCCESS('--- تمام ۳۰ محصول گیمینگ با موفقیت اضافه شدند ---'))
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'فایل "{file_path}" پیدا نشد!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'خطا: {str(e)}'))