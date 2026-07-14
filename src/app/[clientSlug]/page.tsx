import { notFound } from "next/navigation";
import { WelcomeScreen } from "@/components/menu/welcome-screen";
import { getPublicAppDataRest, getPublicClientRest } from "@/lib/firebase/rest";
import { clientMenuPath } from "@/lib/tenant";

export const revalidate = 60;

export default async function ClientWelcomePage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  const client = await getPublicClientRest(clientSlug);
  if (!client) notFound();

  const data = await getPublicAppDataRest(client.slug);
  return (
    <WelcomeScreen
      initialGeneral={data.general}
      initialSocial={data.general.socialLinks}
      menuHref={clientMenuPath(client.slug)}
    />
  );
}
