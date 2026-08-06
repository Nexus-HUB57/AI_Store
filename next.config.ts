import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  reactStrictMode: true,
  poweredByHeader: false,

  // Security headers via config (complements middleware)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
