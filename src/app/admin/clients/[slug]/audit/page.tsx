import { SupervisorCafeAudit } from "@/components/admin/supervisor-cafe-audit";

export default async function SupervisorCafeAuditPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SupervisorCafeAudit slug={slug} />;
}
