"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useModal } from "@/context/ModalContext";

/* -------------------------------------------------
   ----------   پیکربندی متغیرهای محیطی   ----------
   ------------------------------------------------- */
const MERCHANT_ID = process.env.NEXT_PUBLIC_ZIBAL_MERCHANT_ID || "695e8a9ba21601002ca8fbf9";
const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://mental-shop-api.liara.run";
const PAYMENT_REQUEST_ENDPOINT = "/api/payment/request";
const VERIFICATION_AMOUNT = 1000000; // ۱۰۰,۰۰۰ تومان = ۱,۰۰۰,۰۰۰ ریال

/* -------------------------------------------------
   ----------   هوک‌ها و توابع کمکی   ----------
   ------------------------------------------------- */
const toEnglishDigits = (str: string) =>
  (str || "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

const onlyDigits = (str: string) => toEnglishDigits(str).replace(/\D/g, "");

/* اعتبارسنجی کد ملی ایران */
const isValidIranNationalCode = (input: string) => {
  const code = onlyDigits(input);
  if (!code || code.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;

  const digits = code.split("").map((d) => parseInt(d, 10));
  const check = digits[9];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  const remainder = sum % 11;
  return remainder < 2 ? check === remainder : check === 11 - remainder;
};

/* دریافت تاریخ امروز شمسی */
const getPersianTodayParts = () => {
  try {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date());

    const toNum = (v: string | undefined) =>
      Number(toEnglishDigits(v ?? "0"));
    return {
      year: toNum(parts.find((p) => p.type === "year")?.value),
      month: toNum(parts.find((p) => p.type === "month")?.value),
      day: toNum(parts.find((p) => p.type === "day")?.value),
    };
  } catch {
    const now = new Date();
    return { year: 1400, month: now.getMonth() + 1, day: now.getDate() };
  }
};

const isAtLeast18 = (y: number, m: number, d: number) => {
  const today = getPersianTodayParts();
  const cutY = today.year - 18;

  if (y < cutY) return true;
  if (y > cutY) return false;

  if (m < today.month) return true;
  if (m > today.month) return false;

  return d <= today.day;
};

/* -------------------------------------------------
   ----------   کامپوننت اصلی   ----------
   ------------------------------------------------- */
function CreditRequestInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showModal } = useModal();

  /* ----------   وضعیت‌های کلی   ---------- */
  const [step, setStep] = useState<number>(1);
  const [amount, setAmount] = useState<number>(80000000);
  const [months, setMonths] = useState<number>(12);
  const [installment, setInstallment] = useState<number>(0);
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [agreed, setAgreed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  /* ----------   فرم اطلاعات فردی   ---------- */
  const [formData, setFormData] = useState({
    fullName: "",
    national_id: "",
    birthDay: "1",
    birthMonth: "1",
    birthYear: "1370",
  });

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    national_id?: string;
    birthDate?: string;
  }>({});

  const [pageError, setPageError] = useState<string>("");

  /* ----------   محاسبات مالی   ---------- */
  const interestRate = useMemo(() => (months === 12 ? 0.08 : 0.12), [months]);
  const feeAmount = useMemo(() => Math.floor(amount * interestRate), [amount, interestRate]);
  const totalPayable = useMemo(() => amount + feeAmount, [amount, feeAmount]);

  useEffect(() => {
    setInstallment(Math.floor(totalPayable / months));
  }, [totalPayable, months]);

  /* ----------   اسکرول نرم  ---------- */
  const scrollToTopSmooth = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ----------   هندل کردن پارامترهای URL (step / status) ---------- */
  const stepParam = searchParams?.get("step");
  const statusParam = searchParams?.get("status");
  const trackIdParam = searchParams?.get("trackId");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (statusParam === "success" && trackIdParam) {
      setTrackingCode(trackIdParam);
      setStep(4);
      scrollToTopSmooth();
    } else if (statusParam === "failed") {
      showModal("error", "پرداخت ناموفق", "پرداخت با خطا مواجه شد. لطفاً مجدداً تلاش کنید.");
    } else if (stepParam === "2" && token) {
      setStep(2);
      scrollToTopSmooth();
    } else if (statusParam === "error") {
      showModal("error", "خطای سیستمی", "در فرآیند پرداخت خطایی رخ داده است. لطفاً با پشتیبانی تماس بگیرید.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepParam, statusParam, trackIdParam]);

  /* ----------   بررسی درخواست‌های در انتظار (pending) ---------- */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    (async () => {
      try {
        const res = await fetch('/api/my-requests/', {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        
        if (!res.ok) return;
        
        const data = await res.json().catch(() => null);
        const hasPending = Array.isArray(data) && data.some((r: any) => r.status === "pending");
        
        if (hasPending) {
          showModal(
            "warning",
            "درخواست در جریان",
            "شما یک درخواست اعتبار در حال بررسی دارید. ابتدا همان را پیگیری کنید."
          );
          router.push("/");
        }
      } catch (error) {
        console.error("[PendingCheck] Error:", error);
      }
    })();
  }, [router, showModal]);

  /* ----------   گام 1 – ادامه   ---------- */
  const handleStepOneNext = () => {
    const token = localStorage.getItem("access_token");

    if (!agreed) {
      showModal("warning", "تایید ضوابط", "برای ادامه باید ضوابط را بپذیرید.");
      return;
    }

    if (token) {
      setStep(2);
      scrollToTopSmooth();
    } else {
      router.push(`/login?redirect=/credit?step=2`);
    }
  };

  /* ----------   گام 2 – اعتبارسنجی فرم ---------- */
  const validateStepTwo = () => {
    const errors: typeof fieldErrors = {};

    const fullName = formData.fullName.trim();
    const national = onlyDigits(formData.national_id);

    if (fullName.length < 3) errors.fullName = "نام و نام خانوادگی را به‌صورت کامل وارد کنید.";
    if (!isValidIranNationalCode(national)) errors.national_id = "کد ملی معتبر نیست.";

    const y = Number(onlyDigits(formData.birthYear));
    const m = Number(onlyDigits(formData.birthMonth));
    const d = Number(onlyDigits(formData.birthDay));

    if (!y || !m || !d) {
      errors.birthDate = "تاریخ تولد را کامل انتخاب کنید.";
    } else if (y < 1300 || y > 1405 || m < 1 || m > 12 || d < 1 || d > 31) {
      errors.birthDate = "تاریخ تولد نامعتبر است.";
    } else if (!isAtLeast18(y, m, d)) {
      errors.birthDate = "سن باید حداقل ۱۸ سال باشد.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ----------   گام 3 – ارسال به درگاه (بدون ثبت درخواست) ---------- */
  const handleFinalSubmit = async () => {
    setLoading(true);
    setPageError("");

    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push(`/login?redirect=/credit?step=2`);
      setLoading(false);
      return;
    }

    try {
      // ۱️⃣ اعتبارسنجی مجدد قبل از ارسال
      if (!validateStepTwo()) {
        showModal("error", "خطای اعتبارسنجی", "لطفاً اطلاعات را مجدداً بررسی کنید.");
        setLoading(false);
        return;
      }

      // ۲️⃣ ساخت تاریخ تولد به فرمت YYYY‑MM‑DD
      const y = onlyDigits(formData.birthYear);
      const m = onlyDigits(formData.birthMonth).padStart(2, "0");
      const d = onlyDigits(formData.birthDay).padStart(2, "0");
      const fullBirthDate = `${y}-${m}-${d}`;

      // ۳️⃣ ذخیره اطلاعات کاربر برای استفاده بعد از پرداخت موفق
      const userData = {
        national_id: onlyDigits(formData.national_id),
        fullName: formData.fullName.trim(),
        birthDate: fullBirthDate,
        creditAmount: amount, // مقدار وام درخواستی
        installments: months,
      };

      // ذخیره در localStorage
      localStorage.setItem('pending_credit_data', JSON.stringify({
        userData,
        token
      }));

      // ۴️⃣ درخواست پرداخت به درگاه - با اطلاعات کاربر و مبلغ ثابت اعتبارسنجی
      const paymentRes = await fetch(PAYMENT_REQUEST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userData,
          amount: VERIFICATION_AMOUNT // ✅ مبلغ ثابت ۱۰۰,۰۰۰ تومان برای اعتبارسنجی
        }),
      });

      const paymentData = await paymentRes.json();

      if (!paymentRes.ok || !paymentData.ok) {
        const msg = paymentData.error || paymentData.message || "خطای درگاه پرداخت.";
        setPageError(msg);
        showModal("error", "خطای پرداخت", msg);
        setLoading(false);
        return;
      }

      // ۵️⃣ انتقال به درگاه Zibal
      const paymentUrl = paymentData.data?.url || paymentData.url;
      if (!paymentUrl) {
        throw new Error("لینک پرداخت دریافت نشد.");
      }

      window.location.href = paymentUrl;
      
    } catch (e: any) {
      console.error("[FinalSubmit] Error:", e);
      const msg = e?.message || "خطای ارتباط با سرور.";
      setPageError(msg);
      showModal("error", "خطای شبکه", msg);
      setLoading(false);
    }
  };

  /* ----------   نمایش گام‌ها (Stepper) ---------- */
  const Stepper = () => {
    const steps = [
      { n: 1, t: "محاسبه" },
      { n: 2, t: "اطلاعات" },
      { n: 3, t: "پرداخت" },
      { n: 4, t: "ثبت شد" },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2">
          {steps.map((s, idx) => {
            const isActive = step === s.n;
            const isDone = step > s.n;
            return (
              <div key={s.n} className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm border ${
                      isDone
                        ? "bg-green-600 text-white border-green-600"
                        : isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-400 border-gray-200"
                    }`}
                  >
                    {s.n}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-[11px] font-black ${
                        isActive ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {s.t}
                    </div>
                    <div className="text-[9px] font-bold text-gray-300">
                      {isDone ? "تکمیل شد" : isActive ? "درحال انجام" : "بعدی"}
                    </div>
                  </div>
                </div>

                {idx !== steps.length - 1 && (
                  <div className="h-1 bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isDone
                          ? "w-full bg-green-600"
                          : isActive
                          ? "w-1/2 bg-blue-600"
                          : "w-0 bg-gray-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ----------   خلاصه‌ مالی (SummaryBox) ---------- */
  const SummaryBox = () => (
    <div className="mb-8 bg-gray-900 text-white rounded-[2.5rem] p-7 shadow-2xl border-b-[6px] border-blue-600">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] opacity-60 font-black uppercase tracking-widest">
          خلاصه اعتبار
        </span>
        <span className="text-[10px] font-black bg-white/10 border border-white/10 px-3 py-1.5 rounded-2xl">
          {months} ماهه • کارمزد {(interestRate * 100).toFixed(0)}٪
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-right">
        <InfoBox label="مبلغ اعتبار" value={amount} />
        <InfoBox label="کارمزد" value={feeAmount} />
        <InfoBox label="مجموع پرداختی" value={totalPayable} />
        <InfoBox label="قسط ماهانه" value={installment} blue />
      </div>

      {(step === 2 || step === 3) && (
        <button
          type="button"
          onClick={() => {
            setStep(1);
            scrollToTopSmooth();
          }}
          className="mt-5 w-full bg-white text-gray-900 py-4 rounded-2xl font-black hover:bg-blue-50 transition-all"
        >
          ویرایش مبلغ / مدت بازپرداخت
        </button>
      )}
    </div>
  );

  const InfoBox = ({
    label,
    value,
    blue,
  }: {
    label: string;
    value: number;
    blue?: boolean;
  }) => (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="text-[9px] opacity-60 font-black">{label}</div>
      <div
        className={`text-lg font-black mt-1 ${
          blue ? "text-blue-300" : "text-white"
        }`}
      >
        {value.toLocaleString("fa-IR")}{" "}
        <span className="text-[10px] opacity-80">تومان</span>
      </div>
    </div>
  );

  /* ----------   مقادیر ثابت برای انتخاب تاریخ ---------- */
  const years = useMemo(() => Array.from({ length: 70 }, (_, i) => (1320 + i).toString()), []);
  const monthsList = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString()), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => (i + 1).toString()), []);

  const quickAmounts = [30000000, 50000000, 80000000, 100000000, 150000000];

  /* ----------   رندر کل صفحه ---------- */
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4 md:p-6 font-sans" dir="rtl">
      <div
        ref={contentRef}
        className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl max-w-xl w-full border border-gray-200/50"
      >
        <Stepper />
        <SummaryBox />

        {/* نمایش خطای سراسری صفحه */}
        {pageError && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-[11px] font-black leading-6">
            {pageError}
          </div>
        )}

        {/* -------------------------------------------------
            ------------------   STEP 1   -------------------
            ------------------------------------------------- */}
        {step === 1 && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-2xl font-black text-center text-gray-900">
              محاسبه اعتبار خرید 💳
            </h1>

            <div className="space-y-6">
              {/* مبلغ */}
              <div className="flex justify-between items-center px-2">
                <label className="text-sm font-black text-gray-500">
                  مبلغ اعتبار انتخابی:
                </label>
                <div className="text-2xl font-black text-blue-600">
                  {amount.toLocaleString("fa-IR")}{" "}
                  <span className="text-xs font-bold">تومان</span>
                </div>
              </div>

              {/* دکمه‌های پیش‌گزین */}
              <div className="grid grid-cols-5 gap-2">
                {quickAmounts.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(a)}
                    className={`py-3 rounded-2xl text-[10px] font-black border transition-all ${
                      amount === a
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {Math.round(a / 1000000)}M
                  </button>
                ))}
              </div>

              {/* اسلایدر Amount */}
              <input
                type="range"
                min="10000000"
                max="150000000"
                step="5000000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full accent-blue-600 h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />

              {/* انتخاب تعداد ماه */}
              <div className="grid grid-cols-2 gap-4">
                {[12, 18].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={`p-5 rounded-3xl font-black border-2 transition-all ${
                      months === m
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-md"
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {m} ماهه{" "}
                    <span className="text-[10px] block font-bold mt-1">
                      {m === 12 ? "کارمزد: ۸٪" : "کارمزد: ۱۲٪"}
                    </span>
                  </button>
                ))}
              </div>

              {/* ضوابط */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 mr-2 uppercase">
                  ضوابط و شرایط عمومی تخصیص اعتبار:
                </p>

                <div
                  className={`relative bg-gray-50 border-2 border-gray-100 rounded-[2rem] transition-all duration-700 ease-in-out ${
                    isExpanded ? "max-h-[300px] overflow-y-auto" : "max-h-16 overflow-hidden"
                  }`}
                >
                  <div className="p-6 text-[9px] leading-7 text-gray-500 font-bold text-justify">
                    <p className="mb-2 text-gray-900 font-black">
                      ۱. ماهیت حقوقی خدمت تخصیص اعتبار خرید کالا:
                    </p>
                    <p className="mb-4">
                      متقاضی محترم آگاهی کامل دارد که خدمت ارائه شده صرفاً یک اعتبار مجازی جهت خرید کالا از این فروشگاه است و فاقد هرگونه ماهیت پولی، بانکی یا صرافی می‌باشد.
                    </p>
                    
                    <p className="mb-2 text-gray-900 font-black">
                      ۲. هزینه بررسی اعتبارسنجی:
                    </p>
                    <p className="mb-4">
                      جهت بررسی اعتبارسنجی و پردازش درخواست، مبلغ ۱۰۰,۰۰۰ تومان به‌صورت غیرقابل بازگشت دریافت می‌گردد. این مبلغ صرفاً هزینه بررسی اولیه بوده و با مبلغ اعتبار درخواستی ارتباطی ندارد.
                    </p>
                    
                    <p className="mb-2 text-gray-900 font-black">
                      ۳. شرایط بازپرداخت:
                    </p>
                    <p className="mb-4">
                      بازپرداخت اقساط به صورت ماهیانه و از طریق سیستم پرداخت الکترونیکی انجام می‌پذیرد.
                    </p>
                    
                    <p className="mb-2 text-gray-900 font-black">
                      ۴. تاخیر در پرداخت:
                    </p>
                    <p>
                      در صورت تاخیر در پرداخت اقساط، جریمه دیرکرد مطابق مقررات اعمال خواهد شد.
                    </p>
                  </div>

                  {!isExpanded && (
                    <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-gray-50 to-transparent flex items-end justify-center pb-2">
                      <button
                        type="button"
                        onClick={() => setIsExpanded(true)}
                        className="text-[9px] text-blue-600 font-black flex items-center gap-1 hover:underline"
                      >
                        بیشتر بخوانید
                      </button>
                    </div>
                  )}
                </div>

                {/* چک‌باکس پذیرش ضوابط */}
                <label className="flex items-center gap-3 mt-4 mr-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-black text-gray-500 group-hover:text-gray-900 transition-colors">
                    بندهای فوق را مطالعه کرده و با آگاهی کامل می‌پذیرم.
                  </span>
                </label>
              </div>

              {/* دکمه ادامه */}
              <button
                type="button"
                onClick={handleStepOneNext}
                disabled={!agreed}
                className={`w-full py-6 rounded-[2rem] font-black shadow-lg transition-all ${
                  agreed
                    ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                تایید ضوابط و مرحله بعد
              </button>
            </div>
          </section>
        )}

        {/* -------------------------------------------------
            ------------------   STEP 2   -------------------
            ------------------------------------------------- */}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPageError("");
              if (!validateStepTwo()) {
                showModal("error", "اطلاعات نامعتبر", "لطفاً خطاهای فرم را اصلاح کنید.");
                return;
              }
              setStep(3);
              scrollToTopSmooth();
            }}
            className="space-y-6 animate-in fade-in slide-in-from-left duration-500"
          >
            <h2 className="text-2xl font-black text-gray-900 text-center mb-4">
              تکمیل اطلاعات متقاضی
            </h2>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                scrollToTopSmooth();
              }}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all"
            >
              برگشت به مرحله قبل
            </button>

            {/* نام و نام خانوادگی */}
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-600 pr-4 mb-1 block">
                نام و نام خانوادگی:
              </label>
              <input
                type="text"
                className={`w-full p-5 bg-gray-50 border-2 rounded-[2rem] font-black text-gray-900 outline-none focus:border-blue-600 focus:bg-white transition-all text-center ${
                  fieldErrors.fullName ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="مطابق شناسنامه وارد کنید"
                required
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  setFieldErrors((p) => ({ ...p, fullName: "" }));
                }}
              />
              {fieldErrors.fullName && (
                <p className="text-[10px] font-black text-red-500 pr-4 mt-1">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* تاریخ تولد */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 pr-4 block">
                تاریخ تولد خورشیدی:
              </label>
              <div className="grid grid-cols-3 gap-3">
                <select
                  className="p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl font-black text-gray-900 text-center focus:border-blue-600 outline-none"
                  value={formData.birthYear}
                  onChange={(e) => {
                    setFormData({ ...formData, birthYear: onlyDigits(e.target.value) });
                    setFieldErrors((p) => ({ ...p, birthDate: "" }));
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  className="p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl font-black text-gray-900 text-center focus:border-blue-600 outline-none"
                  value={formData.birthMonth}
                  onChange={(e) => {
                    setFormData({ ...formData, birthMonth: onlyDigits(e.target.value) });
                    setFieldErrors((p) => ({ ...p, birthDate: "" }));
                  }}
                >
                  {monthsList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  className="p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl font-black text-gray-900 text-center focus:border-blue-600 outline-none"
                  value={formData.birthDay}
                  onChange={(e) => {
                    setFormData({ ...formData, birthDay: onlyDigits(e.target.value) });
                    setFieldErrors((p) => ({ ...p, birthDate: "" }));
                  }}
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.birthDate && (
                <p className="text-[10px] font-black text-red-500 pr-4 mt-1">
                  {fieldErrors.birthDate}
                </p>
              )}
            </div>

            {/* کد ملی */}
            <div className="space">
              <label className="text-xs font-black text-gray-600 pr-4 mb-1 block">
                کد ملی ده رقمی:
              </label>
              <input
                type="text"
                dir="ltr"
                className={`w-full p-5 bg-gray-50 border-2 rounded-[2rem] font-black text-gray-900 outline-none text-center tracking-[0.4em] focus:border-blue-600 focus:bg-white transition-all ${
                  fieldErrors.national_id ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="0012345678"
                maxLength={10}
                required
                value={formData.national_id}
                onChange={(e) => {
                  const v = onlyDigits(e.target.value).slice(0, 10);
                  setFormData({ ...formData, national_id: v });
                  setFieldErrors((p) => ({ ...p, national_id: "" }));
                }}
              />
              {fieldErrors.national_id && (
                <p className="text-[10px] font-black text-red-500 pr-4 mt-1">
                  {fieldErrors.national_id}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black shadow-xl hover:bg-blue-700 transition-all mt-4"
            >
              تایید نهایی و استعلام اعتبار
            </button>
          </form>
        )}

        {/* -------------------------------------------------
            ------------------   STEP 3   -------------------
            ------------------------------------------------- */}
        {step === 3 && (
          <div className="text-center space-y-8 py-8 animate-in zoom-in duration-500">
            <button
              type="button"
              onClick={() => {
                setStep(2);
                scrollToTopSmooth();
              }}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all"
            >
              برگشت به اطلاعات متقاضی
            </button>

            <div className="text-7xl mb-4 grayscale">🔒</div>
            <h2 className="text-2xl font-black text-gray-900">
              اتصال امن به درگاه بانکی
            </h2>
            <p className="text-gray-500 font-bold text-sm leading-8 px-6">
              جهت استعلام اعتبار مبلغ{" "}
              <span className="text-gray-900 font-black">۱۰۰,۰۰۰ تومان</span> کسر
              خواهد شد.
              <br />
              <span className="text-red-500 text-xs mt-2 block">
                (این مبلغ غیرقابل بازگشت و صرفاً هزینه بررسی اعتبارسنجی است)
              </span>
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-[11px] font-black text-blue-700 leading-6">
              نکته: این مبلغ صرفاً هزینه استعلام است و با مبلغ اعتبار انتخابی
              در ارتباط نیست.
            </div>

            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={loading}
              className="w-full bg-green-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "پرداخت و ثبت نهایی پرونده"
              )}
            </button>
          </div>
        )}

        {/* -------------------------------------------------
            ------------------   STEP 4   -------------------
            ------------------------------------------------- */}
        {step === 4 && (
          <div className="text-center space-y-8 animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-4 border-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h2 className="text-3xl font-black text-gray-900 mb-2">
              پرونده با موفقیت ثبت شد
            </h2>

            <div className="bg-blue-50 p-8 rounded-[2.5rem] border-2 border-dashed border-blue-200">
              <span className="text-blue-400 text-xs block mb-3 font-black uppercase">
                کد رهگیری شما:
              </span>
              <span className="text-blue-800 font-black text-4xl tracking-[0.2em]">
                {trackingCode}
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/my-requests")}
              className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black hover:bg-blue-700 transition-all shadow-xl"
            >
              مشاهده وضعیت پرونده
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full bg-gray-900 text-white py-6 rounded-[2.5rem] font-black hover:bg-black transition-all shadow-xl"
            >
              بازگشت به پیشخوان فروشگاه
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

/* -------------------------------------------------
   ----------   رندر نهایی با Suspense ----------
   ------------------------------------------------- */
export default function CreditRequestPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-black" dir="rtl">
          در حال بارگذاری...
        </main>
      }
    >
      <CreditRequestInner />
    </Suspense>
  );
}