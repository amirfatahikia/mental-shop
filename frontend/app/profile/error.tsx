"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="bg-white border border-gray-100 shadow-sm rounded-[2.5rem] p-10 text-center w-full max-w-md">
        <p className="text-gray-900 font-black text-lg mb-3">یه مشکلی پیش اومد 😕</p>
        <p className="text-gray-500 font-bold text-sm mb-6">لطفاً دوباره تلاش کن.</p>
        <button
          onClick={() => reset()}
          className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-600 transition-all"
        >
          تلاش مجدد
        </button>
      </div>
    </div>
  );
}
