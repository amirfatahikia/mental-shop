import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // آدرس دقیق دامنه برای بازگشت از بانک
    const baseUrl = "https://www.mental-shop.ir";

    const zibalResponse = await fetch("https://gateway.zibal.ir/v1/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: "695e8a9ba21601002ca8fbf9", // مرچنت تایید شده شما
        amount: 1000000, // مبلغ ۱۰۰ هزار تومان به ریال
        callbackUrl: `${baseUrl}/api/payment/verify?orderId=${orderId}`, // مسیر تایید
        orderId: orderId,
        description: "هزینه استعلام اعتبارسنجی منتال شاپ",
        direct: false 
      }),
    });

    const data = await zibalResponse.json();

    if (data.result === 100) {
      return NextResponse.json({
        success: true,
        url: `https://gateway.zibal.ir/start/${data.trackId}`, // لینک هدایت به بانک
        trackId: data.trackId,
      });
    } else {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}