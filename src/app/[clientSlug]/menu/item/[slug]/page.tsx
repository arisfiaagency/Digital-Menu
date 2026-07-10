import { notFound } from "next/navigation";
import { MenuItemDetail } from "@/components/menu/menu-item-detail";
import { getPublicAppDataRest, getPublicClientRest } from "@/lib/firebase/rest";
import { clientMenuPath } from "@/lib/tenant";

export const revalidate = 60;

export default async function ClientItemPage({ params }: { params: Promise<{ clientSlug: string; slug: string }> }) {
  const { clientSlug, slug } = await params;
  const client = await getPublicClientRest(clientSlug);
  if (!client) notFound();
  const data = await getPublicAppDataRest(client.slug);
  return <MenuItemDetail itemId={slug} initialData={data} menuPath={clientMenuPath(client.slug)} />;
}
