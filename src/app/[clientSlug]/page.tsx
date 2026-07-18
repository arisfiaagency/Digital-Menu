import { notFound } from "next/navigation";
import { WelcomeScreen } from "@/components/menu/welcome-screen";
import { getPublicClientRest, getPublicWelcomeDataRest } from "@/lib/firebase/rest";
import { isReservedClientSlug } from "@/lib/tenant";

export const revalidate = 20;

export default async function ClientWelcomePage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  if (isReservedClientSlug(clientSlug)) notFound();
  const client = await getPublicClientRest(clientSlug);
  if (!client) notFound();

  const data = await getPublicWelcomeDataRest(client.slug);
  return (
    <WelcomeScreen
      initialGeneral={data.general}
      initialSocial={data.general.socialLinks}
      initialAppearance={data.appearance}
      initialMenu={data.menu}
    />
  );
}
