import { QrDesigner, type QrPrintVariant } from "@/components/qr/qr-designer";

export default async function AdminQrPrintPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string; tables?: string }>;
}) {
  const { mode, tables } = await searchParams;
  const variant: QrPrintVariant = mode === "qr" ? "qr" : "design";
  // No fallback: if nothing was passed, print nothing rather than inventing a "Table 1" card.
  const tableLabels = (tables ?? "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 200);
  return <QrDesigner printMode printVariant={variant} tableLabels={tableLabels} />;
}
