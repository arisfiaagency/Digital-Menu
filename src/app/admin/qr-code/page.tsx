import { PlatformSupervisor } from "@/components/admin/platform-supervisor";

/** Deep-link into supervisor QR Codes tab. */
export default function AdminQrCodePage() {
  return <PlatformSupervisor initialTab="qr" />;
}
