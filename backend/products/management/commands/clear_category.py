from django.core.management.base import BaseCommand
from products.models import Product

class Command(BaseCommand):
    help = 'پاک‌سازی محصولات یک دسته‌بندی خاص بدون حذف بقیه دسته‌ها'

    def add_arguments(self, parser):
        # دریافت آیدی دسته‌بندی از ترمینال
        parser.add_argument('cat_id', type=int, help='آیدی دسته‌بندی برای پاک‌سازی')

    def handle(self, *args, **options):
        cat_id = options['cat_id']
        
        # فیلتر کردن محصولات بر اساس آیدی دسته و حذف آن‌ها
        # به دلیل وجود CASCADE در مدل‌ها، تمام مشخصات و واریانت‌های این محصولات هم خودکار پاک می‌شوند
        deleted_info = Product.objects.filter(category_id=cat_id).delete()
        
        count = deleted_info[0]
        
        if count > 0:
            self.stdout.write(self.style.SUCCESS(f'با موفقیت {count} محصول از دسته‌بندی {cat_id} حذف شدند.'))
            self.stdout.write(self.style.WARNING('سایر دسته‌بندی‌ها بدون تغییر باقی ماندند.'))
        else:
            self.stdout.write(self.style.ERROR(f'هیچ محصولی در دسته‌بندی {cat_id} پیدا نشد.'))