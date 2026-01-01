"use client";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] p-6 md:p-20 font-black italic" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-[3rem] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-900"></div>

        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl md:text-4xl text-gray-900 border-r-8 border-gray-900 pr-4">حریم خصوصی</h1>
          <Link href="/" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-all">
            <ArrowRight size={24} />
          </Link>
        </div>

        <div className="space-y-10 text-gray-600 leading-9 text-sm md:text-base">
          <section>
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Lock size={18} className="text-gray-400" />
              چه اطلاعاتی را جمع‌آوری می‌کنیم؟
            </h2>
            <p>
              ما فقط اطلاعاتی را که برای پردازش سفارشات و احراز هویت شما لازم است (مانند شماره تماس، نام و آدرس برای ارسال کالا) جمع‌آوری می‌کنیم. تمامی رمزهای عبور شما به‌صورت رمزنگاری شده (Hash) در دیتابیس ذخیره می‌شوند و هیچ‌کس حتی مدیران سایت به آن‌ها دسترسی ندارند.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Lock size={18} className="text-gray-400" />
              استفاده از حافظه مرورگر (LocalStorage)
            </h2>
            <p>
              سایت MENTAL SHOP از حافظه مرورگر شما فقط برای نگهداری توکن ورود (Access Token) و اقلام سبد خرید استفاده می‌کند. این کار باعث می‌شود تا پس از بستن مرورگر، وضعیت سبد خرید شما حفظ شده و نیاز به ورود مجدد در هر بار بازدید نباشد.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Lock size={18} className="text-gray-400" />
              امنیت تراکنش‌ها
            </h2>
            <p>
              اطلاعات بانکی شما مستقیماً در درگاه‌های ایمن بانکی وارد شده و به هیچ عنوان در سرورهای ما ذخیره نمی‌شوند. ما از پروتکل SSL برای رمزنگاری تمامی ارتباطات بین مرورگر شما و سرور استفاده می‌کنیم.
            </p>
          </section>
        </div>

        <div className="mt-16 text-center">
          <p className="text-[11px] text-gray-300 font-bold italic">
            اطلاعات شما نزد ما امانت است و هرگز در اختیار شخص ثالث قرار نخواهد گرفت.
          </p>
        </div>
      </div>
    </div>
  );
}