import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  const success = searchParams.get("success");
  const orderId = searchParams.get("orderId"); // کد رهگیری داخلی ما

  // اگر پرداخت موفق نبود یا انصراف داد
  if (success !== "1") {
    return NextResponse.redirect(
      new URL(`/credit?step=2&status=failed&orderId=${orderId}`, request.url)
    );
  }

  try {
    // تایید پرداخت با زیبال
    const response = await fetch("https://gateway.zibal.ir/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: "695e8a9ba21601002ca8fbf9",
        trackId: trackId,
      }),
    });

    const data = await response.json();

    if (data.result === 100) {
      // اینجا باید در دیتابیس وضعیت درخواست را به "پرداخت شده" تغییر دهید
      // و تراکنش را ثبت کنید
      
      // سپس کاربر را به صفحه اعتبار با موفقیت هدایت کنید
      return NextResponse.redirect(
        new URL(`/credit?status=success&trackId=${trackId}&orderId=${orderId}`, request.url)
      );
    }
    
    return NextResponse.redirect(
      new URL(`/credit?step=2&status=failed&orderId=${orderId}`, request.url)
    );
  } catch (err) {
    console.error("Verify error:", err);
    return NextResponse.redirect(
      new URL(`/credit?step=2&status=server-error&orderId=${orderId}`, request.url)
    );
  }
}