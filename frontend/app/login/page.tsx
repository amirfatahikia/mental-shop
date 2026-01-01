"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// استفاده از Suspense برای جلوگیری از خطاهای احتمالی Next.js هنگام خواندن SearchParams
function LoginForm() {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // ۱. خواندن آدرس بازگشت از URL (اگر وجود نداشت، پیش‌فرض برو به صفحه اصلی)
  const redirectTo = searchParams.get("redirect") || "/";

  const toEnglishDigits = (str: string) => str.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usernameEN = toEnglishDigits(credentials.username);

      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameEN,
          password: credentials.password
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // ذخیره توکن در مرورگر
        localStorage.setItem("access_token", data.access);

        // ✅ ذخیره شماره موبایل برای نمایش در پروفایل (Front-only)
        localStorage.setItem("user_phone", usernameEN);

        // ۲. ایجاد ایونت برای آپدیت آنی هدر و سایدبار (نمایش نام کاربر)
        window.dispatchEvent(new Event('storage'));

        // ۳. انتقال هوشمند به آدرس مقصد یا صفحه اصلی
        router.push(redirectTo);
      } else {
        alert("شماره موبایل یا رمز عبور اشتباه است.");
      }
    } catch (err) {
      alert("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">ورود به حساب کاربری</h1>
        <p className="text-gray-500 font-bold text-sm">شماره موبایل و رمز عبور خود را وارد کنید</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-black text-gray-400 mb-2 pr-2">شماره موبایل</label>
          <input
            type="text"
            dir="ltr"
            placeholder="09123456789"
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 outline-none focus:border-blue-500 text-center tracking-widest transition-all"
            required
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 mb-2 pr-2">رمز عبور</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 outline-none focus:border-blue-500 transition-all text-right"
            required
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 transition-all disabled:bg-gray-400"
        >
          {loading ? "در حال بررسی..." : "ورود به سامانه"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-50 text-center">
        <p className="text-sm text-gray-500 font-bold">
          هنوز حساب ندارید؟{" "}
          <Link href="/register" className="text-blue-600 font-black hover:underline">
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </div>
  );
}

// کامپوننت اصلی با پوشش Suspense
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6" dir="rtl">
      <Suspense fallback={<div className="font-black">در حال بارگذاری...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
