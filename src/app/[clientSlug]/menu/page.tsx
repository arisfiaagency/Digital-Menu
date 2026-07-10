import { notFound } from "next/navigation";
import { MenuApp } from "@/components/menu/menu-app";
import { getPublicAppDataRest, getPublicClientRest } from "@/lib/firebase/rest";

export const revalidate = 60;

export default async function ClientMenuPage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  const client = await getPublicClientRest(clientSlug);
  if (!client) notFound();
  const data = await getPublicAppDataRest(client.slug);
  return <MenuApp initialData={data} />;
}
