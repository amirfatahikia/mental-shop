from django.db import transaction
from credit.models import Wallet


class InsufficientWallet(Exception):
    def __init__(self, balance: int, need: int):
        self.balance = int(balance)
        self.need = int(need)
        super().__init__("insufficient_wallet")


@transaction.atomic
def pay_with_wallet(user, amount: int):
    amount = int(amount or 0)
    wallet, _ = Wallet.objects.select_for_update().get_or_create(user=user)

    balance = int(wallet.inventory or 0)
    if balance < amount:
        raise InsufficientWallet(balance=balance, need=amount - balance)

    wallet.inventory = balance - amount
    wallet.save(update_fields=["inventory"])
    return wallet
