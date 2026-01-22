//  ──────────────────────────────────────────────────────────────────────
//  مسیر: app/api/payment/verify/route.ts
//  ──────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";

/* -------------------------------------------------
   مقادیر ثابت
   ------------------------------------------------- */
const MERCHANT_ID = "695e8a9ba21601002ca8fbf9";
const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://mental-shop-api.liara.run";

/* -------------------------------------------------
   هِلپر ساده برای ساخت URL ریدایرکت
   ------------------------------------------------- */
function buildRedirect(status: "success" | "failed" | "error", params: Record<string, string> = {}) {
  const baseUrl = "https://www.mental-shop.ir/credit";
  const url = new URL(baseUrl);
  url.searchParams.set("status", status);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  console.log(`[payment/verify] ریدایرکت به: ${url.toString()}`);
  return NextResponse.redirect(url);
}

/* -------------------------------------------------
   هندلر GET
   ------------------------------------------------- */
export async function GET(request: NextRequest) {
  console.log("[payment/verify] دریافت درخواست وریفای");
  
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  const orderId = searchParams.get("orderId");
  const success = searchParams.get("success");
  const status = searchParams.get("status");

  console.log("[payment/verify] پارامترها:", { trackId, orderId, success, status });

  // ---------- ۱️⃣ پارامترهای ضروری ----------
  if (!trackId || !orderId) {
    console.error("[payment/verify] پارامترهای ضروری missing");
    return buildRedirect("error", { 
      msg: "پارامترهای ضروری (trackId یا orderId) موجود نیستند" 
    });
  }

  // ---------- ۲️⃣ کاربر پرداخت را لغو کرد ----------
  if (success !== "1") {
    console.log("[payment/verify] کاربر پرداخت را لغو کرده یا موفق نبوده");
    return buildRedirect("failed");
  }

  // ---------- ۳️⃣ فراخوانی verify در Zibal ----------
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  let verifyRes: Response;

  try {
    console.log("[payment/verify] در حال ارسال verify به Zibal...", { merchant: MERCHANT_ID, trackId });
    
    verifyRes = await fetch("https://gateway.zibal.ir/v1/verify", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ 
        merchant: MERCHANT_ID, 
        trackId 
      }),
      signal: controller.signal,
    });

    console.log("[payment/verify] وضعیت پاسخ verify:", verifyRes.status);
  } catch (err: any) {
    console.error("[payment/verify] خطای شبکه در verify:", err);
    clearTimeout(timeoutId);
    
    return buildRedirect("error", { 
      msg: err.name === "AbortError" ? "timeout" : "network_error",
      trackId
    });
  } finally {
    clearTimeout(timeoutId);
  }

  // ---------- ۴️⃣ پردازش پاسخ verify ----------
  let data: any = {};
  try {
    data = await verifyRes.json();
    console.log("[payment/verify] پاسخ verify:", JSON.stringify(data));
  } catch (error) {
    console.error("[payment/verify] خطای پردازش JSON در verify:", error);
    return buildRedirect("error", { 
      msg: "invalid_zibal_response",
      trackId
    });
  }

  // ---------- ۵️⃣ بررسی نتیجهٔ verify ----------
  const isPaid = data.result === 100 || data.result === 201;
  
  if (!isPaid) {
    console.log("[payment/verify] پرداخت ناموفق یا در انتظار، کد نتیجه:", data.result);
    
    // کدهای خاص Zibal
    if (data.result === 102) {
      // قبلاً تأیید شده
      console.log("[payment/verify] تراکنش قبلاً تأیید شده");
      // ادامه می‌دهیم چون قبلاً پرداخت شده
    } else {
      // سایر خطاها
      return buildRedirect("failed", { trackId });
    }
  }

  // ---------- ۶️⃣ ثبت درخواست اعتبار در بک‌اند (فقط بعد از پرداخت موفق) ----------
  try {
    console.log("[payment/verify] در حال ثبت درخواست اعتبار در بک‌اند...");
    
    // خواندن اطلاعات کاربر از localStorage (در حالت واقعی از دیتابیس بخوانید)
    // توجه: این فقط برای نمونه است و در تولید باید از یک منبع مطمئن استفاده شود
    
    // ساخت payload برای ثبت درخواست اعتبار
    const payload = {
      track_id: trackId,
      status: "paid",
      verification_amount: 100000, // ۱۰۰,۰۰۰ تومان
      verification_paid_at: new Date().toISOString(),
      order_id: orderId,
      // اطلاعات کاربر باید از جایی خوانده شود
      // در حالت واقعی این اطلاعات باید در session یا database ذخیره شده باشد
    };

    const backendRes = await fetch(
      `${BACKEND_API}/api/credit-requests/create/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_TOKEN_HERE", // توکن باید از جایی خوانده شود
        },
        body: JSON.stringify(payload),
      }
    );

    if (backendRes.ok) {
      console.log("[payment/verify] درخواست اعتبار با موفقیت ثبت شد");
    } else {
      const errorText = await backendRes.text();
      console.error(`[payment/verify] خطای بک‌اند: ${backendRes.status}`, errorText);
    }
  } catch (error) {
    console.error("[payment/verify] خطای ارتباط با بک‌اند:", error);
  }

  // ---------- ۷️⃣ ریدایرکت نهایی ----------
  console.log("[payment/verify] ریدایرکت به موفقیت با trackId:", trackId);
  return buildRedirect("success", { trackId });
}

// برای CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}