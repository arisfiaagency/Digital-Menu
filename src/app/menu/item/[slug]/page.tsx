import { MenuItemDetail } from "@/components/menu/menu-item-detail";
import { getPublicAppDataRest } from "@/lib/firebase/rest";

export const revalidate = 60;

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicAppDataRest();
  return <MenuItemDetail itemId={slug} initialData={data} />;
}
