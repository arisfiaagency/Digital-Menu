import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { TenantProvider } from "@/components/tenant-provider";
import { isClientServiceActive } from "@/lib/client-access";
import { getClientAccountRest } from "@/lib/firebase/rest";
import { adminThemePrepaintScript } from "@/lib/admin-theme";

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
    <TenantProvider
      clientSlug={client.slug}
      qrEnabled={client.qrEnabled !== false}
      ratingEnabled={client.ratingEnabled !== false}
    >
      <script dangerouslySetInnerHTML={{ __html: adminThemePrepaintScript(client.slug) }} />
      <AdminShell>{children}</AdminShell>
    </TenantProvider>
  );
}
