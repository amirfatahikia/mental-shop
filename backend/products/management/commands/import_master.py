import json, uuid
from django.core.management.base import BaseCommand
from django.db import transaction
from products.models import Product, Category, ProductSpecification, ProductVariant

class Command(BaseCommand):
    help = 'واردکننده هوشمند محصولات (پشتیبانی از قیمت خرید خودکار)'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str)
        parser.add_argument('cat_id', type=int)

    def handle(self, *args, **options):
        file_path = options['json_file']
        category_id = options['cat_id']
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                products_data = json.load(f)

            category = Category.objects.get(id=category_id)

            with transaction.atomic():
                for i, item in enumerate(products_data):
                    unique_url = f"https://mentalshop.ir/p/{uuid.uuid4().hex[:12]}"
                    
                    # منطق هوشمند برای استخراج قیمت
                    # ابتدا سعی می‌کند از فیلد price استفاده کند، اگر نبود به سراغ base_sale_price می‌رود
                    sale_price = item.get('price', item.get('base_sale_price', 0))
                    
                    # اگر قیمت خرید در فایل نبود، ۱۵٪ از قیمت فروش کم می‌کنیم تا قیمت خرید فرضی ساخته شود
                    purchase_price = item.get('purchase_price', int(sale_price * 0.85))

                    product = Product.objects.create(
                        title=item['title'],
                        description=item['description'],
                        category=category,
                        purchase_price=purchase_price,
                        base_sale_price=sale_price,
                        shipping_fee=item.get('shipping_fee', 50000),
                        stock=item.get('stock', 50),
                        source_url=unique_url
                    )

                    # وارد کردن مشخصات فنی (Key-Value)
                    specs_dict = item.get('specifications', {})
                    spec_objects = [
                        ProductSpecification(product=product, name=k, value=str(v), order=idx)
                        for idx, (k, v) in enumerate(specs_dict.items())
                    ]
                    ProductSpecification.objects.bulk_create(spec_objects)

                    # وارد کردن واریانت‌ها
                    variants_data = item.get('variants', [])
                    variant_objects = [
                        ProductVariant(
                            product=product,
                            name=v.get('color', v.get('name', 'پیش‌فرض')),
                            color_code=v.get('hexCode', v.get('color_code', '#000000')),
                            extra_price=int(v.get('price', sale_price)) - int(sale_price),
                            stock=v.get('stock', 10)
                        ) for v in variants_data
                    ]
                    ProductVariant.objects.bulk_create(variant_objects)
                    self.stdout.write(self.style.SUCCESS(f"ثبت شد: {product.title}"))

            self.stdout.write(self.style.SUCCESS(f'--- عملیات با موفقیت برای {len(products_data)} محصول انجام شد ---'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'خطای غیرمنتظره: {str(e)}'))