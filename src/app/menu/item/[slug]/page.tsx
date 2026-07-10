import { notFound } from "next/navigation";

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  notFound();
}
