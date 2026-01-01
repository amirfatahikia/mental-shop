from django.contrib.auth.models import User
from django.apps import apps
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


def _to_en_digits(s: str) -> str:
    """Convert Persian/Arabic digits to English digits."""
    if s is None:
        return ""
    s = str(s)
    fa = "۰۱۲۳۴۵۶۷۸۹"
    ar = "٠١٢٣٤٥٦٧٨٩"
    out = []
    for ch in s:
        if ch in fa:
            out.append(str(fa.index(ch)))
        elif ch in ar:
            out.append(str(ar.index(ch)))
        else:
            out.append(ch)
    return "".join(out)


def _ensure_credit_profile(user: User, full_name: str):
    """
    اگر داخل اپ credit پروفایل/کیف پول داری، اینجا سعی می‌کنیم بسازیم
    بدون اینکه اسم دقیق مدل رو مجبور باشیم بدانیم.
    """
    for model_name in ("UserProfile", "Profile", "CustomerProfile"):
        try:
            Model = apps.get_model("credit", model_name)
        except LookupError:
            continue

        defaults = {}
        # نام‌های محتمل برای فیلد نام کامل
        if hasattr(Model, "fullName"):
            defaults["fullName"] = full_name
        if hasattr(Model, "full_name"):
            defaults["full_name"] = full_name

        # کیف پول
        if hasattr(Model, "wallet_balance"):
            defaults["wallet_balance"] = 0

        try:
            Model.objects.get_or_create(user=user, defaults=defaults)
        except Exception:
            pass
        return


class RegisterSerializer(serializers.Serializer):
    """
    ورودی‌های قابل قبول:
      - phoneNumber / phone_number / username / mobile / phone
      - password
      - fullName / full_name (اختیاری)
    خروجی: id, username
    """
    phoneNumber = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    mobile = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    password = serializers.CharField(write_only=True)
    fullName = serializers.CharField(required=False, allow_blank=True)
    full_name = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        raw_phone = (
            attrs.get("phone_number")
            or attrs.get("phoneNumber")
            or attrs.get("username")
            or attrs.get("mobile")
            or attrs.get("phone")
            or ""
        )
        phone = _to_en_digits(raw_phone).strip()

        # فقط عدد
        phone = "".join([c for c in phone if c.isdigit()])

        if len(phone) != 11:
            raise serializers.ValidationError({"phone": "شماره موبایل باید دقیقاً ۱۱ رقم باشد."})

        password = attrs.get("password") or ""
        if len(password) < 4:
            raise serializers.ValidationError({"password": "رمز عبور خیلی کوتاه است."})

        attrs["_clean_phone"] = phone

        full_name = (attrs.get("full_name") or attrs.get("fullName") or "").strip()
        attrs["_full_name"] = full_name
        return attrs

    def create(self, validated_data):
        phone = validated_data["_clean_phone"]
        full_name = validated_data.get("_full_name") or ""
        password = validated_data["password"]

        if User.objects.filter(username=phone).exists():
            raise serializers.ValidationError({"phone": "این شماره قبلاً ثبت شده است."})

        user = User.objects.create_user(username=phone, password=password)

        if full_name:
            # ساده‌ترین ذخیره نام
            user.first_name = full_name
            user.save(update_fields=["first_name"])

        # اگر پروفایل کیف پول در credit داری، بساز
        _ensure_credit_profile(user, full_name)

        return user

    def to_representation(self, instance):
        return {"id": instance.id, "username": instance.username}


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    لاگین JWT که phoneNumber هم قبول کند.
    """
    def validate(self, attrs):
        raw_user = (
            attrs.get("username")
            or attrs.get("phone_number")
            or attrs.get("phoneNumber")
            or attrs.get("mobile")
            or attrs.get("phone")
            or ""
        )
        username = _to_en_digits(raw_user).strip()
        username = "".join([c for c in username if c.isdigit()]) or username

        # SimpleJWT انتظار username دارد
        attrs["username"] = username
        return super().validate(attrs)
