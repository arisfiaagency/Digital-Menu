import type { Metadata } from "next";
import { CafeFavicon } from "@/components/cafe-favicon";
import { cafeMetadataIcons } from "@/lib/cafe-favicon";
import { getPublicAppDataRest, getPublicClientRest } from "@/lib/firebase/rest";
import { localized } from "@/lib/i18n/config";
import { isReservedClientSlug } from "@/lib/tenant";

/**
 * Shared cafe shell: tab title/favicon come from the cafe's settings logo so
 * every public + admin page under /{slug} shows the right brand in the browser tab.
 */
export async function generateMetadata({
  params
}: {
  params: Promise<{ clientSlug: string }>;
}): Promise<Metadata> {
  const { clientSlug } = await params;
  if (isReservedClientSlug(clientSlug)) return {};
  const client = await getPublicClientRest(clientSlug);
  if (!client) return {};
  const data = await getPublicAppDataRest(client.slug);
  const name = localized(data.general.restaurantName, data.general.defaultLanguage) || client.name;
  return {
    title: {
      default: name,
      template: `%s · ${name}`
    },
    icons: cafeMetadataIcons(data.general.logoUrl)
  };
}

export default async function ClientSlugLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  let logoUrl: string | undefined;
  if (!isReservedClientSlug(clientSlug)) {
    const client = await getPublicClientRest(clientSlug);
    if (client) {
      const data = await getPublicAppDataRest(client.slug);
      logoUrl = data.general.logoUrl;
    }
  }
  return (
    <>
      <CafeFavicon logoUrl={logoUrl} />
      {children}
    </>
  );
}
