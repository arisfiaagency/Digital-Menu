import { redirect } from "next/navigation";

/** Supervisor home opens the summary dashboard. */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
