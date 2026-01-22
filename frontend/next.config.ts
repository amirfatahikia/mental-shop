import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* تنظیمات اصلی برای دپلوی در لیارا */
  output: "standalone", 
  
  // اگر از تصاویر S3 لیارا استفاده می‌کنید، دامنه‌ها را اینجا اضافه کنید
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.liara.run',
      },
    ],
  },
};

export default nextConfig;