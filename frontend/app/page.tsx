"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useModal } from "@/context/ModalContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  Wallet,
  Banknote,
  Zap,
  Truck,
  Lock,
  ArrowRight,
  User,
  PlayCircle,
} from "lucide-react";

/** ---------------------------
 * Types
 * --------------------------*/
type Variant = {
  id: number | string;

  // اسم رنگ (اختیاری)
  title?: string | null; // مثال: "مشکی"
  color_name?: string | null;

  // کد رنگ (اختیاری)
  color?: string | null; // مثال: "#000000"
  color_hex?: string | null;

  // قیمت این ورینت
  price?: number | string | null;

  // عکس اختصاصی ورینت (اختیاری)
  image?: string | null;
  image_url?: string | null;

  // موجودی (اختیاری)
  stock?: number | null;
};

type Product = {
  id: number | string;
  title: string;
  description?: string | null;

  // قیمت پایه (اگر ورینت نداشته باشه)
  base_sale_price: number | string;

  shipping_fee?: number | string;
  stock?: number;

  category?: number | null;
  category_slug?: string | null;

  image_url?: string | null;
  main_image?: string | null;

  // ✅ ورینت‌ها (رنگ‌ها)
  variants?: Variant[];

  last_updated?: string;
};

type CartItem = {
  key: string; // ✅ ترکیب product+variant تا سبد درست کار کنه
  product_id: Product["id"];
  variant_id?: Variant["id"] | null;

  title: string;
  price: number;
  image_url?: string | null;

  color_label?: string | null; // "مشکی"
  color_hex?: string | null; // "#000000"

  quantity: number;
};

/** ---------------------------
 * Helpers
 * --------------------------*/

// ✅ کلید آیتم سبد (محصول + ورینت)
const makeCartKey = (productId: Product["id"], variantId?: Variant["id"] | null) => {
  return `${String(productId)}::${variantId ? String(variantId) : "base"}`;
};

// ✅ کمترین قیمتِ ورینت را پیدا می‌کند (دیفالت)
const getCheapestVariant = (product: Product): Variant | null => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;

  const normalized = variants
    .map((v) => {
      const raw = v?.price;
      const priceNum = typeof raw === "string" ? Number(raw) : Number(raw ?? NaN);
      return { v, priceNum };
    })
    .filter((x) => Number.isFinite(x.priceNum));

  if (!normalized.length) return null;

  normalized.sort((a, b) => a.priceNum - b.priceNum);
  return normalized[0].v;
};

// ✅ قیمت نمایشی (اگر ورینت داشت: قیمت کمترین، اگر نه: قیمت پایه)
const getDisplayPrice = (product: Product): number => {
  const cheapest = getCheapestVariant(product);
  if (cheapest?.price != null) {
    const n = typeof cheapest.price === "string" ? Number(cheapest.price) : Number(cheapest.price);
    if (Number.isFinite(n)) return n;
  }
  const base =
    typeof product.base_sale_price === "string"
      ? Number(product.base_sale_price)
      : Number(product.base_sale_price);
  return Number.isFinite(base) ? base : 0;
};

// ✅ عکس نمایشی (اول عکس ورینت دیفالت، بعد عکس محصول)
const getDisplayImage = (product: Product): string => {
  const cheapest = getCheapestVariant(product);
  const vImg = cheapest?.image || cheapest?.image_url;
  return vImg || product.main_image || product.image_url || "/placeholder.png";
};

// ✅ برچسب رنگ
const getVariantLabel = (v: Variant | null): string | null => {
  if (!v) return null;
  return (v.title || v.color_name || null) as any;
};
const getVariantHex = (v: Variant | null): string | null => {
  if (!v) return null;
  return (v.color || v.color_hex || null) as any;
};

// ✅ مهاجرت سبد خرید قبلی (اگر قبلاً key/product_id نداشته)
const normalizeCartFromStorage = (raw: any[]): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it: any) => {
      const product_id = it?.product_id ?? it?.id ?? null;
      if (product_id == null) return null;

      const variant_id = it?.variant_id ?? null;

      const key = it?.key || makeCartKey(product_id, variant_id);
      const title = it?.title ?? "";
      const price = Number(it?.price ?? 0);
      const image_url = it?.image_url ?? it?.image ?? null;
      const quantity = Number(it?.quantity ?? 0);

      const color_label = it?.color_label ?? null;
      const color_hex = it?.color_hex ?? null;

      return {
        key,
        product_id,
        variant_id,
        title,
        price: Number.isFinite(price) ? price : 0,
        image_url,
        color_label,
        color_hex,
        quantity: Number.isFinite(quantity) ? quantity : 0,
      } as CartItem;
    })
    .filter(Boolean) as CartItem[];
};

/** ---------------------------
 * Skeleton
 * --------------------------*/
const ProductSkeleton = () => (
  <div className="flex gap-4 overflow-hidden pb-6">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="min-w-[220px] md:min-w-[280px] bg-white rounded-[2.5rem] p-5 border border-gray-50 animate-pulse"
      >
        <div className="w-full h-44 md:h-52 bg-gray-100 rounded-3xl mb-4" />
        <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
          <div className="h-6 bg-gray-100 rounded w-20" />
          <div className="w-10 h-10 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    ))}
  </div>
);

/** ---------------------------
 * CategoryCard
 * --------------------------*/
const CategoryCard = ({
  title,
  desc,
  slug,
  Icon,
  gradient,
  items,
  cart,
  updateQuantity,
  isLoading,
}: any) => {
  return (
    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
      <Link href={`/category/${slug}`} className="block">
        <div className={`p-7 md:p-8 ${gradient} text-white relative overflow-hidden`}>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="text-right">
              <h3 className="text-xl md:text-2xl font-black mb-2">{title}</h3>
              <p className="text-xs md:text-sm opacity-90 leading-6 max-w-[22rem]">{desc}</p>

              <span className="inline-flex items-center gap-2 mt-5 bg-white/15 border border-white/20 px-4 py-2 rounded-2xl text-xs font-black">
                مشاهده دسته <ArrowRight size={16} />
              </span>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Icon size={28} />
            </div>
          </div>

          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-14 -top-14 w-64 h-64 rounded-full bg-black/10 blur-2xl" />
        </div>
      </Link>

      <div className="p-6 md:p-7">
        {isLoading ? (
          <ProductSkeleton />
        ) : items && items.length > 0 ? (
          <div className="space-y-4">
            {items.slice(0, 3).map((p: Product) => {
              const defaultVariant = getCheapestVariant(p);
              const cartKey = makeCartKey(p.id, defaultVariant?.id ?? null);
              const cartItem = cart.find((i: CartItem) => i.key === cartKey);
              const quantity = cartItem ? cartItem.quantity : 0;

              const price = getDisplayPrice(p);
              const img = getDisplayImage(p);

              return (
                <Link
                  href={`/product/${p.id}`}
                  key={String(p.id)}
                  className="flex items-center justify-between gap-4 border border-gray-100 rounded-2xl p-3 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={p.title} className="w-full h-full object-contain" loading="lazy" />
                    </div>

                    <div className="min-w-0 text-right">
                      <p className="text-xs md:text-sm font-black text-gray-900 truncate">{p.title}</p>

                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] md:text-xs text-blue-600 font-black">
                          {Number(price).toLocaleString()} ت
                        </p>

                        {defaultVariant && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-gray-500">
                            <span
                              className="w-3 h-3 rounded-full border border-gray-200"
                              style={{ background: getVariantHex(defaultVariant) || "#e5e7eb" }}
                            />
                            {getVariantLabel(defaultVariant) || "رنگ"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {quantity === 0 ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateQuantity(p, 1, defaultVariant);
                        }}
                        className="bg-gray-900 text-white p-2 rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-90"
                        type="button"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    ) : (
                      <div
                        className="flex items-center bg-gray-100 p-1 rounded-2xl gap-2 border border-gray-200"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateQuantity(p, 1, defaultVariant);
                          }}
                          className="bg-white text-blue-600 p-1.5 rounded-xl shadow-sm hover:bg-blue-50"
                          type="button"
                        >
                          <Plus size={14} strokeWidth={4} />
                        </button>

                        <span className="text-sm font-black text-gray-900 w-4 text-center">{quantity}</span>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateQuantity(p, -1, defaultVariant);
                          }}
                          className="bg-white text-red-500 p-1.5 rounded-xl shadow-sm hover:bg-red-50"
                          type="button"
                        >
                          <Minus size={14} strokeWidth={4} />
                        </button>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-5 text-right border border-gray-100">
            <p className="text-sm font-black text-gray-700 mb-1">فعلاً محصولی برای این دسته نداریم.</p>
            <p className="text-xs text-gray-400">به‌زودی محصولات اضافه می‌شن ✨</p>
          </div>
        )}
      </div>
    </div>
  );
};

/** ---------------------------
 * ProductShelf
 * --------------------------*/
const ProductShelf = ({
  title,
  items,
  slug,
  color = "blue",
  cart,
  updateQuantity,
  isLoading,
}: any) => {
  if (isLoading) {
    return (
      <section className="my-12 px-2">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-6 bg-gray-100 rounded-full w-48 animate-pulse" />
        </div>
        <ProductSkeleton />
      </section>
    );
  }

  const colorClasses: any = {
    blue: "bg-blue-600",
    red: "bg-red-600",
    purple: "bg-purple-600",
    indigo: "bg-indigo-600",
  };

  return (
    <section className="my-12">
      <div className="flex justify-between items-center mb-6 px-2 text-right">
        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <span className={`w-2 h-8 ${colorClasses[color]} rounded-full`}></span>
          {title}
        </h3>
        <Link
          href={`/category/${slug}`}
          className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all"
        >
          مشاهده همه
        </Link>
      </div>

      {!items || items.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 text-right">
          <p className="text-sm font-black text-gray-700 mb-2">فعلاً محصولی در این بخش موجود نیست.</p>
          <p className="text-xs text-gray-400 mb-6">به‌زودی شارژ میشه ✨</p>
          <Link
            href={`/category/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all"
          >
            مشاهده صفحه دسته <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-4 pb-6 scrollbar-hide snap-x snap-mandatory touch-pan-x">
          {items.slice(0, 10).map((product: Product) => {
            const defaultVariant = getCheapestVariant(product);
            const cartKey = makeCartKey(product.id, defaultVariant?.id ?? null);
            const cartItem = cart.find((i: CartItem) => i.key === cartKey);
            const quantity = cartItem ? cartItem.quantity : 0;

            const displayPrice = getDisplayPrice(product);
            const displayImg = getDisplayImage(product);

            return (
              <motion.div
                key={String(product.id)}
                className="min-w-[220px] md:min-w-[280px] snap-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -10 }}
              >
                <Link href={`/product/${product.id}`} className="block h-full">
                  <div className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-gray-100 h-full flex flex-col justify-between group hover:shadow-xl transition-all relative overflow-hidden text-right">
                    <div className="absolute top-4 right-4 z-10 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md animate-pulse">
                      ویژه MENTAL
                    </div>

                    <div>
                      <motion.div
                        className="relative overflow-hidden rounded-3xl mb-4 bg-gray-50 flex items-center justify-center p-6 h-44 md:h-52 cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayImg}
                          alt={product.title}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </motion.div>

                      <h3 className="text-gray-900 font-black mb-3 text-xs md:text-sm leading-6 h-12 overflow-hidden line-clamp-2">
                        {product.title}
                      </h3>

                      {defaultVariant && (
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ background: getVariantHex(defaultVariant) || "#e5e7eb" }}
                          />
                          <span className="text-[10px] font-black text-gray-500">
                            {getVariantLabel(defaultVariant) || "رنگ"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-400">قیمت از:</span>
                        <span className="text-blue-600 font-black text-sm md:text-md">
                          {Number(displayPrice).toLocaleString()} ت
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {quantity === 0 ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateQuantity(product, 1, defaultVariant);
                            }}
                            className="bg-gray-900 text-white p-2.5 rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-90"
                            type="button"
                          >
                            <Plus size={18} strokeWidth={3} />
                          </button>
                        ) : (
                          <div
                            className="flex items-center bg-gray-100 p-1 rounded-2xl gap-3 border border-gray-200 animate-in zoom-in duration-200"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateQuantity(product, 1, defaultVariant);
                              }}
                              className="bg-white text-blue-600 p-1.5 rounded-xl shadow-sm hover:bg-blue-50"
                              type="button"
                            >
                              <Plus size={14} strokeWidth={4} />
                            </button>

                            <span className="text-sm font-black text-gray-900 w-4 text-center">{quantity}</span>

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateQuantity(product, -1, defaultVariant);
                              }}
                              className="bg-white text-red-500 p-1.5 rounded-xl shadow-sm hover:bg-red-50"
                              type="button"
                            >
                              <Minus size={14} strokeWidth={4} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
};

/** ---------------------------
 * Triple Banners
 * --------------------------*/
const TripleBanners = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-12 text-right">
    {[
      { t: "تجهیزات گیمینگ", d: "تخفیف ویژه کنسول و لوازم جانبی", c: "from-orange-400 to-red-500", i: "🎮" },
      { t: "ساعت هوشمند", d: "جدیدترین‌های بازار با ضمانت", c: "from-blue-500 to-indigo-600", i: "⌚" },
      { t: "لوازم دیجیتال", d: "بهترین قیمت تبلت و لپ‌تاپ", c: "from-emerald-500 to-teal-600", i: "💻" },
    ].map((banner, idx) => (
      <motion.div
        key={idx}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`h-44 rounded-[2.5rem] bg-gradient-to-br ${banner.c} p-8 text-white relative overflow-hidden shadow-lg group cursor-pointer`}
      >
        <h4 className="text-xl font-black relative z-10 italic">{banner.t}</h4>
        <p className="text-xs opacity-80 mt-2 relative z-10">{banner.d}</p>
        <div className="absolute -right-4 -bottom-4 text-8xl opacity-20 group-hover:scale-125 transition-transform duration-500">
          {banner.i}
        </div>
      </motion.div>
    ))}
  </div>
);

export default function Home() {
  const { showModal } = useModal();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const [userName, setUserName] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const IP_ADDRESS = "mental-shop-api.liara.run";

  useEffect(() => {
    fetch(`https://${IP_ADDRESS}/api/products/`)
      .then((res) => res.json())
      .then((data) => {
        const arr: Product[] = Array.isArray(data) ? data : [];
        arr.sort((a: Product, b: Product) => {
          const da = a?.last_updated ? new Date(a.last_updated).getTime() : 0;
          const db = b?.last_updated ? new Date(b.last_updated).getTime() : 0;
          return db - da;
        });
        setProducts(arr);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    const savedCartRaw = JSON.parse(localStorage.getItem("cart") || "[]");
    const savedCart = normalizeCartFromStorage(savedCartRaw);
    localStorage.setItem("cart", JSON.stringify(savedCart)); // ✅ یک‌بار نرمال‌سازی و ذخیره
    setLocalCart(savedCart);
    updateGlobalCounts(savedCart);

    const token = localStorage.getItem("access_token");
    if (token) {
      fetch(`https://${IP_ADDRESS}/api/user-profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setUserName(data.fullName);
          setWalletBalance(data.wallet_balance || 0);
          setIsLoggedIn(true);
        })
        .catch(() => {});

      fetch(`https://${IP_ADDRESS}/api/my-requests/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setMyRequests(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateGlobalCounts = (cart: CartItem[]) => {
    setCartCount(cart.reduce((acc: number, item: CartItem) => acc + (item.quantity || 0), 0));
  };

  /**
   * ✅ مهم: updateQuantity حالا ورینت هم می‌گیرد
   * - اگر ورینت داشت: با همان ورینت ذخیره می‌شود
   * - اگر نداشت: مثل قبل
   */
  const updateQuantity = (product: Product, delta: number, variant?: Variant | null) => {
    const chosenVariant = variant ?? getCheapestVariant(product);

    const key = makeCartKey(product.id, chosenVariant?.id ?? null);
    const price =
      chosenVariant?.price != null && Number.isFinite(Number(chosenVariant.price))
        ? Number(chosenVariant.price)
        : getDisplayPrice(product);

    const image_url =
      (chosenVariant?.image || chosenVariant?.image_url) ||
      product.main_image ||
      product.image_url ||
      "/placeholder.png";

    const color_label = getVariantLabel(chosenVariant);
    const color_hex = getVariantHex(chosenVariant);

    let cart = [...localCart];
    const existingIndex = cart.findIndex((item: CartItem) => item.key === key);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += delta;
      if (cart[existingIndex].quantity <= 0) {
        cart.splice(existingIndex, 1);
        showModal("warning", "حذف شد", `کالای ${product.title} از سبد حذف شد.`);
      }
    } else if (delta > 0) {
      cart.push({
        key,
        product_id: product.id,
        variant_id: chosenVariant?.id ?? null,
        title: product.title,
        price: Number.isFinite(price) ? price : 0,
        image_url,
        color_label,
        color_hex,
        quantity: 1,
      });
      showModal("success", "اضافه شد", `${product.title} به سبد خرید اضافه شد 🛒`);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    setLocalCart(cart);
    updateGlobalCounts(cart);
    window.dispatchEvent(new Event("storage"));
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    window.location.reload();
  };

  const filterByCategorySlug = (slug: string) => {
    return products.filter((p) => (p.category_slug || "") === slug);
  };

  const hasPendingRequest =
    Array.isArray(myRequests) && myRequests.some((req: any) => req.status === "pending");

  const categoryBlocks = [
    {
      title: "گوشی‌های هوشمند",
      desc: "آیفون، سامسونگ، شیائومی و مدل‌های جدید",
      slug: "mobile",
      Icon: User,
      gradient: "bg-gradient-to-br from-slate-800 to-blue-800",
    },
    {
      title: "لپ‌تاپ و تبلت",
      desc: "مک‌بوک، ایسوس، لنوو، آیپد و تبلت‌های محبوب",
      slug: "laptop",
      Icon: Wallet,
      gradient: "bg-gradient-to-br from-gray-900 to-emerald-800",
    },
    {
      title: "ساعت و مچ‌بند",
      desc: "ساعت هوشمند، بند و لوازم جانبی",
      slug: "watch",
      Icon: CreditCard,
      gradient: "bg-gradient-to-br from-blue-600 to-indigo-800",
    },
    {
      title: "گیمینگ",
      desc: "کنسول، دسته، اکسسوری و تجهیزات گیم",
      slug: "gaming",
      Icon: Truck,
      gradient: "bg-gradient-to-br from-indigo-600 to-blue-900",
    },
    {
      title: "هدفون و صوتی",
      desc: "هدفون، هندزفری، ایرپاد و اسپیکر",
      slug: "audio",
      Icon: PlayCircle,
      gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
    },
    {
      title: "آرایشی و بهداشتی",
      desc: "عطر، مراقبت پوست و مو، محصولات زیبایی",
      slug: "beauty",
      Icon: Lock,
      gradient: "bg-gradient-to-br from-rose-500 to-orange-500",
    },
    {
      title: "لوازم جانبی",
      desc: "کابل، شارژر، قاب، گلس، پاوربانک و ...",
      slug: "accessory",
      Icon: Zap,
      gradient: "bg-gradient-to-br from-purple-600 to-fuchsia-600",
    },
    {
      title: "تبلت",
      desc: "تبلت‌های جدید و لوازم مربوطه",
      slug: "tablet",
      Icon: Banknote,
      gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative overflow-x-hidden text-right" dir="rtl">
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[55]"
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed top-0 right-0 h-full w-80 bg-white z-[60] shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: isMenuOpen ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        <div className="p-8 h-full flex flex-col font-black italic">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl text-gray-900">منوی کاربری</h2>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-gray-400 hover:text-red-500 text-3xl font-bold"
              type="button"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
            <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100">
              <p className="text-[10px] text-blue-400 mb-1">خوش آمدید</p>
              <p className="text-gray-900">{userName || "کاربر مهمان"}</p>
              {isLoggedIn && (
                <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg mt-4">
                  <p className="text-[9px] opacity-80 mb-1">اعتبار خرید فعلی:</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xl">{(walletBalance || 0).toLocaleString()}</span>
                    <span className="text-[10px]">تومان</span>
                  </div>
                </div>
              )}
            </div>

            <nav className="space-y-4 text-gray-700">
              <Link
                href="/cart"
                className="flex justify-between items-center p-2 hover:text-blue-600 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <ShoppingCart size={18} />
                  🛒 سبد خرید
                </span>
                {cartCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full">{cartCount}</span>
                )}
              </Link>
              <Link href="/my-orders" className="block p-2 hover:text-blue-600 transition-colors">
                📦 سفارشات و رهگیری
              </Link>
              <Link href="/profile" className="block p-2 hover:text-blue-600 transition-colors">
                👤 تنظیمات پروفایل
              </Link>
            </nav>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-6 p-4 bg-red-50 text-red-600 rounded-2xl font-black text-sm transition-all hover:bg-red-600 hover:text-white uppercase tracking-widest"
            type="button"
          >
            خروج از حساب
          </button>
        </div>
      </motion.div>

      <section className="bg-white overflow-x-auto p-6 md:px-12 flex gap-8 scrollbar-hide border-b border-gray-100 justify-between">
        {[
          { label: "گوشی", icon: "📱", s: "mobile" },
          { label: "لپ‌تاپ", icon: "💻", s: "laptop" },
          { label: "ساعت", icon: "⌚", s: "watch" },
          { label: "تبلت", icon: "📟", s: "tablet" },
          { label: "گیمینگ", icon: "🎮", s: "gaming" },
          { label: "هدفون", icon: "🎧", s: "audio" },
          { label: "آرایشی", icon: "🧴", s: "beauty" },
          { label: "جانبی", icon: "🔌", s: "accessory" },
        ].map((cat, i) => (
          <Link href={`/category/${cat.s}`} key={i} className="flex flex-col items-center gap-3 flex-shrink-0 group">
            <motion.div
              className="w-20 h-20 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-3xl transition-all duration-300"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {cat.icon}
            </motion.div>
            <span className="text-[11px] font-black text-gray-500 group-hover:text-blue-600">{cat.label}</span>
          </Link>
        ))}
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-8">
        <section className="mb-12">
          {isLoggedIn && hasPendingRequest ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-[3rem] text-center border-2 border-dashed border-gray-200"
            >
              <h2 className="text-2xl font-black text-gray-400 italic mb-3">پرونده شما در صف بررسی است ⏳</h2>
              <p className="text-sm font-bold text-gray-400">
                تا تعیین تکلیف درخواست فعلی، امکان ثبت درخواست جدید وجود ندارد.
              </p>
              <Link
                href="/my-requests"
                className="inline-block mt-6 text-blue-600 font-black text-sm border-b-2 border-blue-600 pb-1"
              >
                پیگیری لحظه‌ای وضعیت ←
              </Link>
            </motion.div>
          ) : (
            <Link
              href="/credit"
              className="block bg-gradient-to-r from-gray-900 to-blue-900 p-12 rounded-[3.5rem] text-white relative overflow-hidden group shadow-2xl"
            >
              <div className="relative z-10 max-w-xl">
                <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight italic inline-flex items-center gap-3">
                  <CreditCard size={30} />
                  خرید قسطی، لذت آنی! 💳
                </h2>
                <p className="text-lg font-bold text-blue-200 mb-8">تا سقف ۱۵۰ میلیون تومان بدون ضامن و چک صیادی</p>
                <span className="inline-block bg-white text-gray-900 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl group-hover:bg-blue-50 transition-colors">
                  دریافت اعتبار فوری
                </span>
              </div>
              <motion.div
                className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
            </Link>
          )}
        </section>

        <section className="my-12">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-2 h-8 bg-gray-900 rounded-full" />
            <h3 className="text-xl font-black text-gray-900">دسته‌های پیشنهادی</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryBlocks.map((c) => (
              <CategoryCard
                key={c.slug}
                title={c.title}
                desc={c.desc}
                slug={c.slug}
                Icon={c.Icon}
                gradient={c.gradient}
                items={filterByCategorySlug(c.slug)}
                cart={localCart}
                updateQuantity={updateQuantity}
                isLoading={isLoading}
              />
            ))}
          </div>
        </section>

        <ProductShelf
          title="جدیدترین‌های بازار"
          items={products}
          slug="newest"
          color="blue"
          cart={localCart}
          updateQuantity={updateQuantity}
          isLoading={isLoading}
        />

        <ProductShelf
          title="گوشی‌های هوشمند"
          items={filterByCategorySlug("mobile")}
          slug="mobile"
          color="purple"
          cart={localCart}
          updateQuantity={updateQuantity}
          isLoading={isLoading}
        />

        <TripleBanners />

        <ProductShelf
          title="ساعت و مچ‌بند هوشمند"
          items={filterByCategorySlug("watch")}
          slug="watch"
          color="red"
          cart={localCart}
          updateQuantity={updateQuantity}
          isLoading={isLoading}
        />

        <motion.div
          className="h-64 rounded-[3.5rem] bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070')] bg-cover bg-center my-12 relative flex items-center px-12 text-white shadow-xl overflow-hidden group text-right italic"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors"></div>
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-black italic mb-2 uppercase">Gamer Zone 🎮</h3>
            <p className="font-bold text-gray-200">حرفه‌ای‌ترین تجهیزات گیمینگ با شرایط اقساطی استثنایی</p>
          </div>
        </motion.div>

        <ProductShelf
          title="دنیای گیمرها"
          items={filterByCategorySlug("gaming")}
          slug="gaming"
          color="indigo"
          cart={localCart}
          updateQuantity={updateQuantity}
          isLoading={isLoading}
        />

        <ProductShelf
          title="لپ‌تاپ و تبلت"
          items={filterByCategorySlug("laptop")}
          slug="laptop"
          color="blue"
          cart={localCart}
          updateQuantity={updateQuantity}
          isLoading={isLoading}
        />

        <ProductShelf
          title="آرایشی و بهداشتی"
          items={filterByCategorySlug("beauty")}
          slug="beauty"
          color="red"
          cart={localCart}
          updateQuantity={updateQuantity}
          isLoading={isLoading}
        />

        <ProductShelf
          title="لوازم جانبی و دیجیتال"
          items={filterByCategorySlug("accessory")}
          slug="accessory"
          color="purple"
          cart={localCart}
          updateQuantity={updateQuantity}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
