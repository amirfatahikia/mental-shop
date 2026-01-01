"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Minus, ArrowRight, ShoppingCart } from "lucide-react";
import { useModal } from "@/context/ModalContext";

type ProductVariant = {
  id: number | string;
  price?: number;
  sale_price?: number;
  base_sale_price?: number;
  stock?: number;
  color_name?: string;
  color_title?: string;
  name?: string;
  title?: string;
  color_code?: string;
  hex?: string;
  image_url?: string | null;
  image?: string | null;
  main_image?: string | null;
};

type Product = {
  id: number | string;
  title: string;
  description?: string | null;
  base_sale_price: number;
  category_slug?: string | null;
  image_url?: string | null;
  main_image?: string | null;
  last_updated?: string;

  variants?: ProductVariant[];
  color_variants?: ProductVariant[];
  options?: ProductVariant[];
};

type Category = {
  id: number;
  title: string;
  slug: string;
  parent?: number | null;
  parent_id?: number | null;
};

type CartItem = {
  id: Product["id"];
  title: string;
  price: number;
  image_url?: string | null;
  quantity: number;

  variant_id?: number | string | null;
  variant_label?: string | null;
};

const ProductSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div
        key={i}
        className="bg-white rounded-[2.5rem] p-5 border border-gray-50 animate-pulse"
      >
        <div className="w-full h-40 bg-gray-100 rounded-3xl mb-4" />
        <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
        <div className="h-10 bg-gray-100 rounded-2xl w-full" />
      </div>
    ))}
  </div>
);

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getAllVariants(p: Product): ProductVariant[] {
  const anyP: any = p as any;
  const v1 = Array.isArray(anyP?.variants) ? anyP.variants : [];
  const v2 = Array.isArray(anyP?.color_variants) ? anyP.color_variants : [];
  const v3 = Array.isArray(anyP?.options) ? anyP.options : [];
  return [...v1, ...v2, ...v3].filter(Boolean);
}

function getVariantPrice(v: ProductVariant, productFallbackPrice: number) {
  const candidates = [v?.sale_price, v?.price, v?.base_sale_price, productFallbackPrice];
  for (const c of candidates) {
    const n = safeNumber(c, NaN);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return safeNumber(productFallbackPrice, 0);
}

function getVariantLabel(v: ProductVariant): string {
  return (
    String(v?.color_name || v?.color_title || v?.title || v?.name || "").trim() || ""
  );
}

function pickDefaultVariant(product: Product) {
  const basePrice = safeNumber(product?.base_sale_price, 0);
  const variants = getAllVariants(product);

  if (!variants.length) {
    return {
      variant: null as ProductVariant | null,
      price: basePrice,
      image: product.main_image || product.image_url || "/placeholder.png",
      label: null as string | null,
      variant_id: null as string | number | null,
    };
  }

  // دیفالت = کمترین قیمت
  let best = variants[0];
  let bestPrice = getVariantPrice(best, basePrice);

  for (const v of variants) {
    const vp = getVariantPrice(v, basePrice);
    if (vp > 0 && vp < bestPrice) {
      best = v;
      bestPrice = vp;
    }
  }

  const vImage =
    best?.main_image ||
    best?.image ||
    best?.image_url ||
    product.main_image ||
    product.image_url ||
    "/placeholder.png";

  const label = getVariantLabel(best) || null;

  return {
    variant: best,
    price: bestPrice,
    image: vImage,
    label,
    variant_id: (best?.id ?? null) as any,
  };
}

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const { showModal } = useModal();

  const IP_ADDRESS = "127.0.0.1";

  // slug از route (ممکنه string یا string[] باشه)
  const routeSlug = useMemo(() => {
    const raw: any = (params as any)?.slug;
    if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
    return String(raw ?? "").trim();
  }, [params]);

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [childrenBySlug, setChildrenBySlug] = useState<Record<string, string[]>>({});
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const [activeSlug, setActiveSlug] = useState(routeSlug);

  const warnedRef = useRef(false);
  const redirectOnceRef = useRef(false);

  // وقتی routeSlug عوض شد activeSlug هم ریست شود
  useEffect(() => {
    setActiveSlug(routeSlug);
    redirectOnceRef.current = false;
    warnedRef.current = false;
  }, [routeSlug]);

  const collectSlugsWithChildren = (rootSlug: string, map: Record<string, string[]>) => {
    const out = new Set<string>();
    const walk = (s: string) => {
      if (!s || out.has(s)) return;
      out.add(s);
      (map[s] || []).forEach((child) => walk(child));
    };
    walk(rootSlug);
    return out;
  };

  // اگر کاربر به جای slug، title زده بود (مثلاً /category/گوشی) => تبدیلش کنیم
  const normalizeSlugFromCategories = (incoming: string, cats: Category[]) => {
    const s = String(incoming || "").trim();
    if (!s) return s;

    const bySlug = cats.find((c) => String(c.slug) === s);
    if (bySlug) return s;

    const byTitle = cats.find((c) => String(c.title).trim() === s);
    if (byTitle) return String(byTitle.slug);

    return s;
  };

  useEffect(() => {
    if (!activeSlug) return;

    setIsLoading(true);

    // cart
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setLocalCart(savedCart);

    (async () => {
      try {
        // 1) دسته‌ها (FLAT)
        const catRes = await fetch(`http://${IP_ADDRESS}:8000/api/categories/flat/`);
        const catData = catRes.ok ? await catRes.json() : [];
        const arr: Category[] = Array.isArray(catData) ? catData : [];
        setCategories(arr);

        // ساخت parentSlug -> [childSlug]
        const idToSlug = new Map<number, string>();
        arr.forEach((c) => {
          if (typeof c?.id === "number" && typeof c?.slug === "string") {
            idToSlug.set(c.id, c.slug);
          }
        });

        const map: Record<string, string[]> = {};
        arr.forEach((c: any) => {
          const parentId = c?.parent ?? c?.parent_id ?? null;
          const childSlug = c?.slug;

          if (!parentId || typeof childSlug !== "string") return;
          const parentSlug = idToSlug.get(Number(parentId));
          if (!parentSlug) return;

          map[parentSlug] = Array.from(new Set([...(map[parentSlug] || []), childSlug]));
        });

        setChildrenBySlug(map);

        // 2) نرمال‌سازی slug (اگر title فارسی اومده بود)
        const normalized = normalizeSlugFromCategories(activeSlug, arr);

        if (normalized !== activeSlug) {
          setActiveSlug(normalized);

          // یک بار آدرس رو هم درست کن (اختیاری)
          if (!redirectOnceRef.current) {
            redirectOnceRef.current = true;
            router.replace(`/category/${normalized}`);
          }
        }

        // 3) محصولات: فیلتر شده بر اساس slug + زیرمجموعه‌ها
        const allowed = collectSlugsWithChildren(normalized, map);
        const allowedList = Array.from(allowed);

        const lists = await Promise.all(
          allowedList.map(async (s) => {
            const res = await fetch(
              `http://${IP_ADDRESS}:8000/api/products/?category_slug=${encodeURIComponent(s)}`
            );
            const data = res.ok ? await res.json() : [];
            return Array.isArray(data) ? (data as Product[]) : [];
          })
        );

        // merge + dedupe by id
        const byId = new Map<string, Product>();
        for (const list of lists) {
          for (const p of list) {
            const key = String(p?.id ?? "");
            if (!key) continue;
            const prev = byId.get(key);
            if (!prev) byId.set(key, p);
            else {
              const da = prev?.last_updated ? new Date(prev.last_updated).getTime() : 0;
              const db = p?.last_updated ? new Date(p.last_updated).getTime() : 0;
              byId.set(key, db >= da ? p : prev);
            }
          }
        }

        const merged = Array.from(byId.values());
        merged.sort((a, b) => {
          const da = a?.last_updated ? new Date(a.last_updated).getTime() : 0;
          const db = b?.last_updated ? new Date(b.last_updated).getTime() : 0;
          return db - da;
        });

        setProducts(merged);
      } catch {
        setCategories([]);
        setChildrenBySlug({});
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [activeSlug, IP_ADDRESS, router]);

  const titleBySlug = useMemo(() => {
    const m: Record<string, string> = {};
    (categories || []).forEach((c) => {
      if (c?.slug) m[String(c.slug)] = String(c.title || c.slug);
    });
    return m;
  }, [categories]);

  const categoryExists = useMemo(() => {
    return (categories || []).some((c) => String(c.slug) === activeSlug);
  }, [categories, activeSlug]);

  // اگر دسته وجود نداشت: فقط یک بار مودال بده
  useEffect(() => {
    if (!isLoading && !categoryExists && !warnedRef.current) {
      warnedRef.current = true;
      showModal("error", "پیدا نشد", "این دسته‌بندی وجود ندارد.");
    }
  }, [isLoading, categoryExists, showModal]);

  const items = useMemo(() => products || [], [products]);

  const updateGlobalCounts = (cart: CartItem[]) => {
    localStorage.setItem(
      "cart_count",
      String(cart.reduce((s, i) => s + (i.quantity || 0), 0))
    );
  };

  const updateQuantity = (product: Product, delta: number) => {
    const picked = pickDefaultVariant(product);
    const price = safeNumber(picked.price, safeNumber(product.base_sale_price, 0));
    const variant_id = picked.variant_id;
    const variant_label = picked.label;

    setLocalCart((prev) => {
      const copy = [...prev];

      const idx = copy.findIndex((i) => {
        if (variant_id != null) return i.id === product.id && (i.variant_id ?? null) === variant_id;
        return i.id === product.id && (i.variant_id ?? null) == null;
      });

      if (idx === -1 && delta > 0) {
        copy.push({
          id: product.id,
          title: product.title,
          price,
          image_url: picked.image || product.main_image || product.image_url || null,
          quantity: 1,
          variant_id,
          variant_label,
        });
      } else if (idx !== -1) {
        const nextQty = (copy[idx].quantity || 0) + delta;
        if (nextQty <= 0) copy.splice(idx, 1);
        else copy[idx] = { ...copy[idx], quantity: nextQty };
      }

      localStorage.setItem("cart", JSON.stringify(copy));
      updateGlobalCounts(copy);
      window.dispatchEvent(new Event("storage"));
      return copy;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 text-right" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="text-xs font-black text-gray-700 bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200 transition inline-flex items-center gap-2"
            type="button"
          >
            <ArrowRight size={16} className="rotate-180" />
            برگشت
          </button>

          <div className="font-black text-gray-900">
            {titleBySlug[activeSlug] || `دسته: ${activeSlug}`}
          </div>

          <Link
            href="/cart"
            className="relative w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center"
            aria-label="سبد خرید"
          >
            <ShoppingCart size={18} />
            {localCart.length > 0 && (
              <span className="absolute -top-1 -left-1 w-6 h-6 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                {localCart.reduce((s, i) => s + (i.quantity || 0), 0)}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-8">
        {/* Chips زیرمجموعه‌ها */}
        {Array.isArray(childrenBySlug[activeSlug]) && childrenBySlug[activeSlug]?.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {(childrenBySlug[activeSlug] || []).slice(0, 30).map((s) => (
              <Link
                key={s}
                href={`/category/${s}`}
                className="text-[11px] font-black bg-white border border-gray-100 px-4 py-2 rounded-2xl hover:bg-gray-50"
                title={titleBySlug?.[s] || s}
              >
                {titleBySlug?.[s] || s}
              </Link>
            ))}
          </div>
        )}

        {/* محتوا */}
        {isLoading ? (
          <ProductSkeleton />
        ) : !categoryExists ? (
          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 text-center">
            <div className="text-lg font-black text-gray-800 mb-2">این دسته‌بندی وجود ندارد</div>
            <div className="text-xs text-gray-400 mb-6">یا slug اشتباه است یا هنوز در بک‌اند ثبت نشده.</div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 px-5 py-3 rounded-2xl hover:bg-blue-100 transition"
            >
              برگشت به خانه <ArrowRight size={16} />
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 text-center">
            <div className="text-lg font-black text-gray-800 mb-2">فعلاً محصولی برای این دسته نداریم</div>
            <div className="text-xs text-gray-400">به‌زودی محصولات اضافه می‌شن ✨</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((p) => {
              const picked = pickDefaultVariant(p);

              const cartItem =
                localCart.find(
                  (i) => i.id === p.id && (i.variant_id ?? null) === (picked.variant_id ?? null)
                ) || localCart.find((i) => i.id === p.id);

              const quantity = cartItem ? cartItem.quantity : 0;

              return (
                <motion.div
                  key={String(p.id)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ y: -6 }}
                >
                  <Link href={`/product/${p.id}`} className="block">
                    <div className="bg-white rounded-[2.5rem] p-5 border border-gray-100 hover:shadow-xl transition-all h-full flex flex-col justify-between">
                      <div>
                        <div className="w-full h-40 bg-gray-50 rounded-3xl overflow-hidden flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={picked.image || "/placeholder.png"}
                            alt={p.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div className="mt-4">
                          <div className="font-black text-gray-900 text-xs md:text-sm line-clamp-2 min-h-[40px]">
                            {p.title}
                          </div>

                          <div className="mt-2 text-blue-600 font-black text-sm">
                            {safeNumber(picked.price, 0).toLocaleString()} ت
                          </div>

                          {picked.label && (
                            <div className="mt-1 text-[10px] text-gray-400 font-black">
                              رنگ پیش‌فرض: {picked.label}
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="mt-4"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        {quantity === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateQuantity(p, 1)}
                            className="w-full bg-gray-900 text-white py-3 rounded-2xl font-black text-xs hover:bg-blue-600 transition"
                          >
                            افزودن به سبد
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-gray-100 rounded-2xl p-2 border border-gray-200">
                            <button
                              type="button"
                              onClick={() => updateQuantity(p, -1)}
                              className="w-10 h-10 rounded-2xl bg-white text-red-500 flex items-center justify-center"
                              aria-label="کم کردن"
                            >
                              <Minus size={18} strokeWidth={3} />
                            </button>

                            <div className="font-black text-gray-900">{quantity}</div>

                            <button
                              type="button"
                              onClick={() => updateQuantity(p, +1)}
                              className="w-10 h-10 rounded-2xl bg-white text-blue-600 flex items-center justify-center"
                              aria-label="اضافه کردن"
                            >
                              <Plus size={18} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
