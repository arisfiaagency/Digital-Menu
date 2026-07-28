import { adminThemePrepaintScript } from "@/lib/admin-theme";

// Applies the platform admin theme before first paint.
const themeScript = adminThemePrepaintScript("platform");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      {children}
    </>
  );
}
