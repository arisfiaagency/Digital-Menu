import type { AdminFeature, AdminPermissions, AdminProfile, AdminRole } from "@/types/models";

// The features an employee's access can be toggled per. Order is the order they
// appear in the admin nav and in the user-management toggles.
export const ADMIN_FEATURES: AdminFeature[] = [
  "dashboard",
  "categories",
  "menuItems",
  "pos",
  "reports",
  "expenses",
  "qrCode",
  "settings"
];

// Profiles without a stored role are the original full-access admins.
export function roleOf(profile: Pick<AdminProfile, "role"> | null | undefined): AdminRole {
  return profile?.role === "employee" ? "employee" : "admin";
}

export function canAccessFeature(
  profile: Pick<AdminProfile, "role" | "permissions"> | null | undefined,
  feature: AdminFeature
): boolean {
  if (!profile) return false;
  if (roleOf(profile) === "admin") return true;
  return profile.permissions?.[feature] === true;
}

export function canManageUsers(profile: Pick<AdminProfile, "role"> | null | undefined): boolean {
  return roleOf(profile) === "admin";
}

export function emptyPermissions(): AdminPermissions {
  return ADMIN_FEATURES.reduce<AdminPermissions>((acc, feature) => {
    acc[feature] = false;
    return acc;
  }, {});
}
