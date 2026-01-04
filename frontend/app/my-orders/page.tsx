"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModal } from "@/context/ModalContext";
import {
  Package,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  RefreshCw,
  AlertTriangle,
  BadgeCheck,
  Clock,
  Truck,
  XCircle,
} from "lucide-react";

type Order = {
  id: number | string;
  tracking_number?: string | null;
  total_price: number;
  payment_method: string;
  status: string;
  status_label?: string;
  created_at: string;
  items?: Array<{
    id: number | string;
    quantity: number;
    product_title?: string;
    product_image?: string | null;
  }>;
};

export default function MyOrdersPage() {
  const router = useRouter();
  const { showModal } = useModal();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "pending" | "processing" | "shipped" | "delivered" | "canceled"
  >("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const IP_ADDRESS = "mental-shop-api.liara.run";
  const API_BASE = `https://${IP_ADDRESS}`;

  // ✅ چند مسیر مختلف (برای اینکه هر مدل urls.py داشتی کار کنه)
  const ORDER_ENDPOINTS = useMemo(
    () => [
      `${API_BASE}/api/orders/`, // اگر مستقیم ویوست
      `${API_BASE}/api/orders/list/`, // اگر list/ داشتی
      `${API_BASE}/api/my-orders/`, // alias
    ],
    [API_BASE]
  );

  const getStatusMeta = (status: string) => {
    const st = (status || "").toLowerCase();

    // ✅ بک‌اند ممکنه pending بده (نه processing)
    if (st === "pending") {
      return {
        label: "در انتظار پرداخت",
        chip: "bg-yellow-50 text-yellow-700 border-yellow-100",
        Icon: Clock,
      };
    }

    if (st === "processing") {
      return {
        label: "در حال پردازش",
        chip: "bg-yellow-50 text-yellow-700 border-yellow-100",
        Icon: Clock,
      };
    }

    if (st === "paid") {
      return {
        label: "پرداخت‌شده",
        chip: "bg-emerald-50 text-emerald-700 border-emerald-100",
        Icon: BadgeCheck,
      };
    }

    if (st === "shipped") {
      return {
        label: "ارسال‌شده",
        chip: "bg-blue-50 text-blue-700 border-blue-100",
        Icon: Truck,
      };
    }

    if (st === "delivered") {
      return {
        label: "تحویل‌شده",
        chip: "bg-green-50 text-green-700 border-green-100",
        Icon: BadgeCheck,
      };
    }

    if (st === "canceled" || st === "cancelled") {
      return {
        label: "لغو‌شده",
        chip: "bg-red-50 text-red-700 border-red-100",
        Icon: XCircle,
      };
    }

    return {
      label: status || "نامشخص",
      chip: "bg-gray-50 text-gray-700 border-gray-100",
      Icon: Package,
    };
  };

  const tryFetch = async (): Promise<Order[]> => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login?redirect=/my-orders");
      return [];
    }

    let lastNon404: Response | null = null;

    for (const url of ORDER_ENDPOINTS) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 404) continue;
      lastNon404 = res;

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "fetch_failed");
      }

      const data = await res.json();
      // بک‌اند ممکنه {results:[...]} برگردونه
      if (Array.isArray(data)) return data as Order[];
      if (Array.isArray((data as any)?.results)) return (data as any).results as Order[];
      return [];
    }

    // اگر همه 404 بودن:
    if (!lastNon404) throw new Error("no_endpoint");
    throw new Error("fetch_failed");
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await tryFetch();
      setOrders(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (e: any) {
      const msg =
        e?.message === "no_endpoint"
          ? "مسیر API سفارش‌ها روی سرور پیدا نشد."
          : "دریافت لیست سفارش‌ها با خطا مواجه شد.";
      setError(msg);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalized = (s: string) => (s || "").toString().toLowerCase().trim();

  const filteredOrders = useMemo(() => {
    const q = normalized(query);

    const matchStatus = (orderStatus: string) => {
      const st = normalized(orderStatus);

      if (statusFilter === "all") return true;

      // ✅ اگر کاربر "processing" زد ولی بک‌اند "pending" می‌ده
      if (statusFilter === "processing") {
        return st === "processing" || st === "pending";
      }

      return st === normalized(statusFilter);
    };

    const list = orders.filter((o) => {
      const idStr = String((o as any)?.id ?? (o as any)?.pk ?? (o as any)?.order_id ?? "");
      const tracking = String(o.tracking_number || "");
      const total = String(o.total_price || "");
      const status = String(o.status || "");
      const statusLabel = String(o.status_label || "");
      const created = String(o.created_at || "");

      const matchesQuery =
        !q ||
        normalized(idStr).includes(q) ||
        normalized(tracking).includes(q) ||
        normalized(total).includes(q) ||
        normalized(status).includes(q) ||
        normalized(statusLabel).includes(q) ||
        normalized(created).includes(q);

      const matchesStatus = matchStatus(o.status);

      return matchesQuery && matchesStatus;
    });

    list.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });

    return list;
  }, [orders, query, statusFilter, sort]);

  return (
    <main className="min-h-screen bg-[#fcfcfc] p-4 md:p-10 rtl" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl">
              <Package />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 italic">سفارش‌های من</h1>
              <p className="text-xs font-bold text-gray-400">لیست سفارش‌هایی که ثبت کرده‌اید</p>
            </div>
          </div>

          <button
            onClick={() =>
              showModal(
                "success",
                "پشتیبانی",
                "اگر مشکلی در سفارش‌هاتون دارید، پیام بدید تا سریع بررسی کنیم ✅"
              )
            }
            className="hidden md:flex items-center gap-2 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm font-black text-gray-700 hover:bg-gray-50"
          >
            <AlertTriangle size={18} />
            پشتیبانی
          </button>
        </div>

        {/* Controls */}
        <section className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search */}
            <div className="md:col-span-6 relative">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجو با شماره سفارش، مبلغ، وضعیت، تاریخ..."
                className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] px-12 py-4 text-sm font-black text-gray-900 outline-none focus:border-blue-600 placeholder:text-gray-400"
              />
            </div>

            {/* Status filter */}
            <div className="md:col-span-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-[2rem] px-4 py-3">
                <Filter className="text-gray-400" size={18} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-transparent outline-none text-sm font-black text-gray-700"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="paid">پرداخت‌شده</option>
                  <option value="pending">در انتظار پرداخت</option>
                  <option value="processing">در حال پردازش</option>
                  <option value="shipped">ارسال‌شده</option>
                  <option value="delivered">تحویل‌شده</option>
                  <option value="canceled">لغو‌شده</option>
                </select>
              </div>
            </div>

            {/* Sort */}
            <div className="md:col-span-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-[2rem] px-4 py-3">
                <Calendar className="text-gray-400" size={18} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="w-full bg-transparent outline-none text-sm font-black text-gray-700"
                >
                  <option value="newest">جدیدترین</option>
                  <option value="oldest">قدیمی‌ترین</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-xs font-black text-gray-400">
              تعداد نمایش: <span className="text-gray-700">{filteredOrders.length}</span>
            </div>

            <button
              onClick={fetchOrders}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-lg hover:bg-blue-700"
            >
              <RefreshCw size={16} />
              بروزرسانی
            </button>
          </div>
        </section>

        {/* Body */}
        {loading ? (
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm font-black text-center">
            در حال بارگذاری سفارش‌ها...
          </div>
        ) : error ? (
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm font-black">
            <div className="text-red-600 mb-2">خطا</div>
            <div className="text-gray-700">{error}</div>
            <button
              onClick={fetchOrders}
              className="mt-6 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-blue-600"
            >
              تلاش مجدد
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm font-black text-center">
            سفارشی برای نمایش پیدا نشد.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredOrders.map((order) => {
              const orderId = (order as any)?.id ?? (order as any)?.pk ?? (order as any)?.order_id;
              const meta = getStatusMeta(order.status);
              const Icon = meta.Icon;

              return (
                <div
                  key={String(orderId ?? Math.random())}
                  className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                      <div className="text-lg font-black text-gray-900 italic">
                        سفارش #{orderId ?? "—"}
                      </div>

                      <div className="text-xs font-bold text-gray-400">
                        تاریخ: {order.created_at ? new Date(order.created_at).toLocaleString("fa-IR") : "—"}
                      </div>

                      {order.tracking_number && (
                        <div className="text-xs font-bold text-gray-400">
                          کد پیگیری: <span className="text-gray-700">{order.tracking_number}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-4 py-2 rounded-full border text-xs font-black flex items-center gap-2 ${meta.chip}`}>
                        <Icon size={14} />
                        {order.status_label || meta.label}
                      </span>

                      <span className="px-4 py-2 rounded-full border border-gray-100 bg-gray-50 text-xs font-black text-gray-700">
                        مبلغ: {(order.total_price || 0).toLocaleString()} تومان
                      </span>

                      {/* ✅ FIX: اگر id نبود لینک نساز */}
                      {orderId != null ? (
                        <Link
                          href={`/my-orders/${encodeURIComponent(String(orderId))}`}
                          className="px-5 py-3 rounded-2xl bg-gray-900 text-white font-black text-xs flex items-center gap-2 hover:bg-blue-600"
                        >
                          مشاهده جزئیات <ChevronLeft size={18} />
                        </Link>
                      ) : (
                        <span className="px-5 py-3 rounded-2xl bg-gray-200 text-gray-500 font-black text-xs">
                          جزئیات ناموجود
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Support */}
        <button
          onClick={() =>
            showModal(
              "success",
              "پشتیبانی",
              "اگر مشکلی در سفارش‌هاتون دارید، پیام بدید تا سریع بررسی کنیم ✅"
            )
          }
          className="md:hidden fixed bottom-6 left-6 right-6 bg-blue-600 text-white p-5 rounded-[2rem] font-black shadow-2xl flex items-center justify-center gap-2"
        >
          <AlertTriangle size={18} />
          پشتیبانی
        </button>
      </div>
    </main>
  );
}
