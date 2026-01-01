"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // تبدیل اعداد فارسی به انگلیسی
  const toEnglishDigits = (str: string) => str.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          username: toEnglishDigits(formData.phone),
          password: formData.password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("access_token", data.access);

        // ✅ ذخیره شماره موبایل و نام در لوکال برای نمایش در پروفایل (Front-only)
        localStorage.setItem("user_phone", toEnglishDigits(formData.phone));
        localStorage.setItem("user_fullName", formData.fullName || "");

        // ✅ آپدیت آنی هدر/سایدبار
        window.dispatchEvent(new Event("storage"));

        router.push("/");
      } else {
        const errorData = await res.json();
        alert(errorData?.error || "خطا در ثبت‌نام");
      }
    } catch {
      alert("خطا در برقراری ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-900 mb-2">ثبت‌نام در MENTAL SHOP</h1>
          <p className="text-gray-500 font-bold text-sm">یک حساب کاربری جدید بسازید</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-400 mb-2 pr-2">نام و نام خانوادگی</label>
            <input
              type="text"
              placeholder="مثلاً علی احمدی"
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 outline-none focus:border-blue-500 transition-all text-right"
              required
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 mb-2 pr-2">شماره موبایل</label>
            <input
              type="text"
              dir="ltr"
              placeholder="09123456789"
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 outline-none focus:border-blue-500 text-center tracking-widest transition-all"
              required
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 mb-2 pr-2">رمز عبور</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 outline-none focus:border-blue-500 transition-all text-right"
              required
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 transition-all disabled:bg-gray-400"
          >
            {loading ? "در حال ثبت‌نام..." : "ساخت حساب کاربری"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-50 text-center">
          <p className="text-sm text-gray-500 font-bold">
            حساب دارید؟{" "}
            <Link href="/login" className="text-blue-600 font-black hover:underline">
              وارد شوید
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
