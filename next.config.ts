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
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }
    ]
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
