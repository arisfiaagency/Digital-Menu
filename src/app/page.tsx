import { WelcomeScreen } from "@/components/menu/welcome-screen";
import { getPublicAppDataRest } from "@/lib/firebase/rest";

export const revalidate = 60;

export default async function HomePage() {
  const data = await getPublicAppDataRest();
  return <WelcomeScreen initialSocial={data.general.socialLinks} />;
}
