import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    // بررسی وجود کد سفارش
    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    // تنظیم آدرس پایه برای محیط تولید یا لوکال
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mental-shop.ir";

    // درخواست به درگاه زیبال برای ایجاد تراکنش
    const zibalResponse = await fetch("https://gateway.zibal.ir/v1/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: "695e8a9ba21601002ca8fbf9", // کد مرچنت شما
        amount: 1000000, // مبلغ ۱۰۰,۰۰۰ تومان به ریال (اصلاح شد)
        callbackUrl: `${baseUrl}/api/payment/verify?orderId=${orderId}`,
        orderId: orderId,
        description: "هزینه استعلام اعتبارسنجی حساب کاربر",
        direct: false // جهت جلوگیری از خطای ۱۱۵ تا زمان تایید شاپرک
      }),
    });

    const data = await zibalResponse.json();

    // بررسی نتیجه درخواست از زیبال
    if (data.result === 100) {
      return NextResponse.json({
        success: true,
        url: `https://gateway.zibal.ir/start/${data.trackId}`, // لینک هدایت به بانک
        trackId: data.trackId,
      });
    } else {
      // مدیریت خطاهای احتمالی زیبال مانند IP نامعتبر (کد ۳)
      return NextResponse.json(
        { error: "Failed to create payment", code: data.result, message: data.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Payment request error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}