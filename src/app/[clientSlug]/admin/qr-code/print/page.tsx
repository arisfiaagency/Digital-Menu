import { redirect } from "next/navigation";

export default async function ClientQrPrintRedirect({
  params,
  searchParams
}: {
  params: Promise<{ clientSlug: string }>;
  searchParams: Promise<{ mode?: string; tables?: string }>;
}) {
  const { clientSlug } = await params;
  const query = await searchParams;
  const qs = new URLSearchParams();
  qs.set("client", clientSlug);
  if (query.mode) qs.set("mode", query.mode);
  if (query.tables) qs.set("tables", query.tables);
  redirect(`/admin/qr-code/print?${qs.toString()}`);
}
