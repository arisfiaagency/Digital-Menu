import { notFound } from "next/navigation";
import { QrDesigner, type QrPrintVariant } from "@/components/qr/qr-designer";
import { TenantProvider } from "@/components/tenant-provider";
import { normalizeClientSlug } from "@/lib/tenant";

export default async function AdminQrPrintPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string; tables?: string; client?: string }>;
}) {
  const params = await searchParams;
  const clientSlug = normalizeClientSlug(params.client || "");
  if (!clientSlug) notFound();
  const mode: QrPrintVariant = params.mode === "qr" ? "qr" : "design";
  const tables = (params.tables || "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  return (
    <TenantProvider clientSlug={clientSlug}>
      <QrDesigner printMode printVariant={mode} tableLabels={tables} printPath="/admin/qr-code/print" />
    </TenantProvider>
  );
}
