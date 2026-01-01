"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InstallmentsList() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }

    fetch("http://127.0.0.1:8000/api/my-installments/", {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setInstallments(data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, [router]);

  const handlePayment = async (id: number) => {
    alert("در حال اتصال به درگاه پرداخت برای قسط شماره " + id);
    // منطق اتصال به درگاه اینجا قرار می‌گیرد
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black">در حال بارگذاری لیست اقساط...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-12" dir="rtl">
      <div className="max-w-3xl mx-auto">
        
        <header className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-black text-gray-900">💸 مدیریت اقساط</h1>
            <button onClick={() => router.push("/")} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 font-bold text-sm">بازگشت</button>
        </header>

        {installments.length === 0 ? (
          <div className="bg-white p-12 rounded-[3rem] text-center border-2 border-dashed border-gray-200">
            <p className="font-bold text-gray-400">شما در حال حاضر هیچ قسط فعالی ندارید.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {installments.map((inst: any) => {
              // منطق دیرکرد
              const isOverdue = new Date() > new Date(inst.due_date) && !inst.is_paid;
              
              return (
                <div key={inst.id} className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col md:flex-row justify-between items-center gap-4 ${
                  inst.is_paid ? 'border-green-100 bg-green-50/30' : 
                  isOverdue ? 'border-red-100 bg-red-50/30 animate-pulse' : 'border-gray-50 bg-white shadow-sm'
                }`}>
                  
                  <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${
                      inst.is_paid ? 'bg-green-500 text-white' : isOverdue ? 'bg-red-500 text-white' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <span className="text-[10px] opacity-70">قسط</span>
                      <span className="text-xl">{inst.installment_number}</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-900 font-black text-lg">
                          {(inst.amount + inst.penalty).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">تومان</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-[10px] text-gray-400 font-bold">📅 سررسید: {inst.due_date}</span>
                        {/* نمایش کد رهگیری وام برای اینکه کاربر بداند این قسط مربوط به کدام خرید است */}
                        <span className="text-[10px] text-blue-400 font-bold">🆔 کد وام: {inst.tracking_code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-auto text-left">
                    {inst.is_paid ? (
                      <div className="flex items-center gap-2 text-green-600 bg-green-100 px-4 py-2 rounded-2xl">
                        <span className="text-xs font-black">پرداخت شده</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {inst.penalty > 0 && (
                          <div className="flex flex-col items-end">
                            <span className="text-red-600 text-[10px] font-black">جریمه دیرکرد</span>
                            <span className="text-red-600 font-black text-xs">{inst.penalty.toLocaleString()} ت</span>
                          </div>
                        )}
                        <button 
                          onClick={() => handlePayment(inst.id)}
                          className={`px-8 py-4 rounded-2xl font-black text-sm shadow-lg transition-all ${
                            isOverdue ? 'bg-red-600 text-white shadow-red-100' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'
                          }`}
                        >
                          پرداخت قسط
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}