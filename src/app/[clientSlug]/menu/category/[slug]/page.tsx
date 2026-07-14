import { notFound } from "next/navigation";
import { MenuApp } from "@/components/menu/menu-app";
import { getPublicAppDataRest, getPublicClientRest } from "@/lib/firebase/rest";

export const revalidate = 20;

export default async function ClientCategoryPage({ params }: { params: Promise<{ clientSlug: string; slug: string }> }) {
  const { clientSlug, slug } = await params;
  const client = await getPublicClientRest(clientSlug);
  if (!client) notFound();
  const data = await getPublicAppDataRest(client.slug);
  return <MenuApp initialCategorySlug={slug} initialData={data} />;
}
