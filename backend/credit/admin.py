from django.contrib import admin

from .models import Wallet, UserAddress, CreditRequest, Installment


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "balance", "updated_at")
    search_fields = ("user__username", "user__email")


@admin.register(UserAddress)
class UserAddressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "fullName", "phoneNumber", "city", "created_at")
    search_fields = ("user__username", "fullName", "phoneNumber", "nationalCode", "postalCode")
    list_filter = ("city",)


@admin.register(CreditRequest)
class CreditRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id", 
        "user", 
        "tracking_code", 
        "full_name",
        "national_id",
        "amount", 
        "installments", 
        "status", 
        "credited_to_wallet",
        "payment_track_id",
        "created_at"
    )
    search_fields = ("user__username", "tracking_code", "full_name", "national_id", "payment_track_id")
    list_filter = ("status", "installments", "credited_to_wallet")
    readonly_fields = ("tracking_code", "created_at", "updated_at")
    
    # نمایش فیلدهای جدید در صفحه ویرایش
    fieldsets = (
        ("اطلاعات اصلی", {
            'fields': ('user', 'tracking_code', 'amount', 'installments', 'status')
        }),
        ("اطلاعات هویتی", {
            'fields': ('full_name', 'national_id', 'birth_date')
        }),
        ("اطلاعات پرداخت", {
            'fields': ('payment_track_id', 'payment_date', 'credited_to_wallet')
        }),
        ("مدارک", {
            'fields': (
                'national_card_front', 'national_card_back',
                'salary_slip', 'bank_statement', 'birth_certificate'
            )
        }),
        ("تاریخ‌ها", {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Installment)
class InstallmentAdmin(admin.ModelAdmin):
    list_display = ("id", "credit_request", "installment_number", "amount", "due_date", "paid", "paid_at")
    list_filter = ("paid",)
    search_fields = ("credit_request__tracking_code", "credit_request__user__username")