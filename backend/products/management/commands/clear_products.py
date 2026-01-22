from django.core.management.base import BaseCommand
from products.models import Product, ProductSpecification, ProductVariant, ProductMedia

class Command(BaseCommand):
    help = 'Delete all products and related data'

    def handle(self, *args, **options):
        # حذف تمام محصولات (به دلیل CASCADE، مشخصات و واریانت‌ها هم پاک می‌شوند)
        count = Product.objects.all().count()
        Product.objects.all().delete()
        
        # پاک کردن مدیاها (اگر به محصول وصل نبودند)
        ProductMedia.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS(f'با موفقیت {count} محصول و تمام جزئیات آن‌ها پاک شدند. دیتابیس آماده است!'))
    