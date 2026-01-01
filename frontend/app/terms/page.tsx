"use client";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] p-6 md:p-20 font-black italic" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-[3rem] shadow-sm border border-gray-100 relative overflow-hidden">
        {/* دکوراسیون پشت زمینه */}
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl md:text-4xl text-gray-900 border-r-8 border-blue-600 pr-4">شرایط استفاده</h1>
          <Link href="/" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-blue-600 transition-all">
            <ArrowRight size={24} />
          </Link>
        </div>

        <div className="space-y-10 text-gray-600 leading-9 text-sm md:text-base">
          <section>
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              ۱. حساب کاربری و ثبت‌نام
            </h2>
            <p>
              برای استفاده از خدمات کامل MENTAL SHOP، شما متعهد می‌شوید که در هنگام ثبت‌نام، اطلاعات واقعی شامل نام کامل و شماره تماس خود را وارد نمایید. مسئولیت حفظ امنیت رمز عبور و دسترسی به پنل کاربری مستقیماً بر عهده شماست.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              ۲. خرید و تراکنش‌های مالی
            </h2>
            <p>
              هرگونه شارژ کیف پول یا خرید اقساطی در سایت، پس از تایید نهایی توسط سیستم و دریافت کد رهگیری معتبر تلقی می‌شود. مبالغ موجود در کیف پول فقط برای خرید از محصولات داخل سایت قابل استفاده می‌باشد.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              ۳. مالکیت معنوی
            </h2>
            <p>
              تمامی محتوا، طراحی‌های گرافیکی، کدها و برند تجاری MENTAL SHOP متعلق به این مجموعه بوده و هرگونه کپی‌برداری غیرقانونی پیگرد قانونی خواهد داشت.
            </p>
          </section>
        </div>

        <div className="mt-16 p-6 bg-gray-50 rounded-[2rem] flex items-center gap-4 border border-gray-100">
          <ShieldCheck className="text-blue-600" size={32} />
          <p className="text-[10px] md:text-xs text-gray-400 font-bold">
            استفاده شما از این وب‌سایت به منزله پذیرش تمامی قوانین فوق می‌باشد. ما این حق را برای خود محفوظ می‌داریم که در هر زمان قوانین را به‌روزرسانی کنیم.
          </p>
        </div>
      </div>
    </div>
  );
}