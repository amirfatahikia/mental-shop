import json
import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Product, Category, ProductVariant

def auto_import():
    # ۱. شناسایی مدل مربوط به مشخصات فنی (Specs)
    # از آنجایی که در ادمین به صورت اینلاین است، مدل متصل به specs را پیدا می‌کنیم
    SpecsModel = Product._meta.get_field('specs').related_model
    print(f"🛠 مدل مشخصات شناسایی شد: {SpecsModel.__name__}")

    # ۲. پاکسازی کل محصولات (طبق خواسته شما)
    print("🗑 در حال پاکسازی دیتابیس برای وارد کردن اطلاعات جدید...")
    Product.objects.all().delete()

    mapping = {
        'mobile': ['iphone', 'samsung_a', 'samsung_s', 'samsung_z', 'poco', 'redmi', 'daria', 'xiaomi'],
        'laptop': ['macbook', 'vivobook', 'vostro', 'victus', 'ideapad', 'lenovo', 'hp-g9', 'dell'],
        'watch': ['watch', 'band', 'fit3', 'wear', 'kw80'],
        'gaming': ['ps4', 'ps5', 'xbox', 'nintendo', 'gaming-chair', 'controller'],
        'accessory': ['cable', 'charger', 'glass', 'powerbank'],
    }

    files = [f for f in os.listdir('.') if f.endswith('.json') and not f.startswith('package')]
    print(f"🔍 در حال وارد کردن {len(files)} محصول با جزئیات کامل...")

    for file_name in files:
        target_slug = 'accessory'
        for slug, keywords in mapping.items():
            if any(key in file_name.lower() for key in keywords):
                target_slug = slug
                break
        
        try:
            category = Category.objects.get(slug=target_slug)
            with open(file_name, 'r', encoding='utf-8') as f:
                raw = json.load(f)
                data = raw[0] if isinstance(raw, list) else raw
                
                price = data.get('base_price') or data.get('base_sale_price') or data.get('price') or 0
                s_url = data.get('source_url') or f"internal-{uuid.uuid4().hex[:6]}"

                # ۳. ساخت محصول
                product = Product.objects.create(
                    title=data['title'],
                    description=data.get('description', ''),
                    category=category,
                    source_url=s_url,
                    base_sale_price=price
                )
                
                # ۴. وارد کردن جدول مشخصات (NAME و VALUE در اسکرین‌شات شما)
                specs_dict = data.get('specifications', {})
                for name, value in specs_dict.items():
                    SpecsModel.objects.create(
                        product=product,
                        name=name,    # ستون NAME در ادمین
                        value=value   # ستون VALUE در ادمین
                    )
                
                # ۵. وارد کردن رنگ‌ها (Variants) بر اساس فیلدهای دیتابیس شما
                for v in data.get('variants', []):
                    ProductVariant.objects.create(
                        product=product,
                        name=v.get('color'),
                        color_code=v.get('hexCode'),
                        sale_price_override=v.get('price', price)
                    )
                
                print(f"✅ محصول و مشخصات فنی وارد شد: {product.title}")
        except Exception as e:
            print(f"❌ خطا در {file_name}: {e}")

if __name__ == "__main__":
    auto_import()