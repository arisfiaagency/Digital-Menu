import { redirect } from "next/navigation";

/** QR generation moved to supervisor admin at /admin (QR Codes tab). */
export default function ClientQrCodePage() {
  redirect("/admin");
}
