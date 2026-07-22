import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuApp } from "@/components/menu/menu-app";
import { getPublicAppDataRest, getPublicClientRest } from "@/lib/firebase/rest";
import { localized } from "@/lib/i18n/config";

// Public customer-facing menu. The design + accent are locked on the cafe's
// client account (set by the platform admin at creation); content comes from the
// tenant's categories/items/settings. Cached for 20s so admin edits appear
// quickly without a per-visitor Firestore round-trip.
export const revalidate = 20;

// Flip the theme class before first paint so a returning dark-mode visitor
// doesn't see a flash of the light menu.
const THEME_PREPAINT = `(function(){try{var t=localStorage.getItem('stone-cafe-menu-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export async function generateMetadata({ params }: { params: Promise<{ clientSlug: string }> }): Promise<Metadata> {
  const { clientSlug } = await params;
  const client = await getPublicClientRest(clientSlug);
  if (!client) return {};
  const data = await getPublicAppDataRest(client.slug);
  const name = localized(data.general.restaurantName, data.general.defaultLanguage) || client.name;
  const description = localized(data.general.description, data.general.defaultLanguage);
  return {
    title: name,
    description: description || undefined,
    openGraph: { title: name, description: description || undefined }
  };
}

export default async function ClientMenuPage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  const client = await getPublicClientRest(clientSlug);
  if (!client) notFound();
  const data = await getPublicAppDataRest(client.slug);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_PREPAINT }} />
      <MenuApp initialData={data} design={client.menuDesign ?? "classic"} accent={client.menuAccent} />
    </>
  );
}
