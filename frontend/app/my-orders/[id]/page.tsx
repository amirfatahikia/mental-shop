"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useModal } from "@/context/ModalContext";
import { ArrowRight, CheckCircle2, Package, Truck, CreditCard, Wallet } from "lucide-react";

type OrderItem = {
  id: number | string;
  product: number | string;
  product_title?: string;
  product_image?: string | null;
  quantity: number;
  price: number;
};

type Order = {
  id: number | string;
  total_price: number;
  payment_method: string;
  status: string;
  created_at: string;
  items: OrderItem[];
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showModal } = useModal();

  // ✅ FIX: اگر id آرایه بود یا نبود، درست هندل کن
  const rawId = (params as any)?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const IP_ADDRESS = "mental-shop-api.liara.run";

  const API_BASE = `https://${IP_ADDRESS}`;

  const ENDPOINTS = useMemo(
    () => [
      `${API_BASE}/api/orders/${id}/`,
      `${API_BASE}/api/my-orders/${id}/`,
    ],
    [API_BASE, id]
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    setLoading(true);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      router.push(`/login?redirect=/my-orders/${id}`);
      return;
    }

    if (!id) {
      setLoading(false);
      setOrder(null);
      return;
    }

    try {
      let lastNon404: Response | null = null;

      for (const url of ENDPOINTS) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.status === 404) continue;
        lastNon404 = res;

        if (!res.ok) {
          showModal("error", "خطا", "دریافت جزئیات سفارش ناموفق بود.");
          setLoading(false);
          return;
        }

        const data = (await res.json()) as Order;
        setOrder(data);
        setLoading(false);
        return;
      }

      if (!lastNon404) {
        showModal("error", "API پیدا نشد", "مسیر جزئیات سفارش روی سرور وجود ندارد.");
      } else {
        showModal("error", "خطا", "دریافت جزئیات سفارش ناموفق بود.");
      }
      setLoading(false);
    } catch {
      showModal("error", "خطای شبکه", "ارتباط با سرور برقرار نشد.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center font-black">در حال بارگذاری...</div>;
  }

  if (!order) {
    return (
      <div className="min-h-screen p-6">
        <button onClick={() => router.push("/my-orders")} className="flex items-center gap-2 font-black text-gray-700">
          <ArrowRight /> برگشت
        </button>
        <div className="mt-8 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm font-black">
          سفارشی برای نمایش پیدا نشد.
        </div>
      </div>
    );
  }

  // ✅ FIX: با خروجی‌های بک‌اند هم سازگار باشه
  const pm = (order.payment_method || "").toLowerCase();
  const paymentLabel =
    pm === "installment" || pm === "credit" || pm === "wallet"
      ? "اقساطی/اعتباری"
      : pm === "direct" || pm === "gateway" || pm === "online"
      ? "آنلاین"
      : order.payment_method;

  return (
    <main className="min-h-screen bg-[#fcfcfc] p-4 md:p-10 rtl" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/my-orders")}
            className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm font-black text-gray-700"
          >
            <ArrowRight size={18} /> برگشت
          </button>

          <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm font-black">
            سفارش #{order.id}
          </div>
        </div>

        <section className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100">
          <div className="flex flex-col md:flex-row gap-6 justify-between md:items-center">
            <div className="space-y-2">
              <div className="text-xl font-black text-gray-900 flex items-center gap-3 italic">
                <Package className="text-blue-600" /> جزئیات سفارش
              </div>
              <div className="text-sm font-bold text-gray-400">
                تاریخ: {new Date(order.created_at).toLocaleString("fa-IR")}
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-black text-xs flex items-center gap-2">
                {pm === "installment" || pm === "credit" || pm === "wallet" ? <Wallet size={14} /> : <CreditCard size={14} />}
                {paymentLabel}
              </span>
              <span className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs flex items-center gap-2">
                <CheckCircle2 size={14} />
                {order.status}
              </span>
            </div>
          </div>

          <div className="mt-10 bg-gray-50 border border-gray-100 rounded-[2.5rem] p-6">
            <div className="flex justify-between items-center font-black">
              <span className="text-gray-500 text-sm">مبلغ کل</span>
              <span className="text-gray-900 text-xl">{(order.total_price || 0).toLocaleString()} تومان</span>
            </div>
          </div>

          <div className="mt-10">
            <div className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <Truck className="text-blue-600" /> اقلام سفارش
            </div>

            <div className="space-y-4">
              {order.items?.map((it) => {
                // ✅ FIX: اگر عکس نسبی بود، کاملش کن
                const imgSrc =
                  it.product_image && !it.product_image.startsWith("http")
                    ? `${API_BASE}${it.product_image}`
                    : it.product_image;

                return (
                  <div
                    key={String(it.id)}
                    className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                      {imgSrc ? (
                        <img src={imgSrc} alt={it.product_title || ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-[10px] text-gray-400 font-black">بدون عکس</div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="font-black text-gray-900">{it.product_title || `محصول #${it.product}`}</div>
                      <div className="text-xs font-bold text-gray-400 mt-1">
                        تعداد: {it.quantity} | قیمت واحد: {(it.price || 0).toLocaleString()} تومان
                      </div>
                    </div>

                    <div className="font-black text-gray-900">
                      {((it.price || 0) * (it.quantity || 0)).toLocaleString()} تومان
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
