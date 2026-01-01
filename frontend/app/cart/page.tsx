"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/context/ModalContext";
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  CreditCard,
  ShieldCheck,
  Truck,
  ShoppingBag,
  ChevronLeft,
  X,
  Sparkles,
} from "lucide-react";

/** ---------------------------
 * Types
 * --------------------------*/
type VariantApi = {
  id: number | string;
  // اسم رنگ/واریانت در بک‌اند ممکنه با این کلیدها بیاد
  title?: string | null;
  name?: string | null;
  label?: string | null;
  color_name?: string | null;

  // کد رنگ (HEX) ممکنه با این کلیدها بیاد
  color?: string | null;
  color_hex?: string | null;
  hex?: string | null;

  // قیمت
  price?: number | null;
  sale_price?: number | null;

  // قیمت قبلی (اختیاری)
  compare_at_price?: number | null;
  original_price?: number | null;

  // موجودی و عکس (اختیاری)
  stock?: number | null;
  image?: string | null;
  image_url?: string | null;
  main_image?: string | null;
};

type CartItemStored = {
  id: number | string;
  title: string;

  // قیمت در زمان افزودن (ممکنه با API سینک بشه)
  price: number;

  image_url?: string | null;
  quantity: number;

  original_price?: number;

  // ✅ رنگ/واریانت انتخاب شده
  variant_id?: number | string | null;
  variant_label?: string | null; // مثل "مشکی"
  variant_color?: string | null; // مثل "#000000"
};

type ProductApi = {
  id: number | string;
  title: string;
  description?: string | null;

  // قیمت پایه (اگر واریانت نداشت)
  base_sale_price: number;

  image_url?: string | null;
  main_image?: string | null;

  stock?: number | null;
  shipping_fee?: number | null;
  category_slug?: string | null;
  last_updated?: string | null;

  // اختیاری (اگر بک‌اندت دارد)
  original_price?: number | null;
  compare_at_price?: number | null;

  // ✅ واریانت‌ها (ممکنه با نام‌های مختلف بیاد)
  variants?: VariantApi[] | null;
  color_variants?: VariantApi[] | null;
  product_variants?: VariantApi[] | null;
};

type CartItem = {
  id: number | string;
  title: string;

  unitPrice: number;
  originalPrice?: number | null;

  quantity: number;
  image: string;

  stock?: number | null;
  shipping_fee?: number | null;
  category_slug?: string | null;

  // ✅ واریانت انتخاب شده
  variantId?: number | string | null;
  variantLabel?: string | null;
  variantColor?: string | null;

  // ✅ لیست واریانت‌ها برای انتخاب در UI
  variants?: VariantApi[];
};

type ConfirmState =
  | { open: false }
  | {
      open: true;
      mode: "remove_item" | "clear_cart";
      title: string;
      desc: string;
      itemId?: number | string;
      variantId?: number | string | null; // ✅ برای حذف دقیق همان واریانت
    };

/** ---------------------------
 * Config
 * --------------------------*/
const IP_ADDRESS = "127.0.0.1";
const API_BASE = `http://${IP_ADDRESS}:8000`;

// ارسال هوشمند
const FREE_SHIP_THRESHOLD = 500_000; // بالای این مبلغ ارسال رایگان
const SHIPPING_FLAT = 30_000; // اگر زیر آستانه بود

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

const normalizeVariants = (p?: ProductApi | null): VariantApi[] => {
  const v = p?.variants ?? p?.color_variants ?? p?.product_variants ?? [];
  return Array.isArray(v) ? v.filter(Boolean) : [];
};

const getVariantLabel = (v?: VariantApi | null): string => {
  return v?.color_name || v?.label || v?.name || v?.title || "نامشخص";
};

const getVariantHex = (v?: VariantApi | null): string | null => {
  const hex = v?.color_hex || v?.hex || v?.color || null;
  if (!hex) return null;
  return String(hex);
};

const getVariantPrice = (v?: VariantApi | null): number | null => {
  const raw = v?.price ?? v?.sale_price ?? null;
  if (typeof raw !== "number") return null;
  return Number(raw);
};

const getVariantOriginal = (v?: VariantApi | null): number | null => {
  const raw = v?.compare_at_price ?? v?.original_price ?? null;
  if (typeof raw !== "number") return null;
  return Number(raw);
};

const pickCheapestVariant = (variants: VariantApi[]): VariantApi | null => {
  const priced = variants
    .map((v) => ({ v, price: getVariantPrice(v) }))
    .filter((x) => typeof x.price === "number" && (x.price as number) > 0) as {
    v: VariantApi;
    price: number;
  }[];

  if (!priced.length) return null;
  priced.sort((a, b) => a.price - b.price);
  return priced[0].v;
};

const findVariantById = (variants: VariantApi[], id?: number | string | null): VariantApi | null => {
  if (id == null) return null;
  const found = variants.find((v) => String(v.id) === String(id));
  return found || null;
};

// ✅ کلید یکتا برای آیتم‌های سبد: productId + variantId
const cartKey = (productId: number | string, variantId?: number | string | null) => {
  const v = variantId == null || String(variantId) === "" ? "base" : String(variantId);
  return `${String(productId)}::${v}`;
};

// ✅ merge ذخیره‌های تکراری در localStorage (اگر اتفاق افتاده باشد)
const mergeStoredCart = (items: CartItemStored[]): CartItemStored[] => {
  const map = new Map<string, CartItemStored>();
  for (const it of items) {
    const key = cartKey(it.id, it.variant_id ?? null);
    if (!map.has(key)) {
      map.set(key, { ...it, quantity: Math.max(1, it.quantity || 1) });
    } else {
      const prev = map.get(key)!;
      map.set(key, { ...prev, quantity: (prev.quantity || 0) + (it.quantity || 0) });
    }
  }
  return Array.from(map.values());
};

export default function CartPage() {
  const router = useRouter();
  const { showModal } = useModal();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });

  // Upsell
  const [suggested, setSuggested] = useState<ProductApi[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  /** Resolve image URL (supports absolute + relative + placeholder) */
  const resolveUrl = useCallback((url?: string | null) => {
    if (!url) return "/placeholder.png";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${API_BASE}${url}`;
    return url;
  }, []);

  /** Read cart from localStorage */
  const readStoredCart = useCallback((): CartItemStored[] => {
    if (typeof window === "undefined") return [];
    const raw = safeJson<CartItemStored[]>(localStorage.getItem("cart") || "[]", []);
    return mergeStoredCart(raw);
  }, []);

  /** ✅ Write cart to localStorage (NO dispatch to avoid loop) */
  const writeStoredCart = useCallback((items: CartItemStored[]) => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, []);

  /** ✅ Notify same-tab listeners only when user changes cart */
  const notifyCartChanged = useCallback(() => {
    window.dispatchEvent(new Event("storage"));
  }, []);

  /** Fetch single product (fallback-safe) */
  const fetchProduct = useCallback(async (id: number | string): Promise<ProductApi | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}/`);
      if (!res.ok) return null;
      const data = (await res.json()) as ProductApi;
      return data;
    } catch {
      return null;
    }
  }, []);

  /**
   * Sync cart items with API:
   * - title/image/stock/shipping/category
   * - ✅ variant-aware pricing
   * - ✅ items are separated by (productId + variantId)
   */
  const syncCartWithApi = useCallback(async () => {
    setLoading(true);

    const storedRaw = readStoredCart();
    if (!storedRaw.length) {
      setCart([]);
      setLoading(false);
      return;
    }

    // ✅ fetch each unique product once
    const uniqueIds = Array.from(new Set(storedRaw.map((i) => String(i.id))));
    const fetched = await Promise.all(uniqueIds.map((id) => fetchProduct(id)));
    const byId = new Map<string, ProductApi | null>();
    uniqueIds.forEach((id, idx) => byId.set(String(id), fetched[idx] || null));

    const enriched: CartItem[] = storedRaw.map((item) => {
      const api = byId.get(String(item.id)) || null;
      const variants = normalizeVariants(api);

      // 1) variant resolution:
      // - if stored has variant_id => use it if exists
      // - else => choose cheapest variant (if any)
      const chosen =
        (variants.length ? findVariantById(variants, item.variant_id) : null) ??
        (variants.length ? pickCheapestVariant(variants) : null);

      const chosenPrice =
        (chosen ? getVariantPrice(chosen) : null) ??
        (api && typeof api.base_sale_price === "number" ? Number(api.base_sale_price) : null) ??
        Number(item.price) ??
        0;

      const chosenOriginal = (chosen ? getVariantOriginal(chosen) : null) ?? (api?.compare_at_price ?? api?.original_price ?? null);

      const unitPrice = Number(chosenPrice) || 0;

      const originalPrice =
        (typeof chosenOriginal === "number" && chosenOriginal > unitPrice ? chosenOriginal : null) ??
        (typeof item.original_price === "number" && item.original_price > unitPrice ? item.original_price : null) ??
        null;

      const image = resolveUrl(
        chosen?.main_image ||
          chosen?.image ||
          chosen?.image_url ||
          api?.main_image ||
          api?.image_url ||
          item.image_url ||
          "/placeholder.png"
      );

      const variantId = chosen?.id ?? item.variant_id ?? null;
      const variantLabel = chosen ? getVariantLabel(chosen) : item.variant_label ?? null;
      const variantColor = chosen ? getVariantHex(chosen) : item.variant_color ?? null;

      // stock priority: variant.stock -> product.stock -> null
      const stock = (typeof chosen?.stock === "number" ? chosen.stock : null) ?? (api?.stock ?? null);

      return {
        id: item.id,
        title: api?.title || item.title,
        unitPrice,
        originalPrice,
        quantity: Math.max(1, item.quantity || 1),
        image,
        stock,
        shipping_fee: api?.shipping_fee ?? null,
        category_slug: api?.category_slug ?? null,

        variants: variants.length ? variants : undefined,
        variantId,
        variantLabel,
        variantColor,
      };
    });

    // ✅ merge again in-memory (اگر دو آیتم به یک واریانت ختم شدند؛ مثلا variant_id null => cheapest)
    const mergedMap = new Map<string, CartItem>();
    for (const it of enriched) {
      const key = cartKey(it.id, it.variantId ?? null);
      if (!mergedMap.has(key)) mergedMap.set(key, { ...it });
      else {
        const prev = mergedMap.get(key)!;
        mergedMap.set(key, { ...prev, quantity: prev.quantity + it.quantity });
      }
    }
    const merged = Array.from(mergedMap.values());

    setCart(merged);

    // rewrite localStorage to keep it fresh (price/title/image/variant)
    const refreshedStorage: CartItemStored[] = merged.map((i) => ({
      id: i.id,
      title: i.title,
      price: i.unitPrice,
      image_url: i.image,
      quantity: i.quantity,
      ...(i.originalPrice ? { original_price: i.originalPrice } : {}),

      // ✅ persist chosen variant
      variant_id: i.variantId ?? null,
      variant_label: i.variantLabel ?? null,
      variant_color: i.variantColor ?? null,
    }));

    // ✅ no dispatch here (prevents flicker loop)
    writeStoredCart(refreshedStorage);

    setLoading(false);
  }, [fetchProduct, readStoredCart, resolveUrl, writeStoredCart]);

  /** Initial load + realtime sync */
  useEffect(() => {
    syncCartWithApi();

    const onStorage = () => syncCartWithApi();
    window.addEventListener("storage", onStorage);

    const onFocus = () => syncCartWithApi();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncCartWithApi]);

  /** Totals */
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  // shipping: اگر API shipping_fee بده => جمع آیتم‌ها، وگرنه قانون ثابت/آستانه
  const shippingFee = useMemo(() => {
    const hasAny = cart.some((i) => typeof i.shipping_fee === "number" && Number(i.shipping_fee) > 0);
    if (hasAny) {
      return cart.reduce((acc, i) => acc + Number(i.shipping_fee || 0) * i.quantity, 0);
    }
    return subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FLAT;
  }, [cart, subtotal]);

  const totalPayable = useMemo(() => subtotal + shippingFee, [subtotal, shippingFee]);

  const totalSavings = useMemo(() => {
    return cart.reduce((acc, i) => {
      const op = i.originalPrice || 0;
      if (op > i.unitPrice) return acc + (op - i.unitPrice) * i.quantity;
      return acc;
    }, 0);
  }, [cart]);

  /** ✅ Update quantity with stock limit (variant-aware) */
  const updateQuantity = useCallback(
    (id: number | string, variantId: number | string | null | undefined, delta: number) => {
      setCart((prev) => {
        const next = [...prev];
        const key = cartKey(id, variantId ?? null);
        const idx = next.findIndex((x) => cartKey(x.id, x.variantId ?? null) === key);
        if (idx === -1) return prev;

        const item = next[idx];
        const newQty = item.quantity + delta;
        if (newQty < 0) return prev;

        // stock guard (only when increasing)
        if (delta > 0 && typeof item.stock === "number") {
          if (newQty > item.stock) {
            showModal("warning", "موجودی محدود", `فقط ${item.stock} عدد از این کالا موجوده.`);
            return prev;
          }
        }

        if (newQty === 0) {
          next.splice(idx, 1);
          showModal("warning", "حذف شد", "کالا از سبد خریدت حذف شد.");
        } else {
          next[idx] = { ...item, quantity: newQty };
        }

        // write to storage
        const storage: CartItemStored[] = next.map((i) => ({
          id: i.id,
          title: i.title,
          price: i.unitPrice,
          image_url: i.image,
          quantity: i.quantity,
          ...(i.originalPrice ? { original_price: i.originalPrice } : {}),

          variant_id: i.variantId ?? null,
          variant_label: i.variantLabel ?? null,
          variant_color: i.variantColor ?? null,
        }));
        writeStoredCart(storage);

        // ✅ notify only here (user action)
        notifyCartChanged();

        return next;
      });
    },
    [showModal, writeStoredCart, notifyCartChanged]
  );

  /** ✅ Change variant (color) for a cart item (variant-aware + merge if exists) */
  const changeVariant = useCallback(
    (productId: number | string, fromVariantId: number | string | null | undefined, toVariantId: number | string) => {
      setCart((prev) => {
        const next = [...prev];

        const fromKey = cartKey(productId, fromVariantId ?? null);
        const idx = next.findIndex((x) => cartKey(x.id, x.variantId ?? null) === fromKey);
        if (idx === -1) return prev;

        const item = next[idx];
        const variants = item.variants || [];
        const chosen = findVariantById(variants, toVariantId);
        if (!chosen) return prev;

        const newPrice = getVariantPrice(chosen) ?? item.unitPrice;
        const newOriginal = getVariantOriginal(chosen) ?? item.originalPrice ?? null;

        const newImage = resolveUrl(chosen.main_image || chosen.image || chosen.image_url || item.image);

        const newStock = (typeof chosen.stock === "number" ? chosen.stock : null) ?? item.stock ?? null;

        const newLabel = getVariantLabel(chosen);
        const newColor = getVariantHex(chosen);

        const updated: CartItem = {
          ...item,
          unitPrice: Number(newPrice) || 0,
          originalPrice: typeof newOriginal === "number" && newOriginal > Number(newPrice) ? newOriginal : null,
          image: newImage,
          stock: newStock,

          variantId: chosen.id,
          variantLabel: newLabel,
          variantColor: newColor,
        };

        // ✅ اگر آیتم با این واریانت از قبل وجود داشت => ادغام
        const toKey = cartKey(productId, updated.variantId ?? null);
        const existingIdx = next.findIndex((x, j) => j !== idx && cartKey(x.id, x.variantId ?? null) === toKey);

        if (existingIdx > -1) {
          const mergedQty = next[existingIdx].quantity + item.quantity;
          next[existingIdx] = { ...next[existingIdx], quantity: mergedQty };
          next.splice(idx, 1);
        } else {
          next[idx] = updated;
        }

        // write to storage
        const storage: CartItemStored[] = next.map((i) => ({
          id: i.id,
          title: i.title,
          price: i.unitPrice,
          image_url: i.image,
          quantity: i.quantity,
          ...(i.originalPrice ? { original_price: i.originalPrice } : {}),

          variant_id: i.variantId ?? null,
          variant_label: i.variantLabel ?? null,
          variant_color: i.variantColor ?? null,
        }));
        writeStoredCart(storage);
        notifyCartChanged();

        showModal("success", "رنگ تغییر کرد", `رنگ «${newLabel}» انتخاب شد ✅`);

        return next;
      });
    },
    [notifyCartChanged, resolveUrl, showModal, writeStoredCart]
  );

  /** Remove item (confirm) - variant-aware */
  const requestRemoveItem = (id: number | string, variantId?: number | string | null) => {
    const item = cart.find((i) => cartKey(i.id, i.variantId ?? null) === cartKey(id, variantId ?? null));
    if (!item) return;

    setConfirm({
      open: true,
      mode: "remove_item",
      title: "حذف کالا؟",
      desc: `مطمئنی می‌خوای «${item.title}» از سبد حذف بشه؟`,
      itemId: id,
      variantId: item.variantId ?? null,
    });
  };

  /** Clear cart (confirm) */
  const requestClearCart = () => {
    setConfirm({
      open: true,
      mode: "clear_cart",
      title: "پاک کردن سبد خرید؟",
      desc: "تمام کالاهای سبد خرید حذف می‌شن. مطمئنی؟",
    });
  };

  const confirmYes = () => {
    if (!confirm.open) return;

    if (confirm.mode === "clear_cart") {
      setCart([]);
      writeStoredCart([]);
      notifyCartChanged();
      showModal("success", "انجام شد", "سبد خرید پاک شد ✅");
    }

    if (confirm.mode === "remove_item" && confirm.itemId != null) {
      setCart((prev) => {
        const next = prev.filter((i) => cartKey(i.id, i.variantId ?? null) !== cartKey(confirm.itemId!, confirm.variantId ?? null));

        const storage: CartItemStored[] = next.map((i) => ({
          id: i.id,
          title: i.title,
          price: i.unitPrice,
          image_url: i.image,
          quantity: i.quantity,
          ...(i.originalPrice ? { original_price: i.originalPrice } : {}),

          variant_id: i.variantId ?? null,
          variant_label: i.variantLabel ?? null,
          variant_color: i.variantColor ?? null,
        }));
        writeStoredCart(storage);
        notifyCartChanged();
        return next;
      });
      showModal("success", "حذف شد", "کالا از سبد حذف شد ✅");
    }

    setConfirm({ open: false });
  };

  const confirmNo = () => setConfirm({ open: false });

  /** Add suggested product to cart (default = cheapest in cart if exists, else sync chooses cheapest) */
  const addToCart = useCallback(
    (p: ProductApi) => {
      const stored = readStoredCart();

      // ✅ اگر همین محصول قبلاً تو سبد هست (شاید چند واریانت)،
      // واریانت پیش‌فرض = آیتمی که قیمت کمتری دارد
      const same = stored.filter((x) => String(x.id) === String(p.id));
      if (same.length) {
        let bestIdx = stored.findIndex((x) => String(x.id) === String(p.id));
        let bestPrice = Number.isFinite(same[0].price) ? same[0].price : Number.MAX_SAFE_INTEGER;

        for (let i = 0; i < stored.length; i++) {
          if (String(stored[i].id) !== String(p.id)) continue;
          const pr = typeof stored[i].price === "number" ? stored[i].price : Number.MAX_SAFE_INTEGER;
          if (pr < bestPrice) {
            bestPrice = pr;
            bestIdx = i;
          }
        }

        if (bestIdx > -1) {
          stored[bestIdx].quantity += 1;
          writeStoredCart(stored);
          notifyCartChanged();
          showModal("success", "اضافه شد", `${p.title} به سبد اضافه شد 🛒`);
          return;
        }
      }

      // ✅ در غیر این صورت آیتم جدید با variant_id = null (سینک، ارزان‌ترین رو انتخاب می‌کند)
      const image = resolveUrl(p.main_image || p.image_url);

      stored.push({
        id: p.id,
        title: p.title,
        price: Number(p.base_sale_price),
        image_url: image,
        quantity: 1,
        ...(typeof p.compare_at_price === "number" ? { original_price: p.compare_at_price } : {}),

        variant_id: null,
        variant_label: null,
        variant_color: null,
      });

      writeStoredCart(stored);
      notifyCartChanged();

      showModal("success", "اضافه شد", `${p.title} به سبد اضافه شد 🛒`);
    },
    [readStoredCart, resolveUrl, showModal, writeStoredCart, notifyCartChanged]
  );

  /** Upsell: fetch suggestions based on categories in cart */
  useEffect(() => {
    const run = async () => {
      const categories = Array.from(new Set(cart.map((i) => i.category_slug).filter(Boolean))) as string[];
      if (!categories.length || cart.length === 0) {
        setSuggested([]);
        return;
      }

      setSuggestedLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/`);
        const data = (await res.json()) as ProductApi[];
        const arr = Array.isArray(data) ? data : [];

        const cartIds = new Set(cart.map((i) => String(i.id)));
        const picked = arr
          .filter((p) => !!p.category_slug && categories.includes(p.category_slug as string))
          .filter((p) => !cartIds.has(String(p.id)))
          .slice(0, 12);

        if (picked.length < 8) {
          const more = arr
            .filter((p) => !cartIds.has(String(p.id)))
            .sort((a, b) => {
              const da = a.last_updated ? new Date(a.last_updated).getTime() : 0;
              const db = b.last_updated ? new Date(b.last_updated).getTime() : 0;
              return db - da;
            })
            .slice(0, 12 - picked.length);

          setSuggested([...picked, ...more]);
        } else {
          setSuggested(picked);
        }
      } catch {
        setSuggested([]);
      } finally {
        setSuggestedLoading(false);
      }
    };

    if (!loading && cart.length > 0) run();
  }, [cart, loading]);

  /** UI: Loading state */
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center italic font-black" dir="rtl">
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl animate-pulse">
          در حال همگام‌سازی سبد خرید با سرور...
        </div>
      </main>
    );
  }

  /** UI: Empty cart */
  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-32 h-32 bg-white rounded-[3rem] shadow-xl flex items-center justify-center mb-8 animate-bounce">
          <ShoppingBag size={54} className="text-gray-300" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2 italic">سبد خریدت خالیه رفیق!</h1>
        <p className="text-gray-400 font-bold mb-10 max-w-xs leading-7">
          انگار هنوز چیزی چشمت رو نگرفته. برگرد به فروشگاه و بهترین‌ها رو برای خودت بردار.
        </p>
        <Link
          href="/"
          className="bg-gray-900 text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-blue-600 transition-all"
        >
          برگشت به ویترین محصولات
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 pb-52" dir="rtl">
      {/* Confirm Modal (Light) */}
      {confirm.open && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={confirmNo} />
          <div className="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-7 text-right">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{confirm.title}</h3>
                <p className="text-sm text-gray-500 font-bold leading-7">{confirm.desc}</p>
              </div>
              <button onClick={confirmNo} className="p-2 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={confirmYes}
                className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-red-600 transition-all"
              >
                بله، انجام بده
              </button>
              <button
                onClick={confirmNo}
                className="flex-1 bg-gray-100 text-gray-900 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all"
              >
                نه
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
        {/* لیست محصولات */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 mb-2 justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black text-gray-900 italic">سبد خرید</h1>
              <span className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-black italic">
                {totalItems} عدد
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-[11px] font-black italic flex items-center gap-2"
              >
                <ArrowRight size={16} />
                ادامه خرید
              </button>

              <button
                onClick={requestClearCart}
                className="px-4 py-2 rounded-2xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all text-[11px] font-black italic flex items-center gap-2"
              >
                <Trash2 size={16} />
                پاک کردن سبد
              </button>
            </div>
          </div>

          {totalSavings > 0 && (
            <div className="bg-white rounded-[2.5rem] p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3 text-right">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 italic">تبریک 🎉</p>
                  <p className="text-[11px] text-gray-400 font-bold">با تخفیف‌ها، توی این خرید صرفه‌جویی کردی</p>
                </div>
              </div>
              <div className="text-emerald-600 font-black text-lg italic">
                {totalSavings.toLocaleString()} <span className="text-[10px]">تومان</span>
              </div>
            </div>
          )}

          {cart.map((item) => {
            const lineTotal = item.unitPrice * item.quantity;
            const hasDiscount = !!item.originalPrice && item.originalPrice > item.unitPrice;
            const discountPercent = hasDiscount
              ? Math.round(((item.originalPrice! - item.unitPrice) / item.originalPrice!) * 100)
              : 0;

            const isLowStock = typeof item.stock === "number" && item.stock > 0 && item.stock <= 5;
            const isOutOfStock = typeof item.stock === "number" && item.stock === 0;

            const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;

            return (
              <div
                key={cartKey(item.id, item.variantId ?? null)} // ✅ unique key per variant
                className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 group hover:shadow-md transition-all relative"
              >
                {/* Remove */}
                <button
                  onClick={() => requestRemoveItem(item.id, item.variantId ?? null)} // ✅ remove exact variant
                  className="absolute top-5 left-5 p-2 rounded-2xl bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-all"
                  aria-label="حذف کالا"
                >
                  <Trash2 size={18} />
                </button>

                <Link
                  href={`/product/${item.id}`}
                  className="w-24 h-24 bg-gray-50 rounded-3xl p-4 flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden flex items-center justify-center"
                >
                  <img src={item.image} alt={item.title} className="w-full h-full object-contain" />
                </Link>

                <div className="flex-1 text-center md:text-right">
                  <Link href={`/product/${item.id}`}>
                    <h3 className="text-sm font-black text-gray-900 mb-2 leading-7 italic hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                  </Link>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] text-gray-400 font-bold italic">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={14} /> ضمانت اصالت
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck size={14} /> ارسال سراسری
                    </span>

                    {isOutOfStock && (
                      <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black">
                        ناموجود
                      </span>
                    )}
                    {isLowStock && (
                      <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black">
                        موجودی کم: {item.stock}
                      </span>
                    )}
                  </div>

                  {/* ✅ Variant selector (Color) */}
                  {hasVariants && (
                    <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <span className="text-[11px] text-gray-400 font-bold">رنگ:</span>

                      <div className="flex items-center gap-2">
                        {item.variantColor ? (
                          <span
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: item.variantColor }}
                            title={item.variantLabel || "رنگ"}
                          />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-gray-200 bg-gray-100" />
                        )}

                        <select
                          className="text-[11px] font-black bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 outline-none"
                          value={String(item.variantId ?? "")}
                          onChange={(e) => changeVariant(item.id, item.variantId ?? null, e.target.value)}
                        >
                          {item.variants!.map((v) => {
                            const label = getVariantLabel(v);
                            const price = getVariantPrice(v);
                            const showPrice = typeof price === "number" ? ` - ${Number(price).toLocaleString()} ت` : "";
                            return (
                              <option key={String(v.id)} value={String(v.id)}>
                                {label}
                                {showPrice}
                              </option>
                            );
                          })}
                        </select>

                        {item.variantLabel && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-3 py-2 rounded-xl border border-blue-100 font-black">
                            {item.variantLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* unit price + discount */}
                  <div className="mt-4 flex items-center justify-center md:justify-start gap-3">
                    <span className="text-[11px] text-gray-400 font-bold">قیمت واحد:</span>
                    <span className="text-blue-600 font-black text-sm italic">
                      {item.unitPrice.toLocaleString()} <span className="text-[10px]">تومان</span>
                    </span>

                    {hasDiscount && (
                      <>
                        <span className="text-[11px] text-gray-300 font-black line-through">
                          {item.originalPrice!.toLocaleString()}
                        </span>
                        <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-black">
                          {discountPercent}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center md:items-end gap-4">
                  <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl gap-4 border border-gray-200">
                    <button
                      onClick={() => updateQuantity(item.id, item.variantId ?? null, 1)} // ✅ variant-aware
                      className="bg-white text-blue-600 p-2 rounded-xl shadow-sm hover:bg-blue-50 transition-colors disabled:opacity-40"
                      disabled={typeof item.stock === "number" ? item.quantity >= item.stock : false}
                      title={typeof item.stock === "number" ? `حداکثر موجودی: ${item.stock}` : ""}
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>

                    <span className="text-sm font-black text-gray-900 w-6 text-center italic">{item.quantity}</span>

                    <button
                      onClick={() => updateQuantity(item.id, item.variantId ?? null, -1)} // ✅ variant-aware
                      className="bg-white text-red-500 p-2 rounded-xl shadow-sm hover:bg-red-50 transition-colors"
                    >
                      <Minus size={16} strokeWidth={3} />
                    </button>
                  </div>

                  <div className="text-gray-900 font-black text-lg italic">
                    {lineTotal.toLocaleString()} <span className="text-[10px]">تومان</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* پیشنهادها */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2.5 h-10 bg-gray-900 rounded-full" />
              <h2 className="text-xl font-black text-gray-900 italic">پیشنهاد برای شما</h2>
              <span className="mr-auto text-[10px] font-black text-gray-400 bg-white border border-gray-100 px-4 py-2 rounded-2xl">
                براساس سبد شما
              </span>
            </div>

            {suggestedLoading ? (
              <div className="bg-white rounded-[3rem] p-8 border border-gray-100 text-center text-gray-400 font-black animate-pulse">
                در حال آماده‌سازی پیشنهادها...
              </div>
            ) : suggested.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-8 border border-gray-100 text-right">
                <p className="text-sm font-black text-gray-700 mb-1">فعلاً پیشنهادی نداریم.</p>
                <p className="text-xs text-gray-400">بعداً دوباره چک کن ✨</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {suggested.map((p) => {
                  const img = resolveUrl(p.main_image || p.image_url);
                  return (
                    <div
                      key={String(p.id)}
                      className="min-w-[220px] md:min-w-[260px] bg-white rounded-[2.5rem] p-5 border border-gray-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden text-right"
                    >
                      <Link href={`/product/${p.id}`} className="block">
                        <div className="bg-gray-50 rounded-3xl h-44 flex items-center justify-center p-6 overflow-hidden">
                          <img
                            src={img}
                            alt={p.title}
                            className="max-h-full max-w-full object-contain mix-blend-multiply"
                            loading="lazy"
                          />
                        </div>
                        <h4 className="mt-4 font-black text-xs md:text-sm leading-6 h-12 overflow-hidden line-clamp-2 text-gray-900">
                          {p.title}
                        </h4>
                      </Link>

                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-400">قیمت نقد:</span>
                          <span className="text-blue-600 font-black text-sm">
                            {Number(p.base_sale_price).toLocaleString()} ت
                          </span>
                        </div>

                        <button
                          onClick={() => addToCart(p)}
                          className="bg-gray-900 text-white p-2.5 rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-90"
                          aria-label="افزودن به سبد"
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* فاکتور نهایی */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100 sticky top-28 italic">
            <h2 className="text-xl font-black text-gray-900 mb-8 border-b border-gray-50 pb-4">خلاصه صورت‌حساب</h2>

            <div className="space-y-5 mb-8">
              <div className="flex justify-between items-center text-gray-400 font-bold text-sm">
                <span>قیمت کالاها ({totalItems})</span>
                <span>{subtotal.toLocaleString()} ت</span>
              </div>

              <div className="flex justify-between items-center text-gray-400 font-bold text-sm">
                <span>هزینه ارسال</span>
                {shippingFee === 0 ? (
                  <span className="text-green-500 font-black">رایگان 🎉</span>
                ) : (
                  <span className="text-gray-700 font-black">{shippingFee.toLocaleString()} ت</span>
                )}
              </div>

              {subtotal < FREE_SHIP_THRESHOLD && shippingFee > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-right">
                  <p className="text-[11px] font-black text-blue-700 leading-6">
                    فقط {(FREE_SHIP_THRESHOLD - subtotal).toLocaleString()} تومان دیگه خرید کن تا ارسال رایگان بشه 🚚✨
                  </p>
                </div>
              )}

              {totalSavings > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-black text-sm">
                  <span>میزان تخفیف شما</span>
                  <span>{totalSavings.toLocaleString()} ت</span>
                </div>
              )}

              <div className="pt-5 border-t border-gray-50 flex justify-between items-center">
                <span className="font-black text-gray-900">مبلغ قابل پرداخت</span>
                <span className="text-2xl font-black text-blue-600">
                  {totalPayable.toLocaleString()} <span className="text-xs">تومان</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push("/checkout")}
              className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              تکمیل فرآیند خرید
              <ChevronLeft size={24} />
            </button>

            <div className="grid grid-cols-1 gap-3 mt-6">
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

            <p className="text-[9px] text-gray-400 text-center mt-6 font-bold leading-5 italic">
              با کلیک روی دکمه بالا، ضوابط و قوانین MENTAL SHOP را می‌پذیرم.
            </p>

            <button
              onClick={() => requestClearCart()}
              className="w-full mt-5 bg-red-50 text-red-600 py-4 rounded-[2rem] font-black text-sm hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              پاک کردن سبد خرید
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="lg:hidden fixed bottom-24 left-4 right-4 z-[80]">
        <div className="bg-gray-900 text-white rounded-[2.5rem] shadow-2xl p-4 flex items-center justify-between gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black opacity-60 italic">مبلغ قابل پرداخت</p>
            <p className="text-lg font-black">{totalPayable.toLocaleString()} ت</p>
          </div>

          <button
            onClick={() => router.push("/checkout")}
            className="flex items-center justify-center gap-2 bg-blue-600 px-5 py-4 rounded-[2rem] font-black text-sm active:scale-95 transition-all"
          >
            ادامه خرید
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>
    </main>
  );
}
