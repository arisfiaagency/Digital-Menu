import type { NextConfig } from "next";

const legacyAdminFeatures = [
  "dashboard",
  "categories",
  "menu-items",
  "pos",
  "reports",
  "expenses",
  "settings",
  "users"
];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    // Practical CSP: allow this app, Firebase, R2 images, and QZ Tray print bridge.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://*.r2.dev https://*.r2.cloudflarestorage.com",
      "frame-src 'self' blob:",
      "worker-src 'self' blob:"
    ].join("; ")
  }
];

const nextConfig: NextConfig = {
  // Make sure the logo file is bundled with the Open Graph image route so it can
  // be read at runtime on Vercel (otherwise process.cwd()/public isn't traced).
  outputFileTracingIncludes: {
    "/opengraph-image": ["./public/site-icon.png"]
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  },
  async redirects() {
    return legacyAdminFeatures.map((feature) => ({
      source: `/admin/${feature}`,
      destination: "/admin",
      permanent: false
    }));
  }
};

export default nextConfig;
