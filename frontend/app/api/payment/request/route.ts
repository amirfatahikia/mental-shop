import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // ⚠️ مهم: این آدرس باید دقیقاً همانی باشد که در پنل زیبال تایید کردید
    const baseUrl = "https://www.mental-shop.ir";

    const zibalResponse = await fetch("https://gateway.zibal.ir/v1/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: "695e8a9ba21601002ca8fbf9", // مرچنت کد واقعی شما
        amount: 1000000, // ۱۰۰ هزار تومان به ریال
        callbackUrl: `${baseUrl}/api/payment/verify?orderId=${orderId}`,
        orderId: orderId,
        description: "هزینه استعلام اعتبار حساب منتال شاپ",
        direct: false // روی false بماند تا تاییدیه شاپرک نهایی شود
      }),
    });

    const data = await zibalResponse.json();

    if (data.result === 100) {
      return NextResponse.json({
        success: true,
        url: `https://gateway.zibal.ir/start/${data.trackId}`,
        trackId: data.trackId,
      });
    } else {
      // این بخش کد خطا را برمی‌گرداند تا در تب Network ببینیم
      return NextResponse.json(
        { error: "Zibal Error", code: data.result, message: data.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}