import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


def _generate_tracking_code() -> str:
    return uuid.uuid4().hex[:12].upper()


class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet")
    balance = models.BigIntegerField(default=0)  # تومان
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet({self.user_id}) = {self.balance}"


class UserAddress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses")
    fullName = models.CharField(max_length=120)
    phoneNumber = models.CharField(max_length=20)
    nationalCode = models.CharField(max_length=20)
    postalCode = models.CharField(max_length=20)
    preciseAddress = models.TextField()
    city = models.CharField(max_length=60, default="تهران")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} - {self.fullName} ({self.city})"


class CreditRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "در انتظار اعتبار سنجی"),
        ("approved", "تأیید اولیه (نیاز به مدارک)"),
        ("verifying", "در انتظار تأیید مدارک"),
        ("completed", "تأیید نهایی و واریز شده"),
        ("rejected", "رد شده"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_code = models.CharField(max_length=24, unique=True, default=_generate_tracking_code)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="credit_requests")

    amount = models.BigIntegerField(default=0)  # تومان
    installments = models.PositiveIntegerField(default=12)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # ✅ برای اینکه دوبار به کیف پول واریز نشه
    credited_to_wallet = models.BooleanField(default=False)

    # مدارک (اگر هنوز نمی‌خوای، می‌تونی بعداً حذف کنی — ولی اگر حذف کنی باید migration هم هماهنگ بشه)
    national_card_front = models.FileField(upload_to="credit_docs/", null=True, blank=True)
    national_card_back = models.FileField(upload_to="credit_docs/", null=True, blank=True)
    salary_slip = models.FileField(upload_to="credit_docs/", null=True, blank=True)
    bank_statement = models.FileField(upload_to="credit_docs/", null=True, blank=True)
    birth_certificate = models.FileField(upload_to="credit_docs/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} - {self.tracking_code} - {self.status}"


class Installment(models.Model):
    credit_request = models.ForeignKey(
        CreditRequest, on_delete=models.CASCADE, related_name="installments_list"
    )
    installment_number = models.PositiveIntegerField()
    amount = models.BigIntegerField(default=0)
    due_date = models.DateField()

    paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["installment_number"]
        unique_together = ("credit_request", "installment_number")

    def __str__(self):
        return f"{self.credit_request.tracking_code} - #{self.installment_number} - {self.amount}"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_wallet_for_user(sender, instance, created, **kwargs):
    if created:
        Wallet.objects.get_or_create(user=instance)


@receiver(post_save, sender=CreditRequest)
def handle_credit_request_completed(sender, instance: CreditRequest, created, **kwargs):
    """
    وقتی درخواست 'completed' شد:
    1) اگر قبلاً واریز نشده: مبلغ رو به کیف پول اضافه کن
    2) اقساط رو بساز (اگر ساخته نشده)
    """
    if instance.status != "completed":
        return

    # ۱) واریز به کیف پول (فقط یکبار)
    if not instance.credited_to_wallet:
        wallet, _ = Wallet.objects.get_or_create(user=instance.user)
        wallet.balance = int(wallet.balance) + int(instance.amount or 0)
        wallet.save(update_fields=["balance", "updated_at"])

        instance.credited_to_wallet = True
        instance.save(update_fields=["credited_to_wallet"])

    # ۲) ساخت اقساط (اگر قبلاً ساخته نشده باشند)
    if not instance.installments_list.exists():
        interest_rate = 0.08 if int(instance.installments) == 12 else 0.12
        total_payable = int(instance.amount or 0) * (1 + interest_rate)
        monthly_amount = int(total_payable / int(instance.installments or 1))
        start_date = timezone.now().date()

        for i in range(1, int(instance.installments) + 1):
            Installment.objects.create(
                credit_request=instance,
                installment_number=i,
                amount=monthly_amount,
                due_date=start_date + timedelta(days=30 * i),
            )
