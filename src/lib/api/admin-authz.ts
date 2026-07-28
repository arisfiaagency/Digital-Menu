import type { DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { normalizeClientSlug } from "@/lib/tenant";

type ProfileData = {
  isAdmin?: boolean;
  disabled?: boolean;
  role?: string;
  permissions?: Record<string, boolean>;
} | null | undefined;

export function isFullAdminProfile(data: ProfileData) {
  return data?.isAdmin === true && data?.disabled !== true && data?.role !== "employee";
}

export function isApprovedStaffProfile(data: ProfileData) {
  return data?.isAdmin === true && data?.disabled !== true;
}

function hasFeature(data: ProfileData, feature: string) {
  if (isFullAdminProfile(data)) return true;
  if (!isApprovedStaffProfile(data)) return false;
  return data?.permissions?.[feature] === true;
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

/** Map upload folder under clients/{slug}/… to the feature that may write it. */
export function storageFeatureForPath(folderOrPath: string): "menuItems" | "settings" | "categories" | null {
  const cleaned = folderOrPath.replace(/^\/+|\/+$/g, "");
  const match = cleaned.match(/^clients\/[^/]+\/([^/]+)/);
  const folder = match?.[1] || "";
  if (folder === "menu-items") return "menuItems";
  if (folder === "branding" || folder === "settings" || folder === "invoice") return "settings";
  if (folder === "categories") return "categories";
  return null;
}

/**
 * Storage write access:
 * - platform full admins may write only under clients/{slug}/…
 * - cafe full admins may write their cafe folder
 * - cafe employees need the matching feature (menuItems / settings / categories)
 */
export async function authorizeStorageWrite(
  db: Firestore,
  decoded: DecodedIdToken,
  folderOrPath: string
): Promise<{ uid: string } | { error: NextResponse }> {
  const slug = clientSlugFromClientsPath(folderOrPath);
  if (!slug) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Uploads must use a clients/{slug}/ folder." },
        { status: 400 }
      )
    };
  }

  const feature = storageFeatureForPath(folderOrPath);
  if (!feature) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Upload folder is not allowed." },
        { status: 400 }
      )
    };
  }

  const platform = await loadPlatformFullAdmin(db, decoded.uid);
  if (platform) return { uid: decoded.uid };

  const profile = await db.collection("clients").doc(slug).collection("adminProfiles").doc(decoded.uid).get();
  const data = profile.data();
  if (hasFeature(data, feature)) return { uid: decoded.uid };

  return { error: NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 }) };
}
