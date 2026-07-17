import { PlatformSupervisor } from "@/components/admin/platform-supervisor";

/** Deep-link into supervisor payment reports. */
export default function AdminPaymentsPage() {
  return <PlatformSupervisor initialTab="payments" />;
}
