//  ──────────────────────────────────────────────────────────────────────
//  مسیر: app/api/payment/request/route.ts
//  ──────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";

/* -------------------------------------------------
   مقادیر ثابت
   ------------------------------------------------- */
const MERCHANT_ID = "695e8a9ba21601002ca8fbf9";
const CALLBACK_BASE = "https://www.mental-shop.ir"; // یا "http://localhost:3000"
const PAYMENT_AMOUNT = 1_000_000; // ۱۰۰,۰۰۰ تومان = ۱,۰۰۰,۰۰۰ ریال (ثابت برای اعتبارسنجی)

/* -------------------------------------------------
   تابع کمکی دریافت IP سرور
   ------------------------------------------------- */
async function getServerIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: 'no-store' });
    const data = await res.json();
    return data.ip;
  } catch {
    return "نامشخص";
  }
}

/* -------------------------------------------------
   هِلپرهای ساده
   ------------------------------------------------- */
function jsonError(message: string, status: number = 400) {
  return NextResponse.json({ 
    ok: false, 
    error: message 
  }, { 
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

function jsonSuccess(data: any) {
  return NextResponse.json({ 
    ok: true, 
    data 
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  });
}

/* -------------------------------------------------
   هندلر اصلی
   ------------------------------------------------- */
export async function POST(request: NextRequest) {
  console.log("[payment/request] دریافت درخواست پرداخت");
  
  // ---------- ۱️⃣ دریافت و اعتبارسنجی بدنه ----------
  let body: { userData?: any, amount?: number };
  try {
    body = await request.json();
  } catch (error) {
    console.error("[payment/request] خطای JSON:", error);
    return jsonError("بدنهٔ درخواست نامعتبر");
  }

  const userData = body?.userData;
  const amount = PAYMENT_AMOUNT; // ✅ همیشه مبلغ ثابت اعتبارسنجی استفاده می‌شود
  
  if (!userData) {
    console.error("[payment/request] userData موجود نیست");
    return jsonError("اطلاعات کاربر الزامی است");
  }

  // ---------- ۲️⃣ ساخت شناسه یکتا برای این درخواست ----------
  const orderId = `CREDIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // ذخیره اطلاعات کاربر همراه با orderId
  const pendingData = {
    orderId,
    userData,
    timestamp: new Date().toISOString()
  };

  // در یک سیستم واقعی، اینجا باید در دیتابیس ذخیره شود
  // فعلاً فقط لاگ می‌کنیم
  console.log("[payment/request] اطلاعات کاربر ذخیره شد:", { 
    orderId, 
    fullName: userData.fullName,
    creditAmount: userData.creditAmount, // مقدار وام درخواستی
    verificationAmount: amount // مبلغ اعتبارسنجی
  });

  // ---------- ۳️⃣ ساخت URL callback ----------
  const callbackUrl = `${CALLBACK_BASE}/api/payment/verify?orderId=${encodeURIComponent(orderId)}`;
  console.log("[payment/request] Callback URL:", callbackUrl);

  // ---------- ۴️⃣ فراخوانی Zibal با timeout (افزایش یافته به ۳۰ ثانیه) ----------
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000); // تغییر از ۱۵,۰۰۰ به ۳۰,۰۰۰

  let zibalRes: Response;
  try {
    console.log("[payment/request] در حال ارسال به Zibal...", {
      merchant: MERCHANT_ID,
      amount: amount, // ۱,۰۰۰,۰۰۰ ریال = ۱۰۰,۰۰۰ تومان
      orderId,
      callbackUrl
    });

    zibalRes = await fetch("https://gateway.zibal.ir/v1/request", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        merchant: MERCHANT_ID,
        amount: amount, // ✅ مبلغ ثابت اعتبارسنجی
        orderId,
        callbackUrl,
        description: `اعتبارسنجی خرید - ${userData.fullName}`,
      }),
      signal: controller.signal,
    });

    console.log("[payment/request] وضعیت پاسخ Zibal:", zibalRes.status);
  } catch (err: any) {
    console.error("[payment/request] خطای شبکه:", err);
    clearTimeout(timeoutId);
    
    // دریافت آی‌پی سرور برای عیب‌یابی
    const serverIp = await getServerIP();
    
    const isTimeout = err.name === "AbortError";
    const msg = isTimeout 
      ? `پاسخ درگاه پرداخت بیش از حد طولانی شد (۳۰ ثانیه). آی‌پی سرور شما: ${serverIp}`
      : `خطای ارتباط با درگاه پرداخت. آی‌پی سرور شما: ${serverIp}`;

    return NextResponse.json({ 
      ok: false, 
      error: msg,
      hint: `آی‌پی ${serverIp} را در پنل زیبای ثبت کنید.`
    }, { status: 504 }); // تغییر وضعیت به 504 برای تایم‌اوت
  } finally {
    clearTimeout(timeoutId);
  }

  // ---------- ۵️⃣ پردازش پاسخ Zibal ----------
  let data: any = {};
  try {
    data = await zibalRes.json();
    console.log("[payment/request] پاسخ Zibal:", JSON.stringify(data));
  } catch (error) {
    console.error("[payment/request] خطای پردازش JSON پاسخ:", error);
    return jsonError("پاسخ نامعتبر از درگاه پرداخت", 502);
  }

  // موفقیت: result = 100
  if (data.result === 100) {
    const paymentUrl = `https://gateway.zibal.ir/start/${data.trackId}`;
    console.log("[payment/request] پرداخت موفق، URL:", paymentUrl);
    
    return jsonSuccess({ 
      url: paymentUrl, 
      trackId: data.trackId,
      orderId: orderId
    });
  }

  // خطاهای دیگر Zibal
  console.error("[payment/request] خطای Zibal:", data);
  
  // تشخیص نوع خطا
  let errorMessage = "خطای ناشناخته در سرویس پرداخت";
  switch (data.result) {
    case 102:
      errorMessage = "مرچنت کد یافت نشد";
      break;
    case 103:
      errorMessage = "مرچنت کد غیرفعال است";
      break;
    case 104:
      errorMessage = "مرچنت کد معتبر نیست";
      break;
    case 105:
      errorMessage = "مبلغ کمتر از حداقل مجاز است";
      break;
    case 106:
      errorMessage = "درخواست نامعتبر";
      break;
    case 201:
      errorMessage = "قبلاً تایید شده است";
      break;
    default:
      errorMessage = data.message || errorMessage;
  }

  return jsonError(`Zibal: ${errorMessage} (کد: ${data.result})`, 400);
}

// برای CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}