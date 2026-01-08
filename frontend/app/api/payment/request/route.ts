// مسیر فایل: app/api/payment/request/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    // ⚠️ اگر دامنه‌ات در زیبال بدون www است، این را تغییر بده
    const baseUrl = "https://www.mental-shop.ir"; 

    const zibalResponse = await fetch("https://gateway.zibal.ir/v1/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: "695e8a9ba21601002ca8fbf9",
        amount: 1000000,
        callbackUrl: `${baseUrl}/api/payment/verify?orderId=${orderId}`,
        orderId: orderId,
        description: "اعتبارسنجی حساب کاربری منتال شاپ",
      }),
    });

    const data = await zibalResponse.json();

    if (data.result === 100) {
      return NextResponse.json({ success: true, url: `https://gateway.zibal.ir/start/${data.trackId}` });
    } else {
      // این خط را اضافه کردیم تا در کنسول مرورگر دقیقاً ببینیم مشکل چیست
      console.error("Zibal Response Error:", data);
      return NextResponse.json({ error: "Zibal Error", result: data.result, message: data.message }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Server Connection Error" }, { status: 500 });
  }
}