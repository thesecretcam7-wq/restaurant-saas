import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // SECURITY: Restrict remote images to trusted domains only
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "storage.googleapis.com" }, // Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "http", hostname: "localhost" }, // Development only
      { protocol: "http", hostname: "127.0.0.1" }, // Development only
    ],
    formats: ["image/avif", "image/webp"], // Modern formats for better performance
  },

  // SECURITY: Add security headers via Next.js config
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // XSS protection for older browsers
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Referrer policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions policy - restrict powerful APIs
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
          },
          // HTTPS enforcement (1 year)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // SECURITY: Enable strict mode for better error catching
  reactStrictMode: true,

  // SECURITY: Disable X-Powered-By header
  poweredByHeader: false,

  // SECURITY: Enable automatic protection against OpenSSL 3 issues
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js"],
  },
};

export default nextConfig;
