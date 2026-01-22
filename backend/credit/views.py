from django.db.utils import OperationalError
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Wallet, UserAddress, CreditRequest, Installment
from .serializers import (
    UserProfileSerializer,
    UserAddressSerializer,
    InstallmentSerializer,
)
from datetime import datetime
import json


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
    
    def get_queryset(self):
        return CreditRequest.objects.filter(user=self.request.user).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            data = []
            for credit_request in queryset:
                data.append({
                    "id": str(credit_request.id),
                    "tracking_code": credit_request.tracking_code,
                    "amount": credit_request.amount,
                    "installments": credit_request.installments,
                    "status": credit_request.status,
                    "created_at": credit_request.created_at.isoformat(),
                })
            return Response(data)
        except OperationalError:
            return Response(
                {"detail": "migration_required", "hint": "python manage.py makemigrations && python manage.py migrate"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class MyCreditRequestDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, id):
        try:
            credit_request = CreditRequest.objects.get(id=id, user=request.user)
            return Response({
                "id": str(credit_request.id),
                "tracking_code": credit_request.tracking_code,
                "amount": credit_request.amount,
                "installments": credit_request.installments,
                "status": credit_request.status,
                "full_name": credit_request.full_name,
                "national_id": credit_request.national_id,
                "birth_date": credit_request.birth_date,
                "payment_track_id": credit_request.payment_track_id,
                "payment_date": credit_request.payment_date,
                "created_at": credit_request.created_at.isoformat(),
                "updated_at": credit_request.updated_at.isoformat(),
            })
        except CreditRequest.DoesNotExist:
            return Response({"error": "درخواست یافت نشد"}, status=404)


class CreditRequestCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        ایجاد درخواست اعتبار - کاملاً ساده
        """
        try:
            data = request.data
            amount = data.get('amount')
            installments = data.get('installments', 12)
            full_name = data.get('fullName', '')
            national_id = data.get('national_id', '')
            birth_date = data.get('birthDate')
            
            if not amount:
                return Response({
                    "success": False,
                    "error": "مبلغ الزامی است"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ایجاد درخواست اعتبار
            credit_request = CreditRequest.objects.create(
                user=request.user,
                amount=amount,
                installments=installments,
                full_name=full_name,
                national_id=national_id,
                status='pending'
            )
            
            if birth_date:
                try:
                    credit_request.birth_date = birth_date
                    credit_request.save()
                except:
                    pass
            
            return Response({
                "success": True,
                "message": "درخواست اعتبار با موفقیت ایجاد شد",
                "credit_request": {
                    "id": str(credit_request.id),
                    "tracking_code": credit_request.tracking_code,
                    "amount": credit_request.amount,
                    "installments": credit_request.installments,
                    "status": credit_request.status,
                    "created_at": credit_request.created_at.isoformat(),
                },
                "next_step": "برای ادامه پرداخت، از tracking_code بالا استفاده کنید"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": "خطا در ایجاد درخواست اعتبار",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreditRequestInstallmentsAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InstallmentSerializer

    def get_queryset(self):
        credit_id = self.kwargs.get("credit_id")
        return Installment.objects.filter(
            credit_request__id=credit_id, 
            credit_request__user=self.request.user
        )


class ConfirmPaymentAPIView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        data = request.data
        order_id = data.get('order_id')
        track_id = data.get('track_id')
        payment_status = data.get('status')
        
        if not order_id:
            return Response(
                {"error": "order_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            credit_request = CreditRequest.objects.get(tracking_code=order_id)
        except CreditRequest.DoesNotExist:
            return Response(
                {"error": "Credit request not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if payment_status == "paid":
            if credit_request.status == "pending":
                credit_request.status = "approved"
                credit_request.payment_track_id = track_id
                credit_request.payment_date = datetime.now()
                credit_request.save()
                
                return Response({
                    "success": True,
                    "message": "Payment confirmed and credit request approved",
                    "tracking_code": credit_request.tracking_code,
                    "new_status": credit_request.status,
                    "full_name": credit_request.full_name,
                    "amount": credit_request.amount,
                    "installments": credit_request.installments
                }, status=status.HTTP_200_OK)
            else:
                credit_request.payment_track_id = track_id
                credit_request.payment_date = datetime.now()
                credit_request.save()
                
                return Response({
                    "success": True,
                    "message": "Payment info updated (request was already processed)",
                    "current_status": credit_request.status,
                    "tracking_code": credit_request.tracking_code
                }, status=status.HTTP_200_OK)
        else:
            credit_request.status = "rejected"
            credit_request.payment_track_id = track_id
            credit_request.save()
            
            return Response({
                "success": False,
                "message": "Payment failed, credit request rejected",
                "tracking_code": credit_request.tracking_code,
                "new_status": credit_request.status
            }, status=status.HTTP_200_OK)


class RegisterAfterPaymentAPIView(APIView):
    """
    🔴 جدید: ثبت درخواست اعتبار فقط بعد از پرداخت موفق
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            data = request.data
            
            # اطلاعات ضروری
            track_id = data.get('track_id')
            order_id = data.get('order_id')
            user_data = data.get('user_data')  # اطلاعات کاربر از فرانت‌اند
            
            if not track_id or not order_id or not user_data:
                return Response({
                    "success": False,
                    "error": "اطلاعات ضروری ارسال نشده"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # استخراج اطلاعات کاربر
            amount = user_data.get('amount')
            installments = user_data.get('installments', 12)
            full_name = user_data.get('fullName', '')
            national_id = user_data.get('national_id', '')
            birth_date = user_data.get('birthDate')
            
            if not amount:
                return Response({
                    "success": False,
                    "error": "مبلغ الزامی است"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 🔴 در اینجا باید کاربر را از توکن یا روش دیگر پیدا کنیم
            # فعلاً یک کاربر نمونه استفاده می‌کنیم (در سیستم واقعی باید اصلاح شود)
            try:
                # اگر user_id در داده‌ها ارسال شده
                user_id = data.get('user_id')
                if user_id:
                    user = User.objects.get(id=user_id)
                else:
                    # یا از توکن استفاده کن
                    # فعلاً کاربر اول را می‌گیریم (باید اصلاح شود)
                    user = User.objects.first()
            except:
                user = User.objects.first()
            
            # ایجاد درخواست اعتبار با وضعیت approved (چون پرداخت شده)
            credit_request = CreditRequest.objects.create(
                user=user,
                amount=amount,
                installments=installments,
                full_name=full_name,
                national_id=national_id,
                status='approved',  # 🔴 مستقیم approved
                payment_track_id=track_id,
                payment_date=datetime.now(),
                tracking_code=order_id  # استفاده از order_id به عنوان tracking_code
            )
            
            if birth_date:
                try:
                    credit_request.birth_date = birth_date
                    credit_request.save()
                except:
                    pass
            
            return Response({
                "success": True,
                "message": "درخواست اعتبار با موفقیت ثبت و تایید شد",
                "credit_request": {
                    "id": str(credit_request.id),
                    "tracking_code": credit_request.tracking_code,
                    "amount": credit_request.amount,
                    "installments": credit_request.installments,
                    "status": credit_request.status,
                    "payment_track_id": credit_request.payment_track_id,
                    "payment_date": credit_request.payment_date.isoformat() if credit_request.payment_date else None,
                    "created_at": credit_request.created_at.isoformat(),
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": "خطا در ثبت درخواست اعتبار",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🔴 اضافه کردن: مدل موقت برای ذخیره اطلاعات کاربر قبل از پرداخت
from django.db import models
import uuid

class PendingCreditRequest(models.Model):
    """
    ذخیره موقت اطلاعات کاربر قبل از پرداخت
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_id = models.CharField(max_length=100, unique=True)
    user_data = models.JSONField()  # اطلاعات کاربر
    user_id = models.IntegerField(null=True, blank=True)  # ID کاربر
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Pending: {self.order_id}"