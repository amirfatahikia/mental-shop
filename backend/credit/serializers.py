from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Wallet, UserAddress, CreditRequest, Installment


# ✅ تبدیل عددهای فارسی/عربی به انگلیسی
_FA_TO_EN = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
_AR_TO_EN = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def normalize_digits(value: str) -> str:
    if value is None:
        return ""
    v = str(value).strip()
    v = v.translate(_FA_TO_EN).translate(_AR_TO_EN)
    return v


class UserProfileSerializer(serializers.Serializer):
    fullName = serializers.CharField(required=False, allow_blank=True)
    wallet_balance = serializers.IntegerField()


class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = ["id", "fullName", "phoneNumber", "nationalCode", "postalCode", "preciseAddress", "city", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_phoneNumber(self, v):
        v = normalize_digits(v)
        v = "".join(ch for ch in v if ch.isdigit())
        if len(v) != 11:
            raise serializers.ValidationError("شماره موبایل باید دقیقاً ۱۱ رقم باشد.")
        return v

    def validate_nationalCode(self, v):
        v = normalize_digits(v)
        v = "".join(ch for ch in v if ch.isdigit())
        if len(v) != 10:
            raise serializers.ValidationError("کد ملی باید دقیقاً ۱۰ رقم باشد.")
        return v

    def validate_postalCode(self, v):
        v = normalize_digits(v)
        v = "".join(ch for ch in v if ch.isdigit())
        if len(v) != 10:
            raise serializers.ValidationError("کد پستی باید دقیقاً ۱۰ رقم باشد.")
        return v

    def create(self, validated_data):
        user = self.context["request"].user
        # سقف ۵ آدرس
        if UserAddress.objects.filter(user=user).count() >= 5:
            raise serializers.ValidationError({"detail": "max_addresses_reached"})
        return UserAddress.objects.create(user=user, **validated_data)


class CreditRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditRequest
        fields = [
            "id",
            "tracking_code",
            "amount",
            "installments",
            "status",
            "credited_to_wallet",
            "national_card_front",
            "national_card_back",
            "salary_slip",
            "bank_statement",
            "birth_certificate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tracking_code", "credited_to_wallet", "created_at", "updated_at"]


class InstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Installment
        fields = ["id", "installment_number", "amount", "due_date", "paid", "paid_at"]
        read_only_fields = ["id"]
