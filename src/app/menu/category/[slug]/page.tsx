import { MenuApp } from "@/components/menu/menu-app";
import { getPublicAppDataRest } from "@/lib/firebase/rest";

export const revalidate = 60;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicAppDataRest();
  return <MenuApp initialCategorySlug={slug} initialData={data} />;
}
