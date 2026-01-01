from django.db.utils import OperationalError
from django.contrib.auth.models import User

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Wallet, UserAddress, CreditRequest, Installment
from .serializers import (
    UserProfileSerializer,
    UserAddressSerializer,
    CreditRequestSerializer,
    InstallmentSerializer,
)


class UserProfileAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        data = {
            "fullName": (request.user.get_full_name() or request.user.username or ""),
            "wallet_balance": int(wallet.balance or 0),
        }
        return Response(data, status=status.HTTP_200_OK)


class UserAddressListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserAddressSerializer

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user).order_by("-created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class UserAddressDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserAddressSerializer

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class MyCreditRequestsAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CreditRequestSerializer

    def get_queryset(self):
        # اگر DB migration عقب باشه، اینجا ممکنه بخوره به OperationalError
        return CreditRequest.objects.filter(user=self.request.user).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except OperationalError:
            # ✅ به جای 500 خام، یک پیام واضح می‌دیم که مشکل از migration ـه
            return Response(
                {"detail": "migration_required", "hint": "python manage.py makemigrations && python manage.py migrate"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class MyCreditRequestDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CreditRequestSerializer
    lookup_field = "id"

    def get_queryset(self):
        return CreditRequest.objects.filter(user=self.request.user)


class CreditRequestCreateAPIView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CreditRequestSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, status="pending")


class CreditRequestInstallmentsAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InstallmentSerializer

    def get_queryset(self):
        credit_id = self.kwargs.get("credit_id")
        return Installment.objects.filter(credit_request__id=credit_id, credit_request__user=self.request.user)
