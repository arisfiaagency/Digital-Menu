import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WelcomeApp } from "@/components/menu/welcome-app";
import { getPublicAppDataRest, getPublicClientRest } from "@/lib/firebase/rest";
import { localized } from "@/lib/i18n/config";
import { isReservedClientSlug } from "@/lib/tenant";

// Public welcome / front door for a cafe. Styled to match the cafe's locked menu
// design; a "View Menu" button leads into /{slug}/menu. Cached for 20s like the
// menu so admin edits (name, logo, hours) appear quickly.
export const revalidate = 20;

const THEME_PREPAINT = `(function(){try{var t=localStorage.getItem('stone-cafe-menu-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export async function generateMetadata({ params }: { params: Promise<{ clientSlug: string }> }): Promise<Metadata> {
  const { clientSlug } = await params;
  if (isReservedClientSlug(clientSlug)) return {};
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

export default async function ClientWelcomePage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  if (isReservedClientSlug(clientSlug)) notFound();
  const client = await getPublicClientRest(clientSlug);
  if (!client) notFound();
  const data = await getPublicAppDataRest(client.slug);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_PREPAINT }} />
      <WelcomeApp
        general={data.general}
        menu={data.menu}
        design={client.menuDesign ?? "classic"}
        accent={client.menuAccent}
        slug={client.slug}
      />
    </>
  );
}
