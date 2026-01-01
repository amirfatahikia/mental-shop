"use client";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Headphones,
  BadgeCheck,
  HeartHandshake,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] p-6 md:p-20 font-black italic" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white p-10 md:p-16 rounded-[3rem] shadow-sm border border-gray-100 relative overflow-hidden">
        {/* نوار رنگی بالا */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-l from-blue-600 via-indigo-500 to-blue-600"></div>

        {/* دکور ملایم */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* هدر صفحه */}
        <div className="flex justify-between items-center mb-12 relative">
          <h1 className="text-3xl md:text-4xl text-gray-900 border-r-8 border-blue-600 pr-4">
            درباره ما
          </h1>

          <Link
            href="/"
            className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-blue-600 transition-all border border-gray-100"
            aria-label="بازگشت"
          >
            <ArrowRight size={24} />
          </Link>
        </div>

        {/* معرفی */}
        <div className="space-y-8 text-gray-600 leading-9 text-sm md:text-base relative">
          <section>
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              MENTAL SHOP چی هست؟
            </h2>
            <p>
              MENTAL SHOP یک فروشگاه آنلاین با تمرکز روی تجربه‌ی خرید «ساده، سریع و شیک» هست.
              هدف ما اینه که شما با کمترین کلیک، بهترین انتخاب رو انجام بدین و از لحظه‌ی ورود تا
              دریافت سفارش، همه‌چیز شفاف و قابل پیگیری باشه.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <HeartHandshake size={18} className="text-blue-600" />
              وعده‌ی ما به شما
            </h2>
            <p>
              ما روی جزئیات حساسیم: طراحی تمیز، اطلاعات محصول واضح، و پشتیبانی واقعی.
              هیچ چیز برای ما مهم‌تر از این نیست که تجربه‌ی شما از خرید، حس خوب و اعتماد بسازه.
            </p>
          </section>

          {/* کارت‌های ویژگی */}
          <section className="mt-8">
            <h2 className="text-lg text-gray-900 mb-4">چرا MENTAL SHOP؟</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-gray-900 text-base">پرداخت امن</h3>
                </div>
                <p className="text-[12px] md:text-sm text-gray-500 font-bold leading-7">
                  ارتباطات امن، پرداخت مطمئن و احترام کامل به حریم خصوصی کاربران.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center">
                    <Truck size={20} />
                  </div>
                  <h3 className="text-gray-900 text-base">ارسال سریع</h3>
                </div>
                <p className="text-[12px] md:text-sm text-gray-500 font-bold leading-7">
                  تلاش می‌کنیم سفارش‌ها با سرعت بالا پردازش و ارسال بشن تا منتظر نمونید.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center">
                    <BadgeCheck size={20} />
                  </div>
                  <h3 className="text-gray-900 text-base">کیفیت و اصالت</h3>
                </div>
                <p className="text-[12px] md:text-sm text-gray-500 font-bold leading-7">
                  معرفی دقیق محصول و تلاش برای ارائه‌ی انتخاب‌های مطمئن و قابل اعتماد.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center">
                    <Headphones size={20} />
                  </div>
                  <h3 className="text-gray-900 text-base">پشتیبانی واقعی</h3>
                </div>
                <p className="text-[12px] md:text-sm text-gray-500 font-bold leading-7">
                  اگر سوال یا مشکلی باشه، سریع جواب می‌دیم و کنار شما هستیم.
                </p>
              </div>
            </div>
          </section>

          {/* جمله پایانی */}
          <div className="mt-12 p-6 bg-gray-50 rounded-[2rem] flex items-center gap-4 border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
              <Sparkles size={22} />
            </div>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold leading-7">
              ما هر روز روی بهتر شدن تجربه‌ی خرید شما کار می‌کنیم. ممنون که MENTAL SHOP رو انتخاب کردید 💙
            </p>
          </div>

          {/* دکمه‌ها */}
          <div className="mt-10 flex flex-col md:flex-row gap-3">
            <Link
              href="/terms"
              className="flex-1 text-center px-6 py-4 rounded-[2rem] bg-white border border-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all"
            >
              شرایط استفاده
            </Link>
            <Link
              href="/privacy"
              className="flex-1 text-center px-6 py-4 rounded-[2rem] bg-white border border-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all"
            >
              حریم خصوصی
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
