export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white border border-gray-100 shadow-sm rounded-[2.5rem] p-10 text-center w-full max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse mx-auto mb-6" />
        <p className="text-gray-500 font-black">در حال بارگذاری...</p>
      </div>
    </div>
  );
}
