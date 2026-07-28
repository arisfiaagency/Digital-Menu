import type { DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { normalizeClientSlug } from "@/lib/tenant";

type ProfileData = {
  isAdmin?: boolean;
  disabled?: boolean;
  role?: string;
} | null | undefined;

export function isFullAdminProfile(data: ProfileData) {
  return data?.isAdmin === true && data?.disabled !== true && data?.role !== "employee";
}

export function isApprovedStaffProfile(data: ProfileData) {
  return data?.isAdmin === true && data?.disabled !== true;
}

/** Platform full admin from Firestore profile — never JWT `admin` alone. */
export async function loadPlatformFullAdmin(db: Firestore, uid: string) {
  const snap = await db.collection("adminProfiles").doc(uid).get();
  return isFullAdminProfile(snap.data()) ? snap.data() : null;
}

export async function loadPlatformStaff(db: Firestore, uid: string) {
  const snap = await db.collection("adminProfiles").doc(uid).get();
  return isApprovedStaffProfile(snap.data()) ? snap.data() : null;
}

export function clientSlugFromClientsPath(path: string): string | null {
  const cleaned = path.replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned.includes("..") || cleaned.split("/").some((part) => !part || part === "." || part === "..")) {
    return null;
  }
  const match = cleaned.match(/^clients\/([^/]+)(?:\/|$)/);
  if (!match) return null;
  const slug = normalizeClientSlug(match[1]);
  if (!slug || slug !== match[1]) return null;
  return slug;
}

/**
 * Storage write access:
 * - platform full admins may write any clients/{slug}/… folder
 * - cafe staff may write only their own clients/{theirSlug}/… folder
 */
export async function authorizeStorageWrite(
  db: Firestore,
  decoded: DecodedIdToken,
  folderOrPath: string
): Promise<{ uid: string } | { error: NextResponse }> {
  const platform = await loadPlatformFullAdmin(db, decoded.uid);
  if (platform) return { uid: decoded.uid };

  const slug = clientSlugFromClientsPath(folderOrPath);
  if (!slug) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Uploads must use a clients/{slug}/ folder." },
        { status: 400 }
      )
    };
  }

  const profile = await db.collection("clients").doc(slug).collection("adminProfiles").doc(decoded.uid).get();
  if (isApprovedStaffProfile(profile.data())) return { uid: decoded.uid };

  return { error: NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 }) };
}
