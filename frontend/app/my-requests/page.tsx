"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ✅ آدرس بک‌اند (بدون https و بدون اسلش اضافی)
const IP_ADDRESS = "mental-shop-api.liara.run";

export default function MyRequestsList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`https://${IP_ADDRESS}/api/my-requests/`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setRequests(data);
      setLoading(false);
    })
    .catch(() => {
      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-black text-gray-400">
      در حال فراخوانی لیست پرونده‌ها...
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12" dir="rtl">
      <div className="max-w-2xl mx-auto">
        
        {/* هدر صفحه */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <span className="w-3 h-10 bg-blue-600 rounded-full"></span>
            پیگیری درخواست‌ها
          </h1>
          <Link href="/" className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white p-12 rounded-[3rem] text-center border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-black mb-6">هنوز هیچ درخواست اعتباری ثبت نکرده‌اید.</p>
            <Link href="/credit" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">ثبت اولین درخواست</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req: any) => (
              <Link 
                key={req.id} 
                href={`/my-requests/${req.tracking_code}`}
                className="block bg-white p-6 rounded-[2.5rem] border border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">کد رهگیری پرونده:</span>
                    <span className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{req.tracking_code}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-[10px] font-black ${
                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                    req.status === 'approved' ? 'bg-blue-100 text-blue-700' : 
                    req.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {req.status === 'pending' && 'در انتظار بررسی اولیه'}
                    {req.status === 'approved' && 'تایید شده (نیاز به مدارک)'}
                    {req.status === 'completed' && 'واریز نهایی شده'}
                    {req.status === 'rejected' && 'درخواست رد شده'}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 mb-1">مبلغ اعتبار:</span>
                    <span className="font-black text-gray-900">{Number(req.amount).toLocaleString()} تومان</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-gray-400 mb-1">بازپرداخت:</span>
                    <span className="font-black text-gray-900">{req.installments} ماهه</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
