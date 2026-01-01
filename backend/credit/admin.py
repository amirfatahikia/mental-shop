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
    list_display = ("id", "user", "tracking_code", "amount", "installments", "status", "credited_to_wallet", "created_at")
    search_fields = ("user__username", "tracking_code")
    list_filter = ("status", "installments", "credited_to_wallet")
    readonly_fields = ("tracking_code", "created_at", "updated_at")


@admin.register(Installment)
class InstallmentAdmin(admin.ModelAdmin):
    list_display = ("id", "credit_request", "installment_number", "amount", "due_date", "paid", "paid_at")
    list_filter = ("paid",)
