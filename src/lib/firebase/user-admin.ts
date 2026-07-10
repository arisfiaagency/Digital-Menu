import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { getFirebaseAuth, getFirebaseConfig, hasFirebaseClientConfig } from "@/lib/firebase/client";

// Create the Firebase Auth account for a new staff member without signing the
// current admin out. We spin up a throwaway secondary Firebase app, create the
// user there, sign that app out, then delete it. The caller writes the matching
// adminProfiles/{uid} document (which the admin is allowed to do by the rules).
export async function createStaffAuthUser(email: string, password: string): Promise<string> {
  if (!hasFirebaseClientConfig()) throw new Error("Firebase Authentication is not configured.");

  const secondaryApp = initializeApp(getFirebaseConfig(), `staff-create-${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);
    return credential.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

// Ask the server to fully delete a staff account (Auth login + username mapping +
// adminProfiles doc) using the Admin SDK. Returns false when the Admin SDK isn't
// configured (HTTP 503) so the caller can fall back to client-side Firestore
// cleanup, which still removes their access but leaves the Auth login behind.
export async function deleteStaffAccount(uid: string): Promise<boolean> {
  const auth = getFirebaseAuth();
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error("You must be signed in to remove a user.");

  const res = await fetch("/api/admin/users", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uid })
  });

  if (res.status === 503) return false;

  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to delete user.");
  }
  return true;
}
