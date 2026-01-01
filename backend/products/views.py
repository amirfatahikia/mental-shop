from django.db.models import Q, Case, When, Value, IntegerField # اضافه شدن ابزارهای امتیازدهی
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import AllowAny

from .models import Product, Category
from .serializers import (
    ProductSerializer,
    CategoryTreeSerializer,
    CategoryFlatSerializer,
)


def _collect_descendant_category_ids(category: Category):
    """
    همه زیرشاخه‌ها رو جمع می‌کنه تا محصولات زیرشاخه‌ها هم نمایش داده بشن.
    """
    ids = [category.id]
    queue = [category]
    while queue:
        node = queue.pop(0)
        children = list(node.children.all())
        for ch in children:
            ids.append(ch.id)
        queue.extend(children)
    return ids


# ----------------------------------------------------------------
# کلاس جستجوی هوشمند با سیستم اولویت‌بندی (Search Ranking)
# ----------------------------------------------------------------
class ProductSearchAPIView(generics.ListAPIView):
    """
    جستجویی که کلمات را جدا کرده و محصولات مرتبط‌تر (تطابق در عنوان) را بالاتر نشان می‌دهد.
    """
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        # ۱. پاک‌سازی ورودی
        query = self.request.query_params.get("q", "").strip()
        
        if len(query) < 2:
            return Product.objects.none()

        # ۲. اصلاح کاراکترهای فارسی
        query = query.replace('ي', 'ی').replace('ك', 'ک')
        words = query.split()
        
        # ۳. فیلتر اولیه (محصولاتی که شامل تمام کلمات هستند)
        queryset = Product.objects.prefetch_related("media", "specs", "variants").all()
        for word in words:
            queryset = queryset.filter(
                Q(title__icontains=word) | Q(description__icontains=word)
            )

        # ۴. سیستم امتیازدهی هوشمند (Ranking)
        # اولویت ۱: تطابق کل عبارت در عنوان (۱۵ امتیاز)
        # اولویت ۲: وجود کلمه اول سرچ در عنوان (۱۰ امتیاز)
        # اولویت ۳: وجود عبارت در توضیحات (۲ امتیاز)
        queryset = queryset.annotate(
            search_rank=Case(
                When(title__icontains=query, then=Value(15)),
                When(title__icontains=words[0], then=Value(10)),
                When(description__icontains=query, then=Value(2)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

        # ۵. مرتب‌سازی: ابتدا بر اساس امتیاز (مرتبط‌ترین) و سپس جدیدترین‌ها
        return queryset.order_by("-search_rank", "-last_updated").distinct()[:6]

    def get_serializer_context(self):
        """
        ارسال کانتکست برای تولید آدرس کامل مدیا
        """
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


# ----------------------------------------------------------------
# بقیه کلاس‌های قبلی (بدون تغییر)
# ----------------------------------------------------------------

class ProductListAPIView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.select_related("category").prefetch_related("media", "specs", "variants").all()
        slug = self.request.query_params.get("category_slug")
        cat_id = self.request.query_params.get("category")

        if slug:
            cat = Category.objects.filter(slug=slug).first()
            if cat:
                ids = _collect_descendant_category_ids(cat)
                qs = qs.filter(category_id__in=ids)
            else:
                qs = qs.none()

        if cat_id:
            try:
                qs = qs.filter(category_id=int(cat_id))
            except Exception:
                pass

        return qs.order_by("-last_updated")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class ProductDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related("category").prefetch_related("media", "specs", "variants").all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class CategoryTreeApi(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        roots = Category.objects.filter(parent__isnull=True)
        data = CategoryTreeSerializer(roots, many=True).data
        return Response(data)


class CategoryFlat(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Category.objects.all()
        data = CategoryFlatSerializer(qs, many=True).data
        return Response(data)


class CategoryDetailApi(APIView):
    """
    نمایش محصولات یک دسته‌بندی خاص بر اساس Slug
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        category = Category.objects.filter(slug=slug).first()
        if not category:
            return Response(
                {"detail": "این دسته‌بندی وجود ندارد."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ids = _collect_descendant_category_ids(category)
        products = Product.objects.select_related("category").prefetch_related("media", "specs", "variants").filter(
            category_id__in=ids
        ).order_by("-last_updated")

        return Response(
            {
                "category": {
                    "id": category.id,
                    "title": category.title,
                    "slug": category.slug,
                    "parent": category.parent_id,
                },
                "products": ProductSerializer(products, many=True, context={"request": request}).data,
            }
        )