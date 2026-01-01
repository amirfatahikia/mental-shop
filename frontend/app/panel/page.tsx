"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Truck,
  User,
  CreditCard,
  Wallet,
  LogOut,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

type UserData = {
  fullName?: string;
  wallet_balance?: number;
};

export default function PanelPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  const IP_ADDRESS = "127.0.0.1";

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoggedIn(false);
      setUserData(null);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);
    fetch(`http://${IP_ADDRESS}:8000/api/user-profile/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUserData(data || {});
        setLoading(false);
      })
      .catch(() => {
        setUserData(null);
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("checkout_selected_address_id");
    localStorage.removeItem("checkout_payment_method");
    window.dispatchEvent(new Event("storage"));
    router.push("/login");
  };

  const name = useMemo(() => userData?.fullName || "کاربر مهمان", [userData]);
  const wallet = useMemo(() => Number(userData?.wallet_balance || 0), [userData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-black text-blue-600 animate-pulse">
        در حال بارگذاری پنل...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 text-right" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 md:px-10 pt-10">
        {/* Header Card */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-8 md:p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
                <User className="text-blue-600" />
                پنل کاربری
              </h1>
              <p className="text-sm font-bold text-gray-500 mt-3 leading-7">
                خوش اومدی <span className="text-gray-900">{name}</span> 👋
              </p>

              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-[2rem] p-5">
                <p className="text-[11px] font-black text-blue-500 mb-2">اعتبار فعلی:</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-gray-900">{wallet.toLocaleString()}</span>
                  <span className="text-xs font-black text-gray-500">تومان</span>
                </div>
              </div>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg">
              <ShieldCheck />
            </div>
          </div>

          {!isLoggedIn && (
            <div className="mt-8 bg-amber-50 border border-amber-100 rounded-[2rem] p-5">
              <p className="text-sm font-black text-amber-700 leading-7">
                برای مشاهده سفارش‌ها و اطلاعات حساب، وارد شوید.
              </p>
              <Link
                href="/login?redirect=/panel"
                className="inline-flex items-center gap-2 mt-4 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-600 transition-all"
              >
                ورود به حساب <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <PanelTile
            href="/cart"
            title="سبد خرید"
            desc="مشاهده و نهایی‌سازی خرید"
            Icon={ShoppingCart}
          />
          <PanelTile
            href="/my-orders"
            title="سفارشات و رهگیری"
            desc="لیست سفارش‌ها و وضعیت ارسال"
            Icon={Truck}
          />
          <PanelTile
            href="/profile"
            title="تنظیمات پروفایل"
            desc="ویرایش اطلاعات حساب و نشانی‌ها"
            Icon={User}
          />
          <PanelTile
            href="/credit"
            title="اعتبار و خرید اقساطی"
            desc="درخواست/مدیریت اعتبار خرید"
            Icon={CreditCard}
          />
        </div>

        {/* Logout */}
        <div className="mt-10">
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 border border-red-100 text-red-600 rounded-[2.5rem] p-5 font-black hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3"
          >
            <LogOut size={18} />
            خروج از حساب
          </button>
        </div>
      </div>
    </main>
  );
}

function PanelTile({
  href,
  title,
  desc,
  Icon,
}: {
  href: string;
  title: string;
  desc: string;
  Icon: any;
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-7 md:p-8 text-right hover:shadow-xl transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-gray-900">{title}</h3>
            <p className="text-xs font-bold text-gray-500 mt-2 leading-6">{desc}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Icon size={22} />
          </div>
        </div>

        <div className="mt-6 text-xs font-black text-blue-600 inline-flex items-center gap-2">
          ورود <ArrowRight size={16} />
        </div>
      </motion.div>
    </Link>
  );
}
