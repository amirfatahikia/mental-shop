import json
import uuid  # برای تولید کد یکتا
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product, Category, ProductSpecification, ProductVariant

class Command(BaseCommand):
    help = 'Import all products regardless of duplicate URLs'

    def handle(self, *args, **options):
        file_path = 'mobile_products.json'
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                products_data = json.load(f)

            with transaction.atomic():
                for item in products_data:
                    # تولید یک URL الکی و منحصربه‌فرد برای دور زدن محدودیت UNIQUE
                    random_suffix = uuid.uuid4().hex[:8]
                    unique_fake_url = f"{item['source_url']}-{random_suffix}"

                    category = Category.objects.get(id=item['category_id'])
                    
                    product = Product.objects.create(
                        title=item['title'],
                        description=item['description'],
                        category=category,
                        purchase_price=item['purchase_price'],
                        base_sale_price=item['base_sale_price'],
                        shipping_fee=item['shipping_fee'],
                        stock=item['stock'],
                        source_url=unique_fake_url  # 👈 استفاده از URL دستکاری شده
                    )

                    for spec in item['specifications']:
                        ProductSpecification.objects.create(
                            product=product,
                            name=spec['name'],
                            value=spec['value'],
                            order=spec['order']
                        )

                    for var in item['variants']:
                        ProductVariant.objects.create(
                            product=product,
                            name=var['name'],
                            color_code=var['color_code'],
                            extra_price=var['extra_price'],
                            stock=var['stock']
                        )

                    self.stdout.write(self.style.SUCCESS(f'Successfully added: {product.title}'))

            self.stdout.write(self.style.SUCCESS('--- ALL PRODUCTS IMPORTED SUCCESSFULLY ---'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))