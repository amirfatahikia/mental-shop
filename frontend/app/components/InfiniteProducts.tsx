"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

type Product = any;

interface Props {
  apiBase?: string;
  pageSize?: number;
  addToCart: (p: Product) => void;
}

export default function InfiniteProducts({ apiBase = "http://127.0.0.1:8000", pageSize = 24, addToCart }: Props) {
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
        // Fallback: try without pagination
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
      // if returned less than pageSize, assume pagination not available
      if (data.length < pageSize) {
        setHasMore(data.length > 0);
        // if limited dataset, allow looping to emulate infinite scroll
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
      if (entries[0].isIntersecting && !loading) {
        setPage(prev => prev + 1);
      }
    }, { rootMargin: "400px" });
    observerRef.current.observe(lastElementRef.current);
    return () => observerRef.current && observerRef.current.disconnect();
  }, [loading]);

  useEffect(() => {
    if (page === 1) return;
    let mounted = true;
    (async () => {
      const data = await fetchPage(page);
      if (!mounted) return;
      if (data.length === 0) {
        if (looping && items.length > 0) {
          // create cloned items to keep the feed endless
          const clones = items.map((it, idx) => ({ ...it, id: `${it.id}-loop-${page}-${idx}` }));
          setItems(prev => [...prev, ...clones]);
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        return;
      }
      // if API returned a big list (non-paginated) and page>1, just append more slices
      if (data.length < pageSize && page === 2) {
        // first response was non-paginated; append more clones for infinite feel
        const clones = data.map((it: any, idx: number) => ({ ...it, id: `${it.id}-dup-${idx}` }));
        setItems(prev => [...prev, ...clones]);
        setLooping(true);
        setHasMore(true);
        return;
      }
      setItems(prev => [...prev, ...data]);
      setHasMore(data.length >= pageSize);
    })();
    return () => { mounted = false; };
  }, [page, fetchPage, items, looping, pageSize]);

  return (
    <section className="my-14">
      <div className="flex justify-between items-center mb-6 px-2 md:px-0">
        <h3 className="text-xl font-black text-gray-900">فید نامحدود</h3>
        <span className="text-sm text-gray-500">اسکرول کنید، کالاها تمام نمی‌شوند</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {items.map((p: Product, idx: number) => {
          const isLast = idx === items.length - 1;
          return (
            <div key={p.id} ref={isLast ? lastElementRef : null} className="bg-white rounded-[2rem] p-4 shadow-sm flex flex-col justify-between group">
              <a href={`/product/${p.id}`} className="block mb-3">
                <div className="w-full h-40 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden p-4">
                  <img src={p.image_url} alt={p.title} className="max-h-full max-w-full object-contain" />
                </div>
              </a>
              <div className="flex-1">
                <h4 className="text-xs font-black text-gray-900 mb-2 line-clamp-2">{p.title}</h4>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-right">
                  <div className="text-[11px] text-gray-400">قیمت</div>
                  <div className="text-sm font-black text-blue-600">{Number(p.base_sale_price).toLocaleString()} تومان</div>
                </div>
                <button onClick={() => addToCart(p)} className="bg-gray-900 text-white p-2 rounded-2xl text-xs">افزودن</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center mt-8">
        {loading && <div className="text-sm text-gray-500">در حال بارگذاری...</div>}
        {!hasMore && <div className="text-sm text-gray-400">تکمیل شد — برای نمایش بیشتر، صفحه را رفرش کنید</div>}
      </div>
    </section>
  );
}
