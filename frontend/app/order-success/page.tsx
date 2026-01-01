"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  CheckCircle, Package, ArrowLeft, 
  Home, ShoppingBag, Zap, ShieldCheck, FileText 
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // دریافت شماره سفارش از آدرس (URL) یا تولید یک شماره تصادفی برای نمایش
  const orderId = searchParams.get("id") || Math.floor(Math.random() * 90000) + 10000;
  const method = searchParams.get("method") || "credit";

  // وضعیت پیشرفت سفارش (به صورت نوار پیشرفت)
  const [progress, setProgress] = useState(20); // شروع از مرحله بسته‌بندی

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 100 ? prev + 10 : 100));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 font-black italic text-right" dir="rtl">
      
      <div className="max-w-xl w-full text-center space-y-10">
        
        {/* بخش انیمیشن موفقیت */}
        <div className="relative flex justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-32 h-32 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.3)] relative z-10"
          >
            <CheckCircle size={64} strokeWidth={3} />
          </motion.div>
          {/* افکت هاله پشت آیکون */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-0 w-32 h-32 bg-emerald-500 rounded-full blur-3xl -z-10"
          />
        </div>

        {/* متن تاییدیه سفارش */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h1 className="text-3xl md:text-4xl text-gray-900 leading-tight">سفارش شما با موفقیت ثبت شد!</h1>
          <p className="text-gray-400 font-bold leading-8 px-6">
            ممنون از اعتمادت به <span className="text-blue-600">MENTAL SHOP</span>. 
            {method === "credit" 
              ? " درخواست اعتبار شما تایید و کالا وارد مرحله بسته‌بندی شد." 
              : " تراکنش بانکی با موفقیت انجام و فاکتور شما صادر گردید."}
          </p>
        </motion.div>

        {/* کارت اطلاعات سفارش */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-xl space-y-6 relative overflow-hidden"
        >
          <div className="flex justify-between items-center border-b border-gray-50 pb-6">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 mb-1">شماره پیگیری سفارش:</p>
              <p className="text-xl text-gray-900 tracking-widest">#{orderId}</p>
            </div>
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
              <Package size={24} />
            </div>
          </div>

          {/* نوار پیشرفت */}
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="h-2 bg-blue-500 rounded-full mt-4"
          />

          <div className="flex justify-between items-center mt-4">
            <div className="text-[10px] text-gray-400 font-bold italic">
              <ShieldCheck size={16} className="text-emerald-500" /> ضمانت تحویل MENTAL
            </div>
            <div className="text-[10px] text-gray-400 font-bold italic">
              <Zap size={16} className="text-blue-500" /> تخصیص آنی اعتبار
            </div>
          </div>
        </motion.div>

        {/* دکمه‌های هدایت */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col md:flex-row gap-4"
        >
          <Link 
            href="/my-orders" 
            className="flex-1 bg-gray-900 text-white p-6 rounded-[2.2rem] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 text-sm active:scale-95"
          >
            <ShoppingBag size={20} />
            پیگیری در سفارشات من
          </Link>
          <Link 
            href="/" 
            className="flex-1 bg-white text-gray-900 border border-gray-100 p-6 rounded-[2.2rem] shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3 text-sm active:scale-95"
          >
            <Home size={20} />
            بازگشت به صفحه اصلی
          </Link>
        </motion.div>

      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black italic animate-pulse">در حال تایید نهایی...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
