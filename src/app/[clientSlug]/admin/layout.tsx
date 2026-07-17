import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { TenantProvider } from "@/components/tenant-provider";
import { isClientServiceActive } from "@/lib/client-access";
import { getClientAccountRest } from "@/lib/firebase/rest";

export default async function ClientAdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const client = await getClientAccountRest(clientSlug);
  if (!client || !isClientServiceActive(client)) notFound();
  return (
    <TenantProvider clientSlug={client.slug}>
      <AdminShell>{children}</AdminShell>
    </TenantProvider>
  );
}
