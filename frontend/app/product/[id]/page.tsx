"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/context/ModalContext";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";

// Lightbox
import LightBox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";

// Icons
import {
  ShoppingCart,
  Plus,
  Minus,
  ShieldCheck,
  Truck,
  ArrowRight,
  Share2,
  Zap,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ArrowLeft,
  Check,
} from "lucide-react";

/** ---------------------------
 * Types
 * --------------------------*/
type MediaItem = {
  file: string;
  is_video: boolean;
};

type ProductVariant = {
  id: number | string;
  title?: string | null; // مثلا "مشکی"
  name?: string | null; // بعضی بک‌اندها name میدن
  color_name?: string | null;
  color_hex?: string | null;
  hex?: string | null;
  price?: number | null; // قیمت رنگ
  sale_price?: number | null; // اگر این اسم رو دادی
  stock?: number | null;
  media?: MediaItem[];
};

type ProductSpec = {
  name?: string;
  title?: string;
  key?: string;
  value?: string | number | null;
};

type Product = {
  id: number | string;
  title: string;
  description?: string | null;

  // قیمت پایه (اگر Variant نبود)
  base_sale_price: number;

  shipping_fee?: number;
  stock?: number;

  category?: number | null;
  category_slug?: string | null;

  image_url?: string | null;
  main_image?: string | null;

  last_updated?: string;

  media?: MediaItem[];

  // ✅ اگر اضافه کردی:
  variants?: ProductVariant[];
  colors?: ProductVariant[]; // بعضیا اسمش colors هست
  options?: ProductVariant[]; // بعضیا options میدن
  specs?: ProductSpec[] | Record<string, any>; // ممکنه لیست یا دیکشنری باشه
};

type CartItem = {
  id: Product["id"]; // product id
  title: string;

  // ✅ برای رنگ/variant
  variant_id?: ProductVariant["id"] | null;
  variant_title?: string | null;

  price: number;
  image_url?: string | null;
  quantity: number;
};

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showModal } = useModal();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(0);
  const [activeTab, setActiveTab] = useState<"specs" | "desc">("specs");
  const [activeMedia, setActiveMedia] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // ✅ محصولات مشابه
  const [related, setRelated] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  // ✅ Variant (Color) selection
  const [selectedVariantId, setSelectedVariantId] = useState<string | number | null>(null);

  const IP_ADDRESS = "127.0.0.1";
  const API_BASE = `http://${IP_ADDRESS}:8000`;

  /** ---------------------------
   * Helpers
   * --------------------------*/
  const resolveUrl = useCallback(
    (url?: string | null) => {
      if (!url) return "/placeholder.png";
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      if (url.startsWith("/")) return `${API_BASE}${url}`;
      return url;
    },
    [API_BASE]
  );

  const getCart = () => JSON.parse(localStorage.getItem("cart") || "[]") as CartItem[];

  const sameVariant = (a?: CartItem["variant_id"] | null, b?: CartItem["variant_id"] | null) =>
    String(a ?? "") === String(b ?? "");

  const syncQtyFromCart = useCallback((pid: Product["id"], vid: CartItem["variant_id"] | null) => {
    const cart = getCart();
    const item = cart.find((i) => String(i.id) === String(pid) && sameVariant(i.variant_id ?? null, vid ?? null));
    setQuantity(item ? item.quantity : 0);
  }, []);

  const getVariantTitle = (v?: ProductVariant | null) => {
    if (!v) return null;
    return (v.title || v.name || v.color_name || "").trim() || null;
  };

  const getVariantHex = (v?: ProductVariant | null) => {
    if (!v) return null;
    return (v.color_hex || v.hex || "").trim() || null;
  };

  const getVariantPrice = (v?: ProductVariant | null) => {
    if (!v) return null;
    const p =
      typeof v.price === "number"
        ? v.price
        : typeof v.sale_price === "number"
        ? v.sale_price
        : null;
    return typeof p === "number" ? p : null;
  };

  const variants = useMemo<ProductVariant[]>(() => {
    const p = product;
    if (!p) return [];
    const arr =
      (Array.isArray(p.variants) ? p.variants : null) ||
      (Array.isArray(p.colors) ? p.colors : null) ||
      (Array.isArray(p.options) ? p.options : null) ||
      [];
    return Array.isArray(arr) ? arr : [];
  }, [product]);

  // ✅ پیش‌فرض: کمترین قیمت (اولویت با موجودها)
  const defaultVariantId = useMemo<string | number | null>(() => {
    if (!variants.length) return null;

    const inStock = variants.filter((v) => (typeof v.stock === "number" ? v.stock > 0 : true));
    const pool = inStock.length ? inStock : variants;

    let best = pool[0];
    let bestPrice = getVariantPrice(best);
    if (bestPrice === null) bestPrice = Infinity;

    for (const v of pool) {
      const vp = getVariantPrice(v);
      const price = vp === null ? Infinity : vp;
      if (price < bestPrice) {
        best = v;
        bestPrice = price;
      }
    }
    return best?.id ?? null;
  }, [variants]);

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!variants.length) return null;
    const vid = selectedVariantId ?? defaultVariantId;
    if (vid === null) return null;
    return variants.find((v) => String(v.id) === String(vid)) || null;
  }, [defaultVariantId, selectedVariantId, variants]);

  const displayedPrice = useMemo<number>(() => {
    if (!product) return 0;
    const vp = getVariantPrice(selectedVariant);
    if (typeof vp === "number" && Number.isFinite(vp)) return vp;
    return Number(product.base_sale_price || 0);
  }, [product, selectedVariant]);

  /** ---------------------------
   * Fetch Product
   * --------------------------*/
  useEffect(() => {
    let mounted = true;

    const pickDefaultVariantId = (vArr: ProductVariant[]) => {
      if (!vArr.length) return null;
      const inStock = vArr.filter((v) => (typeof v.stock === "number" ? v.stock > 0 : true));
      const pool = inStock.length ? inStock : vArr;

      let best = pool[0];
      let bestPrice = getVariantPrice(best);
      if (bestPrice === null) bestPrice = Infinity;

      for (const v of pool) {
        const p = getVariantPrice(v);
        const price = p === null ? Infinity : p;
        if (price < bestPrice) {
          best = v;
          bestPrice = price;
        }
      }
      return best?.id ?? null;
    };

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/${id}/`);
        const data = (await res.json()) as Product;

        if (!res.ok) {
          router.push("/");
          return;
        }

        if (!mounted) return;

        setProduct(data);
        setActiveMedia(0);

        const vArr =
          (Array.isArray(data.variants) ? data.variants : null) ||
          (Array.isArray(data.colors) ? data.colors : null) ||
          (Array.isArray(data.options) ? data.options : null) ||
          [];

        if (Array.isArray(vArr) && vArr.length) {
          const bestId = pickDefaultVariantId(vArr);
          setSelectedVariantId(bestId);
          syncQtyFromCart(data.id, bestId);
        } else {
          setSelectedVariantId(null);
          syncQtyFromCart(data.id, null);
        }
      } catch (e) {
        console.error("خطا در دریافت محصول:", e);
        if (mounted) router.push("/");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      mounted = false;
    };
  }, [API_BASE, id, router, syncQtyFromCart]);

  /** ---------------------------
   * When variant changes => sync quantity
   * --------------------------*/
  useEffect(() => {
    if (!product) return;
    const vid = selectedVariant ? selectedVariant.id : null;
    syncQtyFromCart(product.id, vid);
  }, [product, selectedVariant, syncQtyFromCart]);

  /** ---------------------------
   * Fetch Related (same category_slug)
   * --------------------------*/
  useEffect(() => {
    let mounted = true;

    const fetchRelated = async () => {
      if (!product?.category_slug) return;
      setRelatedLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/`);
        const data = (await res.json()) as Product[];
        const arr = Array.isArray(data) ? data : [];

        const filtered = arr
          .filter((p) => p.category_slug === product.category_slug && String(p.id) !== String(product.id))
          .slice(0, 12);

        if (!mounted) return;
        setRelated(filtered);
      } catch (e) {
        console.error("خطا در دریافت محصولات مشابه:", e);
        if (mounted) setRelated([]);
      } finally {
        if (mounted) setRelatedLoading(false);
      }
    };

    if (product?.category_slug) fetchRelated();
    return () => {
      mounted = false;
    };
  }, [API_BASE, product?.category_slug, product?.id]);

  /** ---------------------------
   * Media + Lightbox (variant-aware)
   * --------------------------*/
  const mediaList = useMemo<MediaItem[]>(() => {
    if (!product) return [];

    const vMedia = Array.isArray(selectedVariant?.media) ? selectedVariant?.media : [];
    if (vMedia && vMedia.length) return vMedia;

    const m = Array.isArray(product.media) ? product.media : [];
    if (m.length > 0) return m;

    const fallback = product.main_image || product.image_url;
    return fallback ? [{ file: fallback, is_video: false }] : [];
  }, [product, selectedVariant?.media]);

  const hasMultipleMedia = mediaList.length > 1;

  const currentMedia = mediaList[activeMedia] || null;
  const isVideo = !!currentMedia?.is_video;

  const mainMediaSrc = useMemo(() => {
    if (!product) return "/placeholder.png";
    const fromGallery = currentMedia?.file ? resolveUrl(currentMedia.file) : null;
    const fallback = resolveUrl(product.main_image || product.image_url);
    return fromGallery || fallback;
  }, [currentMedia?.file, product, resolveUrl]);

  const cartImage = useMemo(() => {
    // برای سبد: اگر مدیا تصویر داشتیم همونو برداریم (نه ویدیو)
    const firstImage = mediaList.find((m) => !m.is_video)?.file;
    if (firstImage) return resolveUrl(firstImage);
    // اگر فقط ویدیو بود یا هیچی نبود:
    return resolveUrl(product?.main_image || product?.image_url);
  }, [mediaList, product?.image_url, product?.main_image, resolveUrl]);

  const slides = useMemo(() => {
    if (!mediaList.length) return [{ src: "/placeholder.png" }];
    return mediaList.map((m) =>
      m.is_video
        ? { type: "video" as const, sources: [{ src: resolveUrl(m.file), type: "video/mp4" }] }
        : { src: resolveUrl(m.file) }
    );
  }, [mediaList, resolveUrl]);

  const nextMedia = useCallback(() => {
    if (!hasMultipleMedia) return;
    setActiveMedia((prev) => (prev + 1) % mediaList.length);
  }, [hasMultipleMedia, mediaList.length]);

  const prevMedia = useCallback(() => {
    if (!hasMultipleMedia) return;
    setActiveMedia((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  }, [hasMultipleMedia, mediaList.length]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => nextMedia(),
    onSwipedRight: () => prevMedia(),
    preventScrollOnSwipe: false,
    trackMouse: true,
    delta: 15,
  });

  /** ---------------------------
   * Cart (variant-aware)
   * --------------------------*/
  const updateCart = (delta: number) => {
    if (!product) return;

    const vid = selectedVariant ? selectedVariant.id : null;
    let cart = getCart();

    const idx = cart.findIndex((i) => String(i.id) === String(product.id) && sameVariant(i.variant_id ?? null, vid));

    let newQty = quantity + delta;
    if (newQty < 0) return;

    const vTitle = getVariantTitle(selectedVariant);

    if (idx > -1) {
      if (newQty === 0) {
        cart.splice(idx, 1);
        showModal("warning", "حذف شد", "کالا از سبد حذف شد.");
      } else {
        cart[idx].quantity = newQty;
        cart[idx].price = Number(displayedPrice);
        cart[idx].variant_id = vid;
        cart[idx].variant_title = vTitle;
        cart[idx].image_url = cartImage;
      }
    } else if (delta > 0) {
      cart.push({
        id: product.id,
        title: product.title,
        variant_id: vid,
        variant_title: vTitle,
        price: Number(displayedPrice),
        image_url: cartImage,
        quantity: 1,
      });
      showModal("success", "اضافه شد ✅", `${product.title}${vTitle ? ` (${vTitle})` : ""} به سبد اضافه شد!`);
      newQty = 1;
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    setQuantity(newQty);
    window.dispatchEvent(new Event("storage"));
  };

  /** ---------------------------
   * Share
   * --------------------------*/
  const handleShare = async () => {
    if (!product) return;
    const url = typeof window !== "undefined" ? window.location.href : "";

    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url });
        showModal("success", "ارسال شد", "لینک محصول ارسال شد ✅");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showModal("success", "کپی شد", "لینک محصول کپی شد ✅");
      } else {
        showModal("warning", "ناموفق", "مرورگر اجازه کپی/اشتراک‌گذاری نداد.");
      }
    } catch {
      // cancel یا خطا
    }
  };

  /** ---------------------------
   * Specs (dynamic + fallback)
   * --------------------------*/
  const specs = useMemo(() => {
    if (!product) return [];

    if (Array.isArray(product.specs)) {
      const list = product.specs
        .map((s) => {
          const name = (s.name || s.title || s.key || "").toString().trim();
          const value = s.value === null || typeof s.value === "undefined" ? "" : String(s.value).trim();
          if (!name || !value) return null;
          return { n: name, v: value };
        })
        .filter(Boolean) as { n: string; v: string }[];

      if (list.length) return list;
    }

    if (product.specs && typeof product.specs === "object" && !Array.isArray(product.specs)) {
      const entries = Object.entries(product.specs as Record<string, any>)
        .map(([k, v]) => {
          const name = String(k).trim();
          const value = v === null || typeof v === "undefined" ? "" : String(v).trim();
          if (!name || !value) return null;
          return { n: name, v: value };
        })
        .filter(Boolean) as { n: string; v: string }[];
      if (entries.length) return entries;
    }

    return [
      { n: "دسته‌بندی", v: product.category_slug ? product.category_slug : "—" },
      { n: "موجودی", v: typeof product.stock === "number" ? `${product.stock} عدد` : "نامشخص" },
      { n: "هزینه ارسال", v: product.shipping_fee ? `${Number(product.shipping_fee).toLocaleString()} تومان` : "—" },
      { n: "آخرین بروزرسانی", v: product.last_updated ? new Date(product.last_updated).toLocaleString("fa-IR") : "—" },
    ];
  }, [product]);

  /** ---------------------------
   * UI: Loading
   * --------------------------*/
  if (loading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black italic text-blue-600 animate-pulse">
        درحال لود اطلاعات محصول...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfcfc] p-6 md:p-12 font-sans italic relative" dir="rtl">
      <LightBox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        index={activeMedia}
        slides={slides}
        plugins={[Zoom, Video]}
        controller={{ closeOnBackdropClick: true }}
        render={{
          iconPrev: () => <ChevronLeft size={40} />,
          iconNext: () => <ChevronRight size={40} />,
          iconClose: () => <X size={48} />,
        }}
      />

      <div className="max-w-6xl mx-auto space-y-10 pb-40">
        {/* هدر */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-black text-sm transition-colors"
          >
            <ArrowRight size={20} /> بازگشت
          </button>

          <button
            onClick={handleShare}
            className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all"
            aria-label="اشتراک‌گذاری"
          >
            <Share2 size={20} />
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* گالری */}
          <section className="space-y-6">
            <motion.div
              {...swipeHandlers}
              className="bg-white p-6 shadow-2xl relative group rounded-[4rem] border border-gray-50 flex flex-col items-center justify-center aspect-square cursor-pointer touch-pan-y overflow-hidden"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              onClick={() => !isVideo && setIsLightboxOpen(true)}
            >
              <div className="absolute top-8 right-8 bg-red-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full z-10 animate-pulse">
                ویژه MENTAL
              </div>

              {!isVideo && (
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="absolute top-8 left-8 bg-white/80 p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all z-20 shadow-sm"
                >
                  <Maximize2 size={20} />
                </motion.div>
              )}

              {hasMultipleMedia && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextMedia();
                    }}
                    className="hidden lg:flex absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/90 border border-gray-100 shadow-lg items-center justify-center hover:bg-blue-50 transition-all z-20"
                    aria-label="بعدی"
                  >
                    <ChevronLeft size={26} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevMedia();
                    }}
                    className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/90 border border-gray-100 shadow-lg items-center justify-center hover:bg-blue-50 transition-all z-20"
                    aria-label="قبلی"
                  >
                    <ChevronRight size={26} />
                  </button>
                </>
              )}

              <AnimatePresence mode="wait">
                {isVideo ? (
                  <motion.video
                    key="video"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    src={mainMediaSrc}
                    controls
                    className="max-h-full w-full rounded-[2rem]"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <motion.img
                    key={activeMedia}
                    src={mainMediaSrc}
                    alt={product.title}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -50, opacity: 0 }}
                    onDragStart={(e) => e.preventDefault()}
                    className="max-h-full object-contain mix-blend-multiply transition-all duration-500"
                  />
                )}
              </AnimatePresence>

              {hasMultipleMedia && (
                <div className="absolute bottom-6 right-6 bg-white/85 backdrop-blur px-3 py-1.5 rounded-2xl text-[10px] font-black text-gray-700 border border-gray-100 shadow-sm">
                  {activeMedia + 1} / {mediaList.length}
                </div>
              )}
            </motion.div>

            {hasMultipleMedia && (
              <div className="flex lg:hidden justify-center gap-2">
                {mediaList.map((_, idx) => (
                  <motion.div
                    key={idx}
                    animate={{
                      width: activeMedia === idx ? 24 : 6,
                      backgroundColor: activeMedia === idx ? "#2563eb" : "#d1d5db",
                    }}
                    className="h-1.5 rounded-full"
                  />
                ))}
              </div>
            )}

            {mediaList.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {mediaList.map((m, idx) => {
                  const isActive = idx === activeMedia;
                  const thumbSrc = resolveUrl(m.file);
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveMedia(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-2xl border ${
                        isActive ? "border-blue-600" : "border-gray-100"
                      } bg-white shadow-sm overflow-hidden relative hover:shadow-md transition-all`}
                      aria-label={`مدیا ${idx + 1}`}
                    >
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                        {!m.is_video ? (
                          <img src={thumbSrc} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayCircle size={28} className="text-blue-600" />
                          </div>
                        )}
                      </div>

                      {m.is_video && (
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-black px-2 py-1 rounded-xl">
                          ویدیو
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* اطلاعات محصول */}
          <section className="space-y-8">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-black text-gray-900 leading-tight"
            >
              {product.title}
            </motion.h1>

            {/* ✅ انتخاب رنگ/Variant */}
            {variants.length > 0 && (
              <div className="bg-white rounded-[3rem] p-6 shadow-xl border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] font-black text-gray-500">انتخاب رنگ</div>
                  <div className="text-[10px] font-black text-gray-400">پیش‌فرض: کمترین قیمت</div>
                </div>

                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {variants.map((v) => {
                    const vid = v.id;
                    const activeId = (selectedVariantId ?? defaultVariantId) ?? "";
                    const isActive = String(vid) === String(activeId);
                    const hex = getVariantHex(v);
                    const title = getVariantTitle(v) || "گزینه";
                    const price = getVariantPrice(v);
                    const vStock = typeof v.stock === "number" ? v.stock : null;
                    const disabled = vStock !== null ? vStock <= 0 : false;

                    return (
                      <button
                        key={String(vid)}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedVariantId(vid);
                          setActiveMedia(0);
                        }}
                        className={`flex-shrink-0 px-4 py-3 rounded-2xl border text-right transition-all relative ${
                          isActive ? "border-blue-600 bg-blue-50" : "border-gray-100 bg-white"
                        } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-sm"}`}
                        aria-label={`variant-${title}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl border ${
                              isActive ? "border-blue-600" : "border-gray-200"
                            } bg-gray-50 flex items-center justify-center overflow-hidden`}
                            style={hex ? { backgroundColor: hex } : undefined}
                            title={hex || title}
                          >
                            {!hex && <span className="text-[10px] font-black text-gray-600">{title.slice(0, 2)}</span>}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-black text-gray-900 flex items-center gap-2">
                              {title}
                              {isActive && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white">
                                  <Check size={14} />
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] font-black text-blue-600 mt-1">
                              {typeof price === "number" && Number.isFinite(price)
                                ? `${price.toLocaleString()} تومان`
                                : `${Number(product.base_sale_price || 0).toLocaleString()} تومان`}
                            </div>
                          </div>
                        </div>

                        {disabled && (
                          <div className="absolute top-2 left-2 text-[9px] font-black bg-red-500 text-white px-2 py-1 rounded-xl">
                            ناموجود
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100 space-y-6"
            >
              <div className="flex justify-between items-end">
                <div className="space-y-1 text-right">
                  <p className="text-[10px] text-gray-400 font-black">
                    قیمت نقد{selectedVariant ? ` (${getVariantTitle(selectedVariant) || "گزینه"})` : ""}:
                  </p>
                  <p className="text-3xl font-black text-blue-600">
                    {Number(displayedPrice).toLocaleString()} <small className="text-xs">تومان</small>
                  </p>
                </div>

                {/* کنترل تعداد */}
                <div className="flex items-center bg-gray-50 p-2 rounded-2xl gap-4 border border-gray-100">
                  <button
                    onClick={() => updateCart(1)}
                    className="bg-white text-blue-600 p-2 rounded-xl shadow-sm hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                  <span className="text-xl font-black text-gray-900 w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => updateCart(-1)}
                    className="bg-white text-red-500 p-2 rounded-xl shadow-sm hover:bg-red-50 transition-colors"
                  >
                    <Minus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* بنر اقساط */}
              <Link href="/credit">
                <motion.div
                  whileHover={{ x: -5 }}
                  className="flex items-center justify-between p-6 bg-blue-50 rounded-[2rem] border-2 border-dashed border-blue-200 group hover:border-blue-400 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                      <Zap size={24} fill="white" />
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-900 text-sm">خرید اقساطی بدون ضامن بدون چک!</p>
                      <p className="text-[10px] text-blue-400 font-bold mt-1">قسطی بخر، الان لذتش رو ببر</p>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-blue-300" />
                </motion.div>
              </Link>
            </motion.div>

            {/* ویژگی‌ها */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 gap-4 text-[10px] font-black italic opacity-60"
            >
              <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-gray-100">
                <ShieldCheck className="text-blue-600" size={18} /> ضمانت سلامت و اصالت
              </div>
              <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-gray-100">
                <Truck className="text-blue-600" size={18} /> ارسال پستی سراسری
              </div>
            </motion.div>
          </section>
        </div>

        {/* تب‌ها */}
        <section className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-gray-100">
          <div className="flex gap-8 border-b border-gray-50 mb-10 pb-4">
            <button
              onClick={() => setActiveTab("specs")}
              className={`relative text-lg font-black transition-all ${
                activeTab === "specs" ? "text-blue-600" : "text-gray-300"
              }`}
            >
              مشخصات فنی
              {activeTab === "specs" && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute -bottom-[17px] left-0 right-0 h-1 bg-blue-600 rounded-full"
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab("desc")}
              className={`relative text-lg font-black transition-all ${
                activeTab === "desc" ? "text-blue-600" : "text-gray-300"
              }`}
            >
              بررسی محصول
              {activeTab === "desc" && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute -bottom-[17px] left-0 right-0 h-1 bg-blue-600 rounded-full"
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "specs" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-right">
                  {specs.map((s, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                      <span className="text-gray-400 font-black text-xs">{s.n}</span>
                      <span className="text-gray-900 font-black text-xs">{s.v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm font-bold text-gray-500 leading-10 text-justify">
                  {product.description || "توضیحات تکمیلی برای این محصول در دسترس نیست."}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* محصولات مشابه */}
        <section className="my-12">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-2 h-8 bg-gray-900 rounded-full" />
            <h3 className="text-xl font-black text-gray-900">محصولات مشابه</h3>
            <div className="mr-auto text-[10px] text-gray-400 font-black bg-white px-4 py-2 rounded-2xl border border-gray-100">
              {product.category_slug ? `دسته: ${product.category_slug}` : "—"}
            </div>
          </div>

          {relatedLoading ? (
            <div className="bg-white rounded-[3rem] p-8 border border-gray-100 text-center text-gray-400 font-black animate-pulse">
              در حال دریافت محصولات مشابه...
            </div>
          ) : related.length === 0 ? (
            <div className="bg-white rounded-[3rem] p-8 border border-gray-100 text-right">
              <p className="text-sm font-black text-gray-700 mb-1">فعلاً محصول مشابهی پیدا نشد.</p>
              <p className="text-xs text-gray-400">بعداً دوباره چک کن ✨</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {related.map((p) => {
                const img = resolveUrl(p.main_image || p.image_url);

                const pv =
                  (Array.isArray(p.variants) ? p.variants : null) ||
                  (Array.isArray(p.colors) ? p.colors : null) ||
                  (Array.isArray(p.options) ? p.options : null) ||
                  [];

                let minPrice = Number(p.base_sale_price || 0);
                if (Array.isArray(pv) && pv.length) {
                  const pool = pv.filter((v) => (typeof v.stock === "number" ? v.stock > 0 : true));
                  const arr = pool.length ? pool : pv;

                  let best = Infinity;
                  for (const v of arr) {
                    const price =
                      typeof v.price === "number"
                        ? v.price
                        : typeof v.sale_price === "number"
                        ? v.sale_price
                        : Infinity;
                    if (price < best) best = price;
                  }
                  if (best !== Infinity) minPrice = best;
                }

                return (
                  <motion.div
                    key={String(p.id)}
                    className="min-w-[220px] md:min-w-[260px] bg-white rounded-[2.5rem] p-5 border border-gray-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden text-right"
                    whileHover={{ y: -6 }}
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
                        <span className="text-[9px] font-black text-gray-400">شروع قیمت از:</span>
                        <span className="text-blue-600 font-black text-sm">{Number(minPrice).toLocaleString()} ت</span>
                      </div>

                      <button
                        onClick={() => {
                          const cart = getCart();

                          let vId: string | number | null = null;
                          let vTitle: string | null = null;
                          let price = Number(p.base_sale_price || 0);

                          if (Array.isArray(pv) && pv.length) {
                            const pool = pv.filter((v) => (typeof v.stock === "number" ? v.stock > 0 : true));
                            const arr = pool.length ? pool : pv;

                            let best = arr[0];
                            let bestPrice =
                              typeof best.price === "number"
                                ? best.price
                                : typeof best.sale_price === "number"
                                ? best.sale_price
                                : Infinity;

                            for (const v of arr) {
                              const pr =
                                typeof v.price === "number"
                                  ? v.price
                                  : typeof v.sale_price === "number"
                                  ? v.sale_price
                                  : Infinity;
                              if (pr < bestPrice) {
                                best = v;
                                bestPrice = pr;
                              }
                            }

                            vId = best?.id ?? null;
                            vTitle = (best?.title || best?.name || best?.color_name || "").trim() || null;
                            price = bestPrice !== Infinity ? bestPrice : price;
                          }

                          const idx = cart.findIndex((i) => String(i.id) === String(p.id) && sameVariant(i.variant_id ?? null, vId));

                          const finalImage = resolveUrl(p.main_image || p.image_url);

                          if (idx > -1) cart[idx].quantity += 1;
                          else
                            cart.push({
                              id: p.id,
                              title: p.title,
                              variant_id: vId,
                              variant_title: vTitle,
                              price: Number(price),
                              image_url: finalImage,
                              quantity: 1,
                            });

                          localStorage.setItem("cart", JSON.stringify(cart));
                          window.dispatchEvent(new Event("storage"));
                          showModal("success", "اضافه شد", `${p.title}${vTitle ? ` (${vTitle})` : ""} به سبد اضافه شد 🛒`);
                        }}
                        className="bg-gray-900 text-white p-2.5 rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-90"
                        aria-label="افزودن به سبد"
                      >
                        <Plus size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* دکمه پایین */}
      <div className="fixed bottom-32 left-6 right-6 z-[50] md:max-w-md md:mx-auto">
        <AnimatePresence mode="wait">
          {quantity === 0 ? (
            <motion.button
              key="add-btn"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateCart(1)}
              className="w-full bg-gray-900 text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-3 font-black text-sm italic"
            >
              <ShoppingCart size={20} />
              افزودن به سبد خرید
            </motion.button>
          ) : (
            <motion.div
              key="combined-btn"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full bg-gray-900 p-2 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-2"
            >
              <div className="flex items-center bg-white/10 p-2 rounded-[2rem] gap-4 border border-white/5">
                <button
                  onClick={() => updateCart(1)}
                  className="bg-white text-blue-600 p-2 rounded-xl shadow-sm hover:scale-110 transition-transform"
                >
                  <Plus size={18} strokeWidth={4} />
                </button>
                <span className="text-lg font-black text-white w-5 text-center">{quantity}</span>
                <button
                  onClick={() => updateCart(-1)}
                  className="bg-white text-red-500 p-2 rounded-xl shadow-sm hover:scale-110 transition-transform"
                >
                  <Minus size={18} strokeWidth={4} />
                </button>
              </div>

              <Link href="/cart" className="flex-1 flex items-center justify-between px-4 text-white group">
                <div className="text-right">
                  <p className="text-[10px] font-black opacity-50 italic">مرحله نهایی</p>
                  <p className="text-sm font-black uppercase tracking-tighter">تکمیل خرید</p>
                </div>

                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center group-hover:-translate-x-2 transition-transform">
                  <ArrowLeft size={20} />
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
