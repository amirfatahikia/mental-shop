"use client";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "@/context/ModalContext";
import Link from "next/link";
import {
  ShoppingCart,
  Home,
  User,
  LogIn,
  Package,
  ListChecks,
  CreditCard,
  LogOut,
  Search, // آیکون جدید
  X,      // آیکون جدید

  // --- آیکون‌های فوتر ---
  Instagram,
  Twitter,
  Send,
  Phone,
  Mail,
  ShieldCheck,
  Truck,
  Headphones,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

const vazir = Vazirmatn({ subsets: ["arabic"] });

const IP_ADDRESS = "mental-shop-api.liara.run";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  // --- استیت‌های جدید برای جستجو ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // تابع جستجو
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // اتصال به آدرس جدید بک‌اند برای جستجو
      const res = await fetch(`https://${IP_ADDRESS}/api/products/search/?q=${query}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error("خطا در جستجو:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => handleSearch(searchQuery), 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  // لیست آزمایشی محصولات (می‌توانید بعداً به API متصل کنید)
  const products = [
    { id: 1, name: "iPhone 15 Pro Max", category: "mobile" },
    { id: 2, name: "MacBook Air M3", category: "laptop" },
    { id: 3, name: "AirPods Pro 2", category: "audio" },
    { id: 4, name: "Apple Watch Ultra 2", category: "watch" },
    { id: 5, name: "iPad Pro M4", category: "tablet" },
  ];

  // فیلتر آنی نتایج جستجو
  const filteredResults = searchQuery.length > 1
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  // -----------------------------

  // ✅ اگر داخل صفحات category هستیم، سبد خرید پایین موبایل مخفی شود
  const hideBottomCart = pathname?.startsWith("/category");

  // تابع مشترک برای به‌روزرسانی اطلاعات کاربر و سبد خرید
  const syncAppState = useCallback(async () => {
    // ۱. آپدیت تعداد سبد خرید
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));

    // ۲. آپدیت پروفایل کاربر
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const res = await fetch("/api/user-profile/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
        } else {
          setUserData(null);
        }
      } catch (e) {
        setUserData(null);
      }
    } else {
      setUserData(null);
    }
  }, []);

  useEffect(() => {
    syncAppState();
    window.addEventListener("storage", syncAppState);
    return () => window.removeEventListener("storage", syncAppState);
  }, [syncAppState]);

  return (
    <html lang="fa" dir="rtl" className="bg-[#fcfcfc]">
      <body className={`${vazir.className} bg-[#fcfcfc] text-right antialiased`}>
        <ModalProvider>
          {/* سایدبار هوشمند */}
          <div
            className={`fixed top-0 right-0 h-full w-80 bg-white z-[500] shadow-2xl transform transition-transform duration-500 ${
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="p-8 h-full flex flex-col font-black italic">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl text-gray-900">منوی کاربری</h2>
                <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 text-3xl">
                  ×
                </button>
              </div>

              <div className="mb-8">
                {userData ? (
                  <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100">
                    <p className="text-gray-900 font-black mb-1">{userData.fullName}</p>
                    <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg mt-4 flex justify-between items-center font-black">
                      <span className="text-xl">{(userData.wallet_balance || 0).toLocaleString()}</span>
                      <span className="text-[10px]">تومان</span>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 bg-gray-900 text-white p-6 rounded-[2rem] shadow-xl hover:bg-blue-600 transition-all"
                  >
                    <LogIn size={24} />
                    <span className="text-sm font-black">ورود به حساب کاربری</span>
                  </Link>
                )}
              </div>

              <nav className="space-y-2 text-gray-700 flex-1 overflow-y-auto">
                <Link
                  href="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all"
                >
                  <Home size={18} /> صفحه اصلی
                </Link>

                <Link
                  href="/cart"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-2xl transition-all"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingCart size={18} /> سبد خرید
                  </span>
                  {cartCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {userData && (
                  <>
                    <Link
                      href="/my-orders"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all"
                    >
                      <Package size={18} /> سفارشات من
                    </Link>
                    <Link
                      href="/my-requests"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all"
                    >
                      <ListChecks size={18} /> پرونده‌های اعتباری
                    </Link>

                    <Link
                      href="/panel"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all"
                    >
                      <User size={18} /> پنل کاربری
                    </Link>
                  </>
                )}
              </nav>

              {userData && (
                <button
                  onClick={() => {
                    localStorage.removeItem("access_token");
                    window.location.reload();
                  }}
                  className="w-full mt-6 p-4 bg-red-50 text-red-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all"
                >
                  <LogOut size={18} /> خروج
                </button>
              )}
            </div>
          </div>

          {isMenuOpen && (
            <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-md z-[450]" />
          )}

          {/* هدر هوشمند */}
          <header className="fixed top-0 left-0 right-0 z-[400] bg-white/80 backdrop-blur-xl border-b border-gray-100 p-4 md:px-12 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2.5 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all"
              >
                <div className="w-6 h-0.5 bg-gray-900 mb-1.5"></div>
                <div className="w-4 h-0.5 bg-gray-900"></div>
              </button>
              <Link href="/" className="flex items-center group relative z-[410]">
                <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic group-hover:text-blue-600 transition-colors">
                  MENTAL SHOP
                </h1>
              </Link>
            </div>

            {/* --- باکس جستجوی هوشمند --- */}
            <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
              <div className={`relative w-full transition-all duration-500 ${isSearchFocused ? "scale-[1.02]" : "scale-100"}`}>
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="جستجو در محصولات..."
                  className="w-full bg-gray-100 border-none rounded-2xl py-3 pr-12 pl-4 text-xs font-black outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-gray-900"  // تغییر رنگ متن به تیره‌تر
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                />
                {searchQuery.length > 0 && (
                  <button onClick={() => setSearchQuery("")} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900">
                    <X size={16} />
                  </button>
                )}
                
                {/* پنل نتایج زنده */}
                {isSearchFocused && searchQuery.length > 1 && (
                  <div className="absolute top-full mt-3 w-full bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[600]">
                    <div className="p-3">
                      {isSearching ? (
                        <div className="p-8 text-center text-xs font-black animate-pulse">در حال جستجو...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <Link key={result.id} href={`/product/${result.id}`} className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-2xl transition-all">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden">
                              {/* استفاده از تصویر اصلی محصول */}
                              <img src={result.main_image} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-800">{result.title}</span> {/* ✅ تغییر از name به title */}
                              <span className="text-[10px] text-gray-400 font-bold">{Number(result.base_sale_price).toLocaleString()} تومان</span> {/* ✅ */}
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400 text-xs font-black italic">محصولی پیدا نشد ☹️</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* ------------------------- */}

            <div className="flex items-center gap-3">
              {!userData ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    href="/login"
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] shadow-lg hover:bg-blue-600 transition-all"
                  >
                    ورود
                  </Link>
                  <Link
                    href="/register"
                    className="bg-gray-100 text-gray-900 px-5 py-2.5 rounded-2xl font-black text-[10px] hover:bg-gray-200 transition-all"
                  >
                    ثبت‌نام
                  </Link>
                </div>
              ) : (
                <Link
                  href="/panel"
                  className="p-3 bg-gray-100 text-gray-900 rounded-2xl hover:bg-blue-50 transition-all"
                >
                  <User size={20} />
                </Link>
              )}

              <Link
                href="/cart"
                className="relative p-3 bg-gray-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                <ShoppingCart size={20} strokeWidth={3} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -left-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </header>

          <main className={`pt-20 min-h-screen bg-[#fcfcfc] ${hideBottomCart ? "pb-12" : "pb-40"}`}>
            {children}
          </main>

          {/* ===================== */}
          {/* فوتر حرفه‌ای (بدون نوار سیاه بالا) */}
          {/* ===================== */}
          <footer className="bg-[#fcfcfc]">
            {/* فاصله پایین برای اینکه نوار موبایل روی فوتر نیاد */}
            <div className="max-w-6xl mx-auto px-6 md:px-12 pb-28 md:pb-10">
              <div className="relative overflow-hidden rounded-[2.8rem] bg-white border border-gray-100 shadow-sm">
                {/* نوار رنگی خیلی ظریف بالای فوتر */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-l from-blue-600 via-indigo-500 to-blue-600" />

                {/* بک‌گراند تزئینی خیلی ملایم */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

                <div className="relative p-8 md:p-12 font-black italic">
                  {/* ردیف اول: برند + ستون‌ها */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    {/* برند */}
                    <div className="md:col-span-5">
                      <div className="flex items-center justify-between md:justify-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-[1.4rem] bg-gray-900 text-white flex items-center justify-center shadow-lg">
                            <span className="text-lg">M</span>
                          </div>
                          <div>
                            <div className="text-xl text-gray-900 tracking-tighter">MENTAL SHOP</div>
                            <div className="text-[11px] text-gray-400 font-bold mt-1">تجربه خرید سریع، امن و شیک</div>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-2">
                          <Link
                            href="/terms"
                            className="px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          >
                            قوانین
                          </Link>
                          <Link
                            href="/privacy"
                            className="px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          >
                            حریم خصوصی
                          </Link>
                          <Link
                            href="/about"
                            className="px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          >
                            درباره ما
                          </Link>
                        </div>
                      </div>

                      <p className="mt-6 text-sm md:text-[13px] text-gray-600 leading-8 font-bold">
                        ما روی ظاهر و تجربه کاربری وسواس داریم؛ از لینک‌های مهم مثل قوانین و حریم خصوصی گرفته،
                        تا پیگیری سفارش‌ها از پنل انجام میشه و سعی کردیم مسیر خرید تا حد ممکن ساده و بدون اذیت باشه.
                      </p>

                      {/* ویژگی‌ها */}
                      <div className="mt-7 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 text-[11px]">
                          <ShieldCheck size={16} /> پرداخت امن
                        </span>
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50 text-gray-700 border border-gray-100 text-[11px]">
                          <Truck size={16} /> ارسال سریع
                        </span>
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50 text-gray-700 border border-gray-100 text-[11px]">
                          <Headphones size={16} /> پشتیبانی واقعی
                        </span>
                      </div>
                    </div>

                    {/* لینک‌های مهم */}
                    <div className="md:col-span-3">
                      <h3 className="text-gray-900 text-base mb-4">لینک‌های مهم</h3>
                      <div className="flex flex-col gap-3 text-sm font-bold text-gray-600">
                        <Link href="/" className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-all">
                          صفحه اصلی
                        </Link>
                        <Link href="/terms" className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-all">
                          شرایط استفاده
                        </Link>
                        <Link href="/privacy" className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-all">
                          حریم خصوصی
                        </Link>
                      </div>
                      <p className="mt-4 text-[11px] text-gray-400 font-bold leading-6">
                        
                      </p>
                    </div>

                    {/* ارتباط با ما */}
                    <div className="md:col-span-4">
                      <h3 className="text-gray-900 text-base mb-4">پشتیبانی</h3>

                      <div className="space-y-3 text-sm font-bold text-gray-600">
                        <a
                          href="tel:09000000000"
                          className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Phone size={16} className="text-gray-400" />
                            تلفن
                          </span>
                          <span className="text-gray-500">09000000000</span>
                        </a>

                        <a
                          href="mailto:support@mentalshop.ir"
                          className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Mail size={16} className="text-gray-400" />
                            ایمیل
                          </span>
                          <span className="text-gray-500">support@mentalshop.ir</span>
                        </a>
                      </div>

                      {/* شبکه‌های اجتماعی */}
                      <div className="mt-5 flex items-center gap-2">
                        <Link
                          href="https://instagram.com"
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          aria-label="Instagram"
                        >
                          <Instagram size={18} />
                        </Link>
                        <Link
                          href="https://twitter.com"
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          aria-label="Twitter"
                        >
                          <Twitter size={18} />
                        </Link>
                        <Link
                          href="#"
                          className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          aria-label="Telegram"
                        >
                          <Send size={18} />
                        </Link>

                        <div className="mr-auto text-[11px] text-gray-400 font-bold">
                          پاسخ‌گویی: ۹ تا ۲۱
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* خط جداکننده */}
                  <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-[11px] text-gray-400 font-bold">
                      © {new Date().getFullYear()} MENTAL SHOP — تمامی حقوق محفوظ است.
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                      <span className="px-3 py-2 rounded-2xl bg-gray-50 border border-gray-100">
                        قوانین و حریم خصوصی
                      </span>
                      <span className="px-3 py-2 rounded-2xl bg-gray-50 border border-gray-100">
                        خرید امن و مطمئن
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
          {/* ===================== */}

          {/* نوار پایین موبایل */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[400] bg-white/95 backdrop-blur-xl border-t border-gray-100 p-4 pb-8 flex justify-around items-center">
            <Link
              href="/"
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-all font-black italic"
            >
              <Home size={22} />
              <span>خانه</span>
            </Link>

            {!hideBottomCart && (
              <Link
                href="/cart"
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-all font-black italic"
              >
                <ShoppingCart size={22} />
                <span>سبد</span>
              </Link>
            )}

            <Link
              href={userData ? "/my-requests" : "/login"}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-all font-black italic"
            >
              <CreditCard size={22} />
              <span>اقساط</span>
            </Link>

            <Link
              href={userData ? "/panel" : "/login"}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-all font-black italic"
            >
              <User size={22} />
              <span>پنل</span>
            </Link>
          </nav>
        </ModalProvider>
      </body>
    </html>
  );
}
