import type { NextConfig } from "next";

const defaultClientSlug = (process.env.NEXT_PUBLIC_DEFAULT_CLIENT_SLUG || "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "");

const legacyAdminFeatures = [
  "dashboard",
  "categories",
  "menu-items",
  "pos",
  "reports",
  "expenses",
  "qr-code",
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
    const redirects = [
      ...legacyAdminFeatures.map((feature) => ({
        source: `/admin/${feature}`,
        destination: "/admin",
        permanent: false
      })),
      {
        source: "/admin/qr-code/print",
        destination: "/admin",
        permanent: false
      }
    ];

    if (defaultClientSlug) {
      redirects.push(
        { source: "/menu", destination: `/${defaultClientSlug}/menu`, permanent: false },
        { source: "/menu/category/:slug", destination: `/${defaultClientSlug}/menu/category/:slug`, permanent: false },
        { source: "/menu/item/:slug", destination: `/${defaultClientSlug}/menu/item/:slug`, permanent: false }
      );
    } else {
      redirects.push(
        { source: "/menu", destination: "/demo/menu", permanent: false },
        { source: "/menu/category/:slug", destination: "/demo/menu/category/:slug", permanent: false },
        { source: "/menu/item/:slug", destination: "/demo/menu/item/:slug", permanent: false }
      );
    }

    return redirects;
  }
};

export default nextConfig;
