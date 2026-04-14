import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/chat/stream",
        destination: `${backendUrl}/v1/chat/stream`,
      },
      {
        source: "/api/spatial/:path*",
        destination: `${backendUrl}/v1/spatial/:path*`,
      },
      {
        source: "/api/simulate",
        destination: `${backendUrl}/v1/simulate`,
      },
    ];
  },
};

export default nextConfig;