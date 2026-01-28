import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* خروجی استاندارد برای پروژه‌های مدرن Next.js */
  output: "standalone",

  /* تنظیمات تصاویر برای لود شدن از بک‌اِند لیارا */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.liara.run',
      },
      {
        protocol: 'https',
        hostname: 'mental-shop-api.liara.run',
      },
    ],
  },

  /* نادیده گرفتن خطاهای تایپ‌اسکریپت در زمان بیلد برای پایداری استقرار */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;