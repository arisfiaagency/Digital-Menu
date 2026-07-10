import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the logo file is bundled with the Open Graph image route so it can
  // be read at runtime on Vercel (otherwise process.cwd()/public isn't traced).
  outputFileTracingIncludes: {
    "/opengraph-image": ["./public/stone-cafe-logo.jpg"]
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }
    ]
  }
};

export default nextConfig;
