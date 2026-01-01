"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useModal } from "@/context/ModalContext";

export default function RequestDetails() {
  const params = useParams();
  const code = (params?.code ?? "") as string;

  const { showModal } = useModal();
  const router = useRouter();

  const [request, setRequest] = useState<any>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [birthCert, setBirthCert] = useState<File | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const fetchData = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("لطفاً ابتدا وارد حساب خود شوید.");
      return;
    }

    try {
      // ✅ به جای 127.0.0.1 مستقیم، از /api استفاده می‌کنیم (rewrite می‌فرسته بک‌اند)
      const res = await fetch("/api/my-requests/", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.detail || data?.message || "خطا در دریافت درخواست‌ها";
        setError(msg);
        return;
      }

      const found = Array.isArray(data)
        ? data.find((r: any) => String(r.tracking_code).trim() === String(code).trim())
        : null;

      if (found) setRequest(found);
      else setError(`درخواستی با کد ${code} پیدا نشد.`);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    }
  };

  const handleUploadDocuments = async () => {
    if (!request?.id) {
      showModal("error", "خطا", "شناسه درخواست پیدا نشد.");
      return;
    }

    if (!birthCert || !idFront || !idBack) {
      showModal(
        "warning",
        "نقص مدارک 📁",
        "برای بررسی پرونده باید هر سه تصویر (شناسنامه + کارت ملی رو و پشت) را انتخاب کنی."
      );
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      showModal("error", "نیاز به ورود", "ابتدا وارد حساب شوید.");
      router.push("/login");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("birth_certificate", birthCert);
      formData.append("id_card_front", idFront);
      formData.append("id_card_back", idBack);

      // اگر بک‌اند اجازه بده وضعیت رو هم آپدیت کن
      formData.append("status", "verifying");

      // ✅ آدرس درست طبق URLهای بک‌اند:
      // /api/my-requests/<uuid:id>/
      // و حتماً آخرش اسلش دارد
      const res = await fetch(`/api/my-requests/${request.id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          // ⚠️ برای FormData Content-Type نذار! مرورگر خودش boundary می‌ذاره.
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showModal(
          "success",
          "ارسال شد ✅",
          "مدارک با موفقیت دریافت شد. کارشناسان به زودی بررسی را شروع می‌کنند."
        );
        await fetchData();
      } else {
        // ✅ اینجا پیام واقعی بک‌اند رو نشون می‌دیم
        const msg =
          data?.detail ||
          data?.message ||
          (typeof data === "string" ? data : null) ||
          "مشکلی در ارسال فایل‌ها پیش آمد.";

        showModal("error", "خطای ارسال ❌", msg);
      }
    } catch (err) {
      showModal("error", "خطای شبکه 🌐", "ارتباط با سرور برقرار نشد.");
    } finally {
      setUploading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-black text-gray-900 mb-4">{error}</h2>
        <button
          onClick={() => router.push("/")}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg"
        >
          بازگشت به خانه
        </button>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black italic text-blue-600">
        در حال دریافت اطلاعات...
      </div>
    );
  }

  const amountValue = Number(request.amount) || 0;
  const instValue = Number(request.installments) || 12;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-10 text-white text-center relative overflow-hidden">
          <button
            onClick={() => router.push("/")}
            className="absolute right-6 top-10 bg-white/20 p-2.5 rounded-2xl hover:bg-white/30 transition-all z-10"
          >
            بازگشت
          </button>
          <h1 className="text-3xl font-black italic">جزئیات پرونده</h1>
          <p className="opacity-70 mt-3 font-bold tracking-widest uppercase text-xs">
            کد پیگیری: {request.tracking_code}
          </p>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-6 rounded-[2.5rem] text-center border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 mb-2 uppercase">مبلغ اعتبار</p>
              <p className="text-xl font-black text-gray-900">
                {amountValue.toLocaleString()} <span className="text-[10px]">ت</span>
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-[2.5rem] text-center border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 mb-2 uppercase">تعداد اقساط</p>
              <p className="text-xl font-black text-gray-900">{instValue} ماهه</p>
            </div>
          </div>

          {request.status === "approved" && (
            <div className="bg-white p-8 rounded-[3rem] border-4 border-dashed border-blue-100">
              <h3 className="text-lg font-black text-blue-900 mb-6 text-center italic">📤 آپلود مدارک نهایی</h3>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 mr-4">تصویر شناسنامه (صفحه اول)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBirthCert(e.target.files?.[0] || null)}
                    className="bg-gray-50 p-4 rounded-[1.5rem] border-2 border-gray-100 text-[10px] font-black w-full outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 mr-4">کارت ملی (روی کارت)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setIdFront(e.target.files?.[0] || null)}
                      className="bg-gray-50 p-4 rounded-[1.5rem] border-2 border-gray-100 text-[10px] font-black w-full outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 mr-4">کارت ملی (پشت کارت)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setIdBack(e.target.files?.[0] || null)}
                      className="bg-gray-50 p-4 rounded-[1.5rem] border-2 border-gray-100 text-[10px] font-black w-full outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUploadDocuments}
                  disabled={uploading}
                  className={`w-full py-5 rounded-[2rem] font-black shadow-xl transition-all mt-6 italic ${
                    uploading ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {uploading ? "در حال ارسال..." : "ارسال برای تایید نهایی و واریز"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
