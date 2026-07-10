import { MenuApp } from "@/components/menu/menu-app";
import { getPublicAppDataRest } from "@/lib/firebase/rest";

export const revalidate = 60;

export default async function MenuPage() {
  const data = await getPublicAppDataRest();
  return <MenuApp initialData={data} />;
}
