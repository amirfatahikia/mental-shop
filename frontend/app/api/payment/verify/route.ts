import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  const success = searchParams.get("success");
  const orderId = searchParams.get("orderId");

  // ۱. اگر کاربر در بانک انصراف داد یا تراکنش ناموفق بود
  if (success !== "1") {
    return NextResponse.redirect(new URL(`/credit?status=failed`, request.url));
  }

  try {
    // ۲. استعلام نهایی از سرور زیبال
    const response = await fetch("https://gateway.zibal.ir/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: "695e8a9ba21601002ca8fbf9",
        trackId: trackId,
      }),
    });

    const data = await response.json();

    // ۳. اگر زیبال تایید کرد (کد ۱۰۰ یا ۱۰۲)
    if (data.result === 100 || data.result === 102) {
      
      // ✅ اتصال به جنگو: آپدیت دیتابیس در لیارا
      await fetch(`https://mental-shop-api.liara.run/api/credit/confirm-payment/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          order_id: orderId, 
          track_id: trackId,
          status: 'paid' 
        }),
      });

      // هدایت به صفحه موفقیت در فرانت‌اِند
      return NextResponse.redirect(
        new URL(`/credit?status=success&trackId=${trackId}`, request.url)
      );
    }
    
    return NextResponse.redirect(new URL(`/credit?status=failed`, request.url));
  } catch (err) {
    return NextResponse.redirect(new URL(`/credit?status=error`, request.url));
  }
}