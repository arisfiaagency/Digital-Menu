import { redirect } from "next/navigation";
import { clientAdminPath } from "@/lib/tenant";

export default async function ClientAdminIndexPage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  redirect(clientAdminPath(clientSlug, "/dashboard"));
}
