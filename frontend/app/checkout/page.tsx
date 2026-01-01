"use client";
import React, { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  CheckCircle2,
  CreditCard,
  ShoppingBag,
  ShoppingCart,
  Edit3,
  Trash2,
  Wallet,
  Banknote,
  Zap,
  ShieldCheck,
  ArrowRight,
  Truck,
  Lock,
  X,
  AlertCircle,
  Info,
  CheckCircle,
} from "lucide-react";

/** ---------------------------
 * Types
 * --------------------------*/
type CartItem = {
  id: number | string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string | null;

  original_price?: number | null;
  compare_at_price?: number | null;
  shipping_fee?: number | null;
};

type Address = {
  id: number;
  fullName: string;
  phoneNumber: string;
  nationalCode: string;
  postalCode: string;
  preciseAddress: string;
  city?: string;
};

type UserData = {
  fullName?: string;
  wallet_balance?: number;
};

type PaymentMethod = "direct" | "installment";

type ModalState = {
  isOpen: boolean;
  type: "success" | "error" | "warning" | "info" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
};

const FREE_SHIP_THRESHOLD = 500_000;
const SHIPPING_FLAT = 30_000;

function CheckoutContent() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("installment");

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ✅ برای اینکه “موجودی کافی نیست” الکی نشون داده نشه
  const [profileReady, setProfileReady] = useState(false);

  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  const showInternalModal = useCallback(
    (type: ModalState["type"], title: string, message: string, onConfirm?: () => void) => {
      setModal({ isOpen: true, type, title, message, onConfirm });
    },
    []
  );

  const closeInternalModal = useCallback(() => {
    setModal((p) => ({ ...p, isOpen: false }));
  }, []);

  const [newAddress, setNewAddress] = useState({
    fullName: "",
    phoneNumber: "",
    nationalCode: "",
    postalCode: "",
    preciseAddress: "",
    city: "تهران",
  });

  /** ---------------------------
   * API config
   * --------------------------*/
  const API_ROOT = (process.env.NEXT_PUBLIC_API_ROOT || "http://127.0.0.1:8000").replace(/\/$/, "");

  // Endpoints
  const API_BASE = `${API_ROOT}/api/user-addresses/`;
  const PROFILE_URL = `${API_ROOT}/api/user-profile/`;
  const ORDER_SUBMIT_URL = `${API_ROOT}/api/orders/submit/`;
  const REFRESH_URL = `${API_ROOT}/api/token/refresh/`;

  const inputClass =
    "w-full bg-white border-2 border-gray-200 rounded-[2rem] p-5 text-sm font-black text-gray-900 outline-none focus:border-blue-600 shadow-inner placeholder:text-gray-600 placeholder:opacity-100";
  const textareaClass =
    "md:col-span-2 w-full bg-white border-2 border-gray-200 rounded-[3rem] p-8 text-sm font-black text-gray-900 outline-none focus:border-blue-600 shadow-inner placeholder:text-gray-600 placeholder:opacity-100";

  /** ---------------------------
   * Helpers
   * --------------------------*/
  const safeJson = <T,>(v: string, fallback: T): T => {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  };

  const resolveImg = (url?: string | null) => {
    if (!url) return "/placeholder.png";
    return url;
  };

  const pickAddressFields = (addr: any) => ({
    fullName: addr?.fullName || "",
    phoneNumber: addr?.phoneNumber || "",
    nationalCode: addr?.nationalCode || "",
    postalCode: addr?.postalCode || "",
    preciseAddress: addr?.preciseAddress || "",
    city: addr?.city || "تهران",
  });

  // ✅ فارسی/عربی -> انگلیسی
  const toEnglishDigits = (input: string) => {
    const s = String(input ?? "");
    const fa = "۰۱۲۳۴۵۶۷۸۹";
    const ar = "٠١٢٣٤٥٦٧٨٩";
    let out = "";
    for (const ch of s) {
      const iFa = fa.indexOf(ch);
      if (iFa > -1) {
        out += String(iFa);
        continue;
      }
      const iAr = ar.indexOf(ch);
      if (iAr > -1) {
        out += String(iAr);
        continue;
      }
      out += ch;
    }
    return out;
  };

  // ✅ اجازه بده کاربر فارسی/انگلیسی تایپ کنه، فقط غیرعدد حذف شه (بدون تبدیل به انگلیسی برای نمایش)
  const onlyDigitsFaEn = (v: string) => String(v ?? "").replace(/[^\d۰-۹٠-٩]/g, "");

  // ✅ برای ارسال به بک‌اند: فارسی/عربی -> انگلیسی + فقط رقم
  const normalizeDigitsOnly = (v: string) => toEnglishDigits(String(v ?? "")).replace(/\D/g, "");

  const isValidPhone = (v: string) => /^[0-9]{11}$/.test(normalizeDigitsOnly(v).trim());
  const isValidNationalCode = (v: string) => /^[0-9]{10}$/.test(normalizeDigitsOnly(v).trim());
  const isValidPostalCode = (v: string) => /^[0-9]{10}$/.test(normalizeDigitsOnly(v).trim());

  const humanizeApiError = (data: any) => {
    if (!data) return "خطایی رخ داد.";
    if (typeof data === "string") return data;

    if (data.detail) return String(data.detail);

    // DRF Validation dict
    if (typeof data === "object") {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(data)) {
        if (Array.isArray(v)) parts.push(`${k}: ${v.join("، ")}`);
        else parts.push(`${k}: ${String(v)}`);
      }
      if (parts.length) return parts.join("\n");
    }

    return "خطایی رخ داد.";
  };

  /** ---------------------------
   * ✅ Auth helpers (Refresh token-safe)
   * --------------------------*/
  const getAccessToken = () => localStorage.getItem("access_token") || "";
  const getRefreshToken = () => localStorage.getItem("refresh_token") || "";

  const refreshAccessToken = async (): Promise<string | null> => {
    const refresh = getRefreshToken();
    if (!refresh) return null;

    try {
      const res = await fetch(REFRESH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!res.ok) return null;

      const data = await res.json().catch(() => null);
      const newAccess = data?.access;
      if (!newAccess) return null;

      localStorage.setItem("access_token", String(newAccess));
      return String(newAccess);
    } catch {
      return null;
    }
  };

  const authedFetch = async (url: string, init: RequestInit = {}) => {
    const token = getAccessToken();

    const headersObj: Record<string, string> = {
      ...(init.headers as any),
    };

    if (token) headersObj.Authorization = `Bearer ${token}`;

    const first = await fetch(url, { ...init, headers: headersObj });

    // اگر توکن منقضی شده، یکبار refresh و retry
    if (first.status !== 401) return first;

    const newAccess = await refreshAccessToken();
    if (!newAccess) return first;

    const retryHeaders: Record<string, string> = {
      ...(init.headers as any),
      Authorization: `Bearer ${newAccess}`,
    };

    return fetch(url, { ...init, headers: retryHeaders });
  };

  /** ---------------------------
   * Load saved selections
   * --------------------------*/
  useEffect(() => {
    const pm = localStorage.getItem("checkout_payment_method");
    if (pm === "direct" || pm === "installment") setPaymentMethod(pm);

    const sid = localStorage.getItem("checkout_selected_address_id");
    if (sid && !Number.isNaN(Number(sid))) setSelectedAddressId(Number(sid));
  }, []);

  useEffect(() => {
    localStorage.setItem("checkout_payment_method", paymentMethod);
  }, [paymentMethod]);

  useEffect(() => {
    if (selectedAddressId != null) {
      localStorage.setItem("checkout_selected_address_id", String(selectedAddressId));
    }
  }, [selectedAddressId]);

  /** ---------------------------
   * Initial load: cart + fetchData
   * --------------------------*/
  useEffect(() => {
    const savedCart = safeJson<CartItem[]>(localStorage.getItem("cart") || "[]", []);
    if (!savedCart.length) {
      router.push("/cart");
      return;
    }
    setCart(savedCart);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /** ✅ FIX ریشه‌ای:
   * fetch آدرس و fetch پروفایل جداست
   * تا اگر آدرس fail شد، موجودی کیف پول صفر نشود.
   */
  const fetchData = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login?redirect=/checkout");
      return;
    }

    setLoading(true);

    // 1) آدرس‌ها
    try {
      const addrRes = await authedFetch(API_BASE, { method: "GET" });

      if (addrRes.ok) {
        const addrData = await addrRes.json().catch(() => []);
        const addrArr = Array.isArray(addrData) ? (addrData as Address[]) : [];
        setAddresses(addrArr);

        if (addrArr.length > 0) {
          setSelectedAddressId((prev) => {
            const prevOk = prev != null && addrArr.some((a) => a.id === prev);
            return prevOk ? prev : addrArr[0].id;
          });
        } else {
          setSelectedAddressId(null);
        }
      } else if (addrRes.status === 401 || addrRes.status === 403) {
        showInternalModal("error", "خطا", "دسترسی ندارید. لطفاً دوباره وارد شوید.");
        router.push("/login?redirect=/checkout");
      } else {
        setAddresses([]);
        setSelectedAddressId(null);
      }
    } catch {
      const local = safeJson<Address[]>(localStorage.getItem("offline_addresses") || "[]", []);
      setAddresses(local);

      if (local.length > 0) {
        setSelectedAddressId((prev) => {
          const prevOk = prev != null && local.some((a) => a.id === prev);
          return prevOk ? prev : local[0].id;
        });
      } else {
        setSelectedAddressId(null);
      }
    }

    // 2) پروفایل/کیف پول
    try {
      setProfileReady(false);
      const userRes = await authedFetch(PROFILE_URL, { method: "GET" });

      if (!userRes.ok) {
        setUserData(null);
        setProfileReady(true); // آمد ولی خالی/ناموفق
      } else {
        const uData = await userRes.json().catch(() => null);
        setUserData(uData);
        setProfileReady(true);
      }
    } catch {
      setUserData(null);
      setProfileReady(true);
    }

    setLoading(false);
  };

  const startAddNewAddress = () => {
    setEditingId(null);
    setNewAddress({
      fullName: "",
      phoneNumber: "",
      nationalCode: "",
      postalCode: "",
      preciseAddress: "",
      city: "تهران",
    });
    setIsAddingNew(true);
  };

  /** ---------------------------
   * Totals
   * --------------------------*/
  const subtotal = useMemo(() => cart.reduce((acc, i) => acc + i.price * i.quantity, 0), [cart]);

  const shippingFee = useMemo(() => {
    const hasAny = cart.some((i) => typeof i.shipping_fee === "number" && Number(i.shipping_fee) > 0);
    if (hasAny) {
      return cart.reduce((acc, i) => acc + Number(i.shipping_fee || 0) * i.quantity, 0);
    }
    return subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FLAT;
  }, [cart, subtotal]);

  const totalPayable = useMemo(() => subtotal + shippingFee, [subtotal, shippingFee]);

  const totalItems = useMemo(() => cart.reduce((acc, i) => acc + i.quantity, 0), [cart]);

  const totalSavings = useMemo(() => {
    return cart.reduce((acc, i) => {
      const op = (i.compare_at_price ?? i.original_price ?? 0) as number;
      if (typeof op === "number" && op > i.price) {
        return acc + (op - i.price) * i.quantity;
      }
      return acc;
    }, 0);
  }, [cart]);

  const hasEnoughCredit = useMemo(() => {
    return !!userData && Number(userData.wallet_balance || 0) >= totalPayable;
  }, [userData, totalPayable]);

  const creditShortage = useMemo(() => {
    const bal = Number(userData?.wallet_balance || 0);
    return bal >= totalPayable ? 0 : totalPayable - bal;
  }, [userData, totalPayable]);

  /** ---------------------------
   * Address Save
   * --------------------------*/
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!isValidPhone(newAddress.phoneNumber)) {
      showInternalModal("error", "شماره موبایل نامعتبر", "شماره موبایل باید دقیقاً ۱۱ رقم باشد (فقط عدد).");
      return;
    }
    if (!isValidNationalCode(newAddress.nationalCode)) {
      showInternalModal("error", "کد ملی نامعتبر", "کد ملی باید دقیقاً ۱۰ رقم باشد (فقط عدد).");
      return;
    }
    if (!isValidPostalCode(newAddress.postalCode)) {
      showInternalModal("error", "کد پستی نامعتبر", "کد پستی باید دقیقاً ۱۰ رقم باشد (فقط عدد).");
      return;
    }

    setSubmitting(true);

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${API_BASE}${editingId}/` : API_BASE;

    const payload = {
      ...newAddress,
      phoneNumber: normalizeDigitsOnly(newAddress.phoneNumber),
      nationalCode: normalizeDigitsOnly(newAddress.nationalCode),
      postalCode: normalizeDigitsOnly(newAddress.postalCode),
    };

    try {
      const res = await authedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        showInternalModal("error", "خطا", "دسترسی ندارید. لطفاً دوباره وارد شوید.");
        setSubmitting(false);
        router.push("/login?redirect=/checkout");
        return;
      }

      if (res.ok) {
        finalizeForm();
        await fetchData();
        if (data?.id) setSelectedAddressId(Number(data.id));
        showInternalModal("success", "عملیات موفق", "نشانی شما با موفقیت ثبت گردید. ✅");
      } else {
        showInternalModal("error", "خطا در ثبت نشانی", humanizeApiError(data));
      }
    } catch {
      const offId = editingId || Date.now();
      const updated: Address[] = editingId
        ? addresses.map((a) => (a.id === editingId ? ({ ...(payload as any), id: offId } as any) : a))
        : ([...addresses, { ...(payload as any), id: offId } as any] as any).slice(0, 5);

      localStorage.setItem("offline_addresses", JSON.stringify(updated));
      setAddresses(updated);
      setSelectedAddressId(offId);
      finalizeForm();
      showInternalModal("warning", "ذخیره موقت", "⚠️ ارتباط با سرور قطع است؛ نشانی موقتاً در مرورگر ذخیره شد.");
    } finally {
      setSubmitting(false);
    }
  };

  const finalizeForm = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setNewAddress({
      fullName: "",
      phoneNumber: "",
      nationalCode: "",
      postalCode: "",
      preciseAddress: "",
      city: "تهران",
    });
  };

  /** ---------------------------
   * Delete Address
   * --------------------------*/
  const handleDelete = async (id: number, e: any) => {
    e.stopPropagation();

    showInternalModal("confirm", "حذف نشانی", "آیا از حذف این نشانی اطمینان دارید؟", async () => {
      try {
        await authedFetch(`${API_BASE}${id}/`, { method: "DELETE" });
      } catch {}

      const updated = addresses.filter((a) => a.id !== id);
      setAddresses(updated);
      localStorage.setItem("offline_addresses", JSON.stringify(updated));

      setSelectedAddressId((prev) => {
        if (prev !== id) return prev;
        return updated.length ? updated[0].id : null;
      });

      closeInternalModal();
    });
  };

  /** ✅ پرداخت اعتباری واقعی (ثبت سفارش + کم شدن کیف پول) */
  const submitWalletOrder = async () => {
    const selectedAddr = addresses.find((a) => a.id === selectedAddressId) || null;

    const payload = {
      payment_method: "wallet",
      shipping_fee: shippingFee,

      // هر دو رو می‌فرستیم که با هر بک‌اندی سازگار باشه
      address_id: selectedAddressId,
      address: selectedAddr
        ? {
            fullName: selectedAddr.fullName,
            phoneNumber: normalizeDigitsOnly(String(selectedAddr.phoneNumber || "")),
            nationalCode: normalizeDigitsOnly(String(selectedAddr.nationalCode || "")),
            postalCode: normalizeDigitsOnly(String(selectedAddr.postalCode || "")),
            preciseAddress: selectedAddr.preciseAddress,
            city: selectedAddr.city || "تهران",
          }
        : { address_id: selectedAddressId },

      // آیتم‌ها (برای اینکه total_price درست محاسبه/ذخیره شه، price هم می‌فرستیم)
      items: cart.map((i) => ({
        product: i.id,
        product_id: i.id,
        quantity: i.quantity,
        price: i.price,
      })),

      subtotal,
      total_price: totalPayable,
    };

    const res = await authedFetch(ORDER_SUBMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail = String(data?.detail || "");
      if (detail.includes("کیف پول") || detail.includes("اعتبار") || detail.includes("کافی نیست")) {
        showInternalModal("warning", "اعتبار کافی نیست", detail || "اعتبار کیف پول کافی نیست.");
        return;
      }
      showInternalModal("error", "خطا", humanizeApiError(data) || "ثبت سفارش با مشکل مواجه شد. لطفاً دوباره تلاش کنید.");
      return;
    }

    // ✅ موفق: کیف پول کم شد + سفارش ثبت شد
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("storage")); // برای رفرش هدر (اگر روی این event گوش داده باشی)
    await fetchData(); // برای رفرش همین صفحه + موجودی

    showInternalModal("success", "خرید با موفقیت انجام شد ✅", "سفارش شما ثبت شد و از موجودی کیف پول کسر گردید.");

    setTimeout(() => {
      closeInternalModal();
      router.push(`/my-orders`);
    }, 900);
  };

  /** ---------------------------
   * Final Action
   * --------------------------*/
  const handleFinalAction = async () => {
    if (submitting) return;

    if (!selectedAddressId) {
      showInternalModal("error", "خطا در انتخاب", "⚠️ ابتدا نشانی تحویل را انتخاب کنید.");
      return;
    }

    // ✅ اگر پروفایل هنوز نیومده، اجازه نده کمبود جعلی نشون بده/ریدایرکت کنه
    if (paymentMethod === "installment" && !profileReady) {
      showInternalModal("info", "درحال دریافت موجودی", "لطفاً چند ثانیه صبر کنید و دوباره تلاش کنید.");
      return;
    }

    setSubmitting(true);

    try {
      if (paymentMethod === "installment") {
        if (!hasEnoughCredit) {
          router.push("/credit");
          return;
        }

        await submitWalletOrder();
        return;
      }

      // direct (فعلاً نمایشی)
      showInternalModal("info", "درگاه بانکی", "💳 درحال انتقال به درگاه بانکی...");
      setTimeout(() => {}, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  /** ---------------------------
   * Loading
   * --------------------------*/
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen font-black text-blue-600 animate-pulse italic">
        درحال چیدمان نهایی...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfcfc] font-sans rtl text-right relative p-4 md:p-10" dir="rtl">
      {/* مودال داخلی */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeInternalModal}></div>

          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative z-10 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-xl ${
                modal.type === "success"
                  ? "bg-green-100 text-green-600"
                  : modal.type === "error"
                  ? "bg-red-100 text-red-600"
                  : modal.type === "warning"
                  ? "bg-orange-100 text-orange-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {modal.type === "success" && <CheckCircle size={40} />}
              {modal.type === "error" && <X size={40} />}
              {modal.type === "warning" && <AlertCircle size={40} />}
              {modal.type === "info" && <Info size={40} />}
              {modal.type === "confirm" && <Trash2 size={40} />}
            </div>

            <h2 className="text-xl font-black text-gray-900 mb-2 italic">{modal.title}</h2>
            <p className="text-sm font-bold text-gray-400 leading-7 mb-8 whitespace-pre-line">{modal.message}</p>

            <div className="flex gap-4 w-full">
              {modal.type === "confirm" ? (
                <>
                  <button
                    onClick={modal.onConfirm}
                    className="flex-1 bg-red-600 text-white p-4 rounded-2xl font-black"
                  >
                    حذف
                  </button>
                  <button
                    onClick={closeInternalModal}
                    className="flex-1 bg-gray-100 text-gray-400 p-4 rounded-2xl font-black"
                  >
                    لغو
                  </button>
                </>
              ) : (
                <button
                  onClick={closeInternalModal}
                  className="w-full p-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg"
                >
                  متوجه شدم
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* استپر مراحل (کلیک‌پذیر) */}
        <div className="bg-white rounded-[2.5rem] p-6 flex justify-between items-center shadow-sm border border-gray-100 mb-10">
          <button
            onClick={() => router.push("/cart")}
            className="flex flex-col items-center gap-2 hover:opacity-100 transition-all opacity-60"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-[12px] font-black italic">
              ۱
            </div>
            <span className="text-[10px] font-black italic">سبد خرید</span>
          </button>

          <div className="flex-1 h-1 bg-gray-100 mx-4 rounded-full"></div>

          <div className="flex flex-col items-center gap-2 text-blue-600">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl text-[18px] font-black italic border-4 border-white">
              ۲
            </div>
            <span className="text-[12px] font-black uppercase tracking-widest">اطلاعات ارسال</span>
          </div>

          <div className="flex-1 h-1 bg-gray-100 mx-4 rounded-full"></div>

          <div className="flex flex-col items-center gap-2 opacity-30">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-[12px] font-black italic">
              ۳
            </div>
            <span className="text-[10px] font-black italic">پرداخت</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* ستون اصلی */}
          <div className="lg:col-span-2 space-y-10">
            {/* نشانی تحویل */}
            <section className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-3 italic">
                  <MapPin className="text-blue-600" size={30} /> نشانی تحویل کالا
                </h3>

                {!isAddingNew && addresses.length < 5 && (
                  <button
                    onClick={startAddNewAddress}
                    className="text-xs font-black text-white bg-blue-600 px-6 py-3 rounded-2xl shadow-lg hover:bg-blue-700 transition-all"
                  >
                    افزودن نشانی +
                  </button>
                )}
              </div>

              {!isAddingNew && (
                <div className="grid grid-cols-1 gap-6">
                  {addresses.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-100 rounded-[3rem] p-8 text-right">
                      <p className="font-black text-gray-700 mb-2">هنوز نشانی ثبت نکردی.</p>
                      <p className="text-xs text-gray-400">برای ادامه خرید، یک نشانی اضافه کن ✨</p>
                      <button
                        onClick={startAddNewAddress}
                        className="mt-6 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-blue-600 transition-all"
                      >
                        افزودن نشانی
                      </button>
                    </div>
                  ) : (
                    addresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-10 rounded-[3rem] border-2 transition-all cursor-pointer relative flex flex-col gap-5 ${
                          selectedAddressId === addr.id
                            ? "border-blue-600 bg-blue-50/40 shadow-inner"
                            : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-black text-xl text-gray-900 italic flex items-center gap-3">
                            {selectedAddressId === addr.id && (
                              <CheckCircle2 className="text-blue-600 animate-in zoom-in" size={26} />
                            )}
                            {addr.fullName}
                          </span>

                          <div className="flex items-center gap-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewAddress(pickAddressFields(addr));
                                setEditingId(addr.id);
                                setIsAddingNew(true);
                              }}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              aria-label="ویرایش"
                            >
                              <Edit3 size={22} />
                            </button>

                            <button
                              onClick={(e) => handleDelete(addr.id, e)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              aria-label="حذف"
                            >
                              <Trash2 size={22} />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm font-bold text-gray-500 leading-8 italic">{addr.preciseAddress}</p>

                        <div className="mt-2 text-[11px] font-black text-gray-400 flex flex-wrap gap-6 border-t border-gray-100 pt-4">
                          <span>تلفن: {addr.phoneNumber}</span>
                          <span>کد ملی: {addr.nationalCode}</span>
                          <span>پستی: {addr.postalCode}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {isAddingNew && (
                <form
                  onSubmit={handleSaveAddress}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 animate-in slide-in-from-top-4"
                >
                  <input
                    required
                    placeholder="نام کامل تحویل‌گیرنده"
                    className={inputClass}
                    value={newAddress.fullName}
                    onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                  />

                  <input
                    required
                    inputMode="numeric"
                    placeholder="شماره تلفن همراه (۱۱ رقم)"
                    className={`${inputClass} text-left`}
                    value={newAddress.phoneNumber}
                    onChange={(e) => setNewAddress({ ...newAddress, phoneNumber: onlyDigitsFaEn(e.target.value) })}
                  />

                  <input
                    required
                    inputMode="numeric"
                    placeholder="کد ملی (۱۰ رقم)"
                    className={`${inputClass} text-left`}
                    value={newAddress.nationalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, nationalCode: onlyDigitsFaEn(e.target.value) })}
                  />

                  <input
                    required
                    inputMode="numeric"
                    placeholder="کد پستی (۱۰ رقم)"
                    className={`${inputClass} text-left`}
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: onlyDigitsFaEn(e.target.value) })}
                  />

                  <textarea
                    required
                    className={textareaClass}
                    rows={4}
                    placeholder="نشانی دقیق پستی..."
                    value={newAddress.preciseAddress}
                    onChange={(e) => setNewAddress({ ...newAddress, preciseAddress: e.target.value })}
                  />

                  <div className="md:col-span-2 flex gap-5">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-blue-600 text-white p-6 rounded-[2rem] font-black text-lg shadow-2xl disabled:opacity-50 italic hover:bg-blue-700 transition-all"
                    >
                      {submitting ? "درحال پردازش..." : "تایید و ثبت نشانی"}
                    </button>

                    <button
                      type="button"
                      onClick={finalizeForm}
                      disabled={submitting}
                      className="px-10 bg-gray-100 text-gray-400 rounded-[2rem] font-black text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* بررسی نهایی کالاها */}
            <section className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3 italic">
                <ShoppingCart className="text-blue-600" size={28} /> بررسی نهایی سبد خرید
              </h3>

              <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide px-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="min-w-[150px] flex flex-col items-center gap-4">
                    <div className="w-28 h-28 bg-gray-50 rounded-[2rem] p-4 flex items-center justify-center border border-gray-100 shadow-inner relative">
                      <img
                        src={resolveImg(item.image_url)}
                        alt={item.title}
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                      <span className="absolute -top-3 -right-3 bg-blue-600 text-white text-[12px] font-black w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                        {item.quantity}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 truncate w-28 text-center italic">
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] p-6">
                <div className="flex justify-between items-center text-sm font-black text-gray-700">
                  <span>جمع کالاها ({totalItems})</span>
                  <span>{subtotal.toLocaleString()} ت</span>
                </div>

                <div className="flex justify-between items-center text-sm font-black text-gray-700 mt-3">
                  <span>هزینه ارسال</span>
                  {shippingFee === 0 ? <span className="text-green-600">رایگان 🎉</span> : <span>{shippingFee.toLocaleString()} ت</span>}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-black text-gray-900">مبلغ نهایی</span>
                  <span className="text-xl font-black text-blue-600">{totalPayable.toLocaleString()} ت</span>
                </div>

                {subtotal < FREE_SHIP_THRESHOLD && shippingFee > 0 && (
                  <p className="mt-4 text-[11px] font-black text-blue-700 leading-6">
                    فقط {(FREE_SHIP_THRESHOLD - subtotal).toLocaleString()} تومان دیگه خرید کن تا ارسال رایگان بشه 🚚✨
                  </p>
                )}
              </div>
            </section>

            {/* روش پرداخت */}
            <section className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-10 flex items-center gap-3 italic">
                <CreditCard className="text-blue-600" size={28} /> شیوه پرداخت سفارش
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black italic">
                {/* installment */}
                <div
                  onClick={() => setPaymentMethod("installment")}
                  className={`p-10 rounded-[3rem] border-2 transition-all cursor-pointer relative flex flex-col gap-8 ${
                    paymentMethod === "installment"
                      ? "border-blue-600 bg-blue-50/40 shadow-inner"
                      : "border-gray-50 bg-gray-50/50 hover:border-blue-600"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div
                      className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl ${
                        paymentMethod === "installment" ? "bg-blue-600 text-white rotate-6" : "bg-white text-gray-400"
                      }`}
                    >
                      <Wallet size={34} />
                    </div>

                    <span className="bg-red-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full animate-pulse">
                      پیشنهاد منتال
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-gray-900 text-lg mb-3">خرید هوشمند (اقساطی)</h4>
                    <p className="text-[12px] font-bold text-gray-500 leading-8 italic">
                      دریافت اعتبار، بدون نیاز به ضامن و بدون نیاز به چک.
                    </p>

                    <div className="mt-6 bg-white/70 border border-gray-100 rounded-2xl p-4">
                      {/* ✅ اگر پروفایل هنوز آماده نیست، پیام خنثی */}
                      {!profileReady ? (
                        <p className="text-[11px] font-black text-blue-700 leading-6">درحال دریافت موجودی کیف پول…</p>
                      ) : hasEnoughCredit ? (
                        <p className="text-[11px] font-black text-emerald-700 leading-6">
                          ✅ اعتبار شما کافی است. می‌توانید سفارش را نهایی کنید.
                        </p>
                      ) : (
                        <p className="text-[11px] font-black text-red-600 leading-6">
                          ⚠️ اعتبار شما کافی نیست. کمبود اعتبار: {creditShortage.toLocaleString()} تومان
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* direct */}
                <div
                  onClick={() => setPaymentMethod("direct")}
                  className={`p-10 rounded-[3rem] border-2 transition-all cursor-pointer flex flex-col gap-8 ${
                    paymentMethod === "direct"
                      ? "border-blue-600 bg-blue-50/40 shadow-inner"
                      : "border-gray-50 bg-gray-50/50 hover:border-blue-600"
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl ${
                      paymentMethod === "direct" ? "bg-gray-900 text-white" : "bg-white text-gray-400"
                    }`}
                  >
                    <Banknote size={34} />
                  </div>

                  <div>
                    <h4 className="font-black text-gray-900 text-lg mb-3">پرداخت مستقیم آنلاین</h4>
                    <p className="text-[12px] font-bold text-gray-500 leading-8 italic">
                      تسویه آنی از طریق درگاه‌های بانکی شاپرک با تمام کارت‌های شتاب.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* نمادهای اعتماد */}
            <div className="grid grid-cols-2 gap-6 pb-10">
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 flex flex-col items-center text-center gap-4 shadow-sm">
                <Truck className="text-blue-600" size={32} />
                <span className="text-[11px] font-black italic">ارسال فوق سریع</span>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 flex flex-col items-center text-center gap-4 shadow-sm">
                <Lock className="text-blue-600" size={32} />
                <span className="text-[11px] font-black italic">امنیت ۱۰۰٪ تراکنش‌ها</span>
              </div>
            </div>

            {/* دکمه موبایل */}
            <div className="lg:hidden bg-white rounded-[3.5rem] p-10 shadow-2xl border border-blue-100 mb-20">
              <div className="flex justify-between items-center mb-8 font-black italic">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase">مجموع قابل پرداخت:</span>
                  <span className="text-2xl text-gray-900 tracking-tighter">
                    {totalPayable.toLocaleString()} <small className="text-[12px]">تومان</small>
                  </span>
                </div>
              </div>

              <button
                onClick={handleFinalAction}
                disabled={isAddingNew || !selectedAddressId || submitting}
                className={`w-full p-6 rounded-[2rem] font-black text-md shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${
                  paymentMethod === "installment" && profileReady && !hasEnoughCredit
                    ? "bg-red-600 text-white shadow-red-200"
                    : "bg-gray-900 text-white hover:bg-blue-600"
                }`}
              >
                {paymentMethod === "installment" && profileReady && !hasEnoughCredit ? (
                  <>
                    <Zap size={22} fill="white" className="animate-bounce" /> دریافت اعتبار
                  </>
                ) : (
                  <>
                    <ShieldCheck size={22} /> ثبت نهایی سفارش
                  </>
                )}
              </button>
            </div>
          </div>

          {/* سایدبار دسکتاپ */}
          <div className="hidden lg:block font-black italic">
            <section className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-gray-100 sticky top-32 text-center">
              <h3 className="text-xl text-gray-900 mb-10 border-b border-gray-100 pb-8 flex items-center gap-4 justify-center italic font-black">
                <ShoppingBag size={28} className="text-blue-600" /> فاکتور نهایی
              </h3>

              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs font-black">مجموع کالاها ({totalItems})</span>
                  <span className="text-gray-900 text-lg font-black">{subtotal.toLocaleString()} ت</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs font-black">هزینه ارسال</span>
                  {shippingFee === 0 ? (
                    <span className="text-green-600 text-sm font-black italic">رایگان 🎉</span>
                  ) : (
                    <span className="text-gray-900 text-sm font-black">{shippingFee.toLocaleString()} ت</span>
                  )}
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between items-center text-emerald-600">
                    <span className="text-xs font-black">میزان تخفیف</span>
                    <span className="text-sm font-black">{totalSavings.toLocaleString()} ت</span>
                  </div>
                )}
              </div>

              <div className="mb-10 text-4xl text-gray-900 tracking-tighter font-black">
                {totalPayable.toLocaleString()} <small className="text-xs font-black">تومان</small>
              </div>

              {paymentMethod === "installment" && profileReady && !hasEnoughCredit && (
                <div className="mb-8 bg-red-50 border border-red-100 rounded-[2.5rem] p-6 text-right">
                  <p className="text-[11px] font-black text-red-700 leading-7">
                    اعتبار شما کافی نیست. کمبود: {creditShortage.toLocaleString()} تومان
                  </p>
                </div>
              )}

              <button
                onClick={handleFinalAction}
                disabled={isAddingNew || !selectedAddressId || submitting}
                className={`w-full p-8 rounded-[2.5rem] font-black text-xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 ${
                  paymentMethod === "installment" && profileReady && !hasEnoughCredit
                    ? "bg-red-600 text-white shadow-red-100"
                    : "bg-gray-900 text-white hover:bg-blue-600 shadow-blue-100"
                }`}
              >
                {paymentMethod === "direct"
                  ? "پرداخت نهایی"
                  : !profileReady
                  ? "درحال دریافت موجودی..."
                  : hasEnoughCredit
                  ? "تایید اقساطی"
                  : "دریافت اعتبار"}
              </button>

              <p className="text-[9px] text-gray-400 text-center mt-6 font-bold leading-5 italic">
                با کلیک روی دکمه بالا، ضوابط و قوانین MENTAL SHOP را می‌پذیرم.
              </p>

              <div className="grid grid-cols-1 gap-3 mt-8 text-right">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold italic">
                  <ShieldCheck size={14} className="text-blue-600" />
                  پرداخت امن و تضمین اصالت کالا
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold italic">
                  <Truck size={14} className="text-blue-600" />
                  ارسال سریع به سراسر کشور
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold italic">
                  <CreditCard size={14} className="text-blue-600" />
                  امکان خرید اقساطی (در صورت فعال بودن)
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black">در حال بارگذاری...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
