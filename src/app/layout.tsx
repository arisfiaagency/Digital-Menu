import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const title = "Stone Cafe";
const description = "Fresh coffee, warm meals and desserts, served all day. Browse our full menu.";

export const metadata: Metadata = {
  // When NEXT_PUBLIC_SITE_URL is unset, Next falls back to the Vercel URL so the
  // generated Open Graph image still resolves to an absolute URL in production.
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title,
  description,
  icons: {
    icon: "/stone-cafe-logo.jpg",
    shortcut: "/stone-cafe-logo.jpg",
    apple: "/stone-cafe-logo.jpg"
  },
  openGraph: {
    type: "website",
    siteName: "Stone Cafe",
    title,
    description,
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title,
    description
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ckb" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
