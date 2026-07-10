import { notFound } from "next/navigation";

export default async function AdminQrPrintPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string; tables?: string }>;
}) {
  await searchParams;
  notFound();
}
