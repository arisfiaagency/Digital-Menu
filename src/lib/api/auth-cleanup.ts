import type { Firestore } from "firebase-admin/firestore";

/** How many adminProfiles (platform + every cafe) reference this Auth UID. */
export async function countProfilesForUid(db: Firestore, uid: string): Promise<number> {
  let count = 0;
  const platform = await db.collection("adminProfiles").doc(uid).get();
  if (platform.exists) count += 1;

  const clients = await db.collection("clients").select().get();
  await Promise.all(
    clients.docs.map(async (client) => {
      const profile = await client.ref.collection("adminProfiles").doc(uid).get();
      if (profile.exists) count += 1;
    })
  );
  return count;
}

/**
 * Delete the Auth login only when this was the last adminProfiles doc for the UID.
 * Prevents wiping a shared login used by another cafe or the platform.
 */
export async function deleteAuthUserIfOrphaned(
  auth: { deleteUser: (uid: string) => Promise<void> },
  db: Firestore,
  uid: string
): Promise<"deleted" | "kept"> {
  const remaining = await countProfilesForUid(db, uid);
  if (remaining > 0) return "kept";
  await auth.deleteUser(uid).catch((err: { code?: string }) => {
    if (err?.code !== "auth/user-not-found") throw err;
  });
  return "deleted";
}
