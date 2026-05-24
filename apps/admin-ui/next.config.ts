import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bật standalone để Docker build hoạt động đúng
  output: "standalone",

  // Cho phép truy cập HMR từ các thiết bị cùng mạng LAN (điện thoại, tablet test)
  allowedDevOrigins: ["192.168.1.59", "localhost"],

  images: {
    // Bật unoptimized để serve ảnh local mà không cần qua image optimization proxy
    // Ảnh migration được lưu trong public/wp-content/uploads/
    // Relative path như /wp-content/uploads/... sẽ được resolve về base URL
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "mytholaptop.vn" },
      { protocol: "https", hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com" },
      { protocol: "https", hostname: "**.s3.eu-west-1.amazonaws.com" },
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
      // Các CDN phổ biến từ migration logs
      { protocol: "https", hostname: "cdn.nguyenkimmall.com" },
      { protocol: "https", hostname: "cdn2.fptshop.com.vn" },
      { protocol: "https", hostname: "file.hstatic.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
      { protocol: "https", hostname: "phucanhcdn.com" },
      { protocol: "https", hostname: "laptop88.vn" },
      { protocol: "https", hostname: "nguyencongpc.vn" },
      // Localhost cho dev - ảnh migration từ public/wp-content/uploads/
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
