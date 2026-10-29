import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // /dashboard reads its page from a file at request time, so the build must ship it.
  outputFileTracingIncludes: {
    "/dashboard": ["./lib/lineup/lineup.html"],
  },

  async headers() {
    return [
      {
        source: "/login/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/api/lineup/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
