import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Security headers via config (complements middleware)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Request-ID', value: crypto.randomUUID() },
        ],
      },
    ]
  },
};

export default nextConfig;
