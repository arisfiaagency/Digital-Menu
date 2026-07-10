"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, hasFirebaseClientConfig } from "@/lib/firebase/client";
import { getAdminProfile } from "@/lib/firebase/firestore";
import { canAccessFeature, canManageUsers, roleOf } from "@/lib/admin/permissions";
import type { AdminFeature, AdminProfile } from "@/types/models";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      setProfile(null);
      return;
    }

    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      const nextProfile = nextUser ? await getAdminProfile(nextUser.uid) : null;
      setProfile(nextProfile);
      setLoading(false);
    });
  }, []);

  const approved = Boolean(profile && profile.isAdmin && !profile.disabled);

  const can = useCallback(
    (feature: AdminFeature) => (approved ? canAccessFeature(profile, feature) : false),
    [approved, profile]
  );

  return {
    user,
    loading,
    profile,
    // isAdmin = approved staff (admin OR employee). Use `role` to tell them apart.
    isAdmin: approved,
    role: roleOf(profile),
    canManageUsers: approved && canManageUsers(profile),
    can,
    isConfigured: hasFirebaseClientConfig()
  };
}
