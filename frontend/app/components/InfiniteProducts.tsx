"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
// ✅ اضافه شدن ایمپورت آیکون Plus برای رفع ارور بیلد
import { Plus } from "lucide-react";

type Product = any;

interface Props {
  apiBase?: string;
  pageSize?: number;
  addToCart: (p: Product) => void;
}

export default function InfiniteProducts({ apiBase = "https://mental-shop-api.liara.run", pageSize = 24, addToCart }: Props) {
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [looping, setLooping] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/products/?page=${p}&page_size=${pageSize}`);
      if (!res.ok) {
        const all = await fetch(`${apiBase}/api/products/`).then(r => r.json());
        return Array.isArray(all) ? all : [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      try {
        const all = await fetch(`${apiBase}/api/products/`).then(r => r.json());
        return Array.isArray(all) ? all : [];
      } catch (e) {
        return [];
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, pageSize]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await fetchPage(1);
      if (!mounted) return;
      setItems(data.slice(0, pageSize));
      
      if (data.length < pageSize) {
        setHasMore(data.length > 0);
        setLooping(true);
      } else {
        setHasMore(true);
      }
    })();
    return () => { mounted = false; };
  }, [fetchPage, pageSize]);

  useEffect(() => {
    if (!lastElementRef.current) return;
    
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && hasMore) {
        setPage(prev => prev + 1);
      }
    }, { rootMargin: "400px" });

    observerRef.current.observe(lastElementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore]);

  useEffect(() => {
    if (page === 1) return;
    let mounted = true;
    (async () => {
      const data = await fetchPage(page);
      if (!mounted) return;

      if (data.length === 0) {
        if (looping && items.length > 0) {
          const clones = items.map((it, idx) => ({ ...it, id: `${it.id}-loop-${page}-${idx}` }));
          setItems(prev => [...prev, ...clones]);
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        return;
      }

      setItems(prev => [...prev, ...data]);
      setHasMore(data.length >= pageSize);
    })();
    return () => { mounted = false; };
  }, [page, fetchPage, looping, pageSize]);

  return (
    <section className="my-14 font-black italic">
      <div className="flex justify-between items-center mb-6 px-2 md:px-0">
        <h3 className="text-xl text-gray-900 border-r-4 border-blue-600 pr-3">ویترین بی‌پایان</h3>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest">Scroll to explore</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {items.map((p: Product, idx: number) => {
          const isLast = idx === items.length - 1;
          const productImage = p.main_image || p.image_url || "/placeholder.png";

          return (
            <div 
              key={p.id} 
              ref={isLast ? lastElementRef : null} 
              className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-xl transition-all duration-500"
            >
              <a href={`/product/${p.id}`} className="block mb-3 overflow-hidden rounded-2xl">
                <div className="w-full h-40 flex items-center justify-center bg-gray-50 p-4">
                  <img 
                    src={productImage} 
                    alt={p.title} 
                    className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-700" 
                  />
                </div>
              </a>
              <div className="flex-1">
                <h4 className="text-[11px] font-black text-gray-900 mb-2 line-clamp-2 min-h-[32px]">{p.title}</h4>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <div className="text-right">
                  <div className="text-[9px] text-gray-400">نقد و اقساط</div>
                  <div className="text-xs font-black text-blue-600">{Number(p.base_sale_price).toLocaleString()} تومان</div>
                </div>
                <button 
                  onClick={() => addToCart(p)} 
                  className="bg-gray-900 text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-12">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-blue-600 animate-pulse">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
            در حال دریافت کالاهای جدید...
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <div className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
            — پایان ویترین —
          </div>
        )}
      </div>
    </section>
  );
}
