"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Wallet,
  ShieldCheck,
  ArrowRight,
  UserCircle2,
  Mail,
  Phone,
  Save,
  RefreshCw,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userData, setUserData] = useState<any>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // ✅ شماره موبایل فقط نمایشی و غیرقابل ویرایش
  const [phoneNumber, setPhoneNumber] = useState("");

  const IP_ADDRESS = "mental-shop-api.liara.run";

  const safeLocal = (key: string, fallback = "") => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  };

  const toEnglishDigits = (str: string) =>
    (str || "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());

  const loadProfile = async () => {
    const token = safeLocal("access_token", "");
    if (!token) {
      router.push("/login?redirect=/profile");
      return;
    }

    setLoading(true);

    // ✅ همیشه از localStorage شماره موبایل رو هم داریم (Front-only)
    const storedPhone = safeLocal("user_phone", "");
    const storedFullName = safeLocal("user_fullName", "");

    try {
      const res = await fetch(`https://${IP_ADDRESS}/api/user-profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // اگر توکن مشکل داشت
        setUserData(null);
        setFullName(storedFullName || "");
        setEmail("");
        setPhoneNumber(storedPhone || "");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUserData(data);

      // داده‌های قابل ویرایش
      setFullName(data?.fullName || storedFullName || "");
      setEmail(data?.email || "");

      // ✅ شماره موبایل از API اگر داشت، وگرنه از localStorage
      const apiPhone =
        data?.phoneNumber ||
        data?.phone ||
        data?.mobile ||
        data?.username || // بعضی بک‌اندها username رو شماره می‌گیرن
        "";

      const finalPhone = toEnglishDigits(String(apiPhone || storedPhone || ""));
      setPhoneNumber(finalPhone);

      // برای اینکه همیشه همگام بمونه
      if (finalPhone) localStorage.setItem("user_phone", finalPhone);
      if (data?.fullName) localStorage.setItem("user_fullName", data.fullName);

      setLoading(false);
    } catch {
      // fallback offline
      setUserData(null);
      setFullName(storedFullName || "");
      setEmail("");
      setPhoneNumber(storedPhone || "");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (saving) return;

    const token = safeLocal("access_token", "");
    if (!token) {
      router.push("/login?redirect=/profile");
      return;
    }

    setSaving(true);
    try {
      // ✅ شماره موبایل ارسال نمی‌شود (غیرقابل ویرایش)
      const body: any = {
        fullName,
        email,
      };

      const res = await fetch(`https://${IP_ADDRESS}/api/user-profile/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // ✅ ذخیره در لوکال برای UI
        localStorage.setItem("user_fullName", fullName || "");
        window.dispatchEvent(new Event("storage"));
        await loadProfile();
      } else {
        alert("خطا در ذخیره اطلاعات. لطفاً دوباره تلاش کنید.");
      }
    } catch {
      alert("خطا در ارتباط با سرور.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-black text-blue-600 animate-pulse italic">
        در حال بارگذاری پروفایل...
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 pb-32" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mt-6 mb-6">
        <div className="text-right">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
            تنظیمات پروفایل <User className="text-blue-600" size={22} />
          </h1>
          <p className="text-sm font-bold text-gray-600 mt-2 leading-7">
            اطلاعات حساب کاربریت رو اینجا ببین و (در صورت فعال بودن سرور) ویرایش کن.
          </p>
        </div>

        <button
          onClick={() => router.push("/panel")}
          className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl font-black text-xs hover:bg-blue-100 transition-all inline-flex items-center gap-2"
        >
          برگشت به پنل <ArrowRight size={16} />
        </button>
      </div>

      {/* Top info cards */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-6 md:p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gray-50 rounded-[2.5rem] border border-gray-100 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
              <UserCircle2 className="text-blue-600" size={24} />
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-gray-600 mb-1">نام کاربر</p>
              <p className="font-black text-gray-900">{userData?.fullName || fullName || "—"}</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-[2.5rem] border border-blue-100 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/70 border border-blue-100 flex items-center justify-center">
              <Wallet className="text-blue-600" size={24} />
            </div>
            <div className="text-right flex-1">
              <p className="text-xs font-black text-blue-700 mb-1">اعتبار فعلی</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-black text-gray-900">{(userData?.wallet_balance || 0).toLocaleString()}</p>
                <span className="text-xs font-black text-blue-700">تومان</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-[2.5rem] border border-emerald-100 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/70 border border-emerald-100 flex items-center justify-center">
              <ShieldCheck className="text-emerald-600" size={24} />
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-emerald-700 mb-1">امنیت حساب</p>
              <p className="font-black text-gray-900">فعال</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit section */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-6 md:p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="text-right">
            <h2 className="text-xl font-black text-gray-900">ویرایش اطلاعات</h2>
            <p className="text-sm font-bold text-gray-600 mt-2">
              بعضی اطلاعات (مثل شماره موبایل) فقط نمایشی هستند و قابل تغییر نیستند.
            </p>
          </div>

          <button
            onClick={loadProfile}
            className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl font-black text-xs hover:bg-gray-200 transition-all inline-flex items-center gap-2"
          >
            بروزرسانی <RefreshCw size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full name */}
          <div className="text-right">
            <label className="block text-xs font-black text-gray-700 mb-2 pr-2">
              نام و نام خانوادگی
            </label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="نام و نام خانوادگی"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-4 pr-5 pl-12 font-black text-gray-900 outline-none focus:border-blue-600 transition-all placeholder:text-gray-500 placeholder:font-black"
              />
            </div>
          </div>

          {/* Email */}
          <div className="text-right">
            <label className="block text-xs font-black text-gray-700 mb-2 pr-2">ایمیل</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-4 pr-5 pl-12 font-black text-gray-900 outline-none focus:border-blue-600 transition-all placeholder:text-gray-500 placeholder:font-black"
              />
            </div>
          </div>

          {/* Phone (read-only) */}
          <div className="text-right md:col-span-2">
            <label className="block text-xs font-black text-gray-700 mb-2 pr-2">شماره موبایل (غیرقابل ویرایش)</label>
            <div className="relative">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={phoneNumber}
                disabled
                dir="ltr"
                placeholder="09xxxxxxxxx"
                className="w-full bg-gray-100 border-2 border-gray-200 rounded-[2rem] p-4 pr-5 pl-12 font-black text-gray-800 outline-none cursor-not-allowed placeholder:text-gray-600 placeholder:font-black"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gray-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-blue-600 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"} <Save size={20} />
          </button>
        </div>
      </motion.section>
    </main>
  );
}
