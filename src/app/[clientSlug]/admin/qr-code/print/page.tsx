import { QrDesigner } from "@/components/qr/qr-designer";

export default async function ClientQrPrintPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string; tables?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "qr" ? "qr" : "design";
  const tables = (params.tables || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return <QrDesigner printMode printVariant={mode} tableLabels={tables} />;
}
