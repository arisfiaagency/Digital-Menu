import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";

// Accepts either an email (contains "@") or a username. Usernames are resolved
// to their email through the public `usernames` lookup collection.
export async function resolveLoginEmail(identifier: string): Promise<string> {
  const value = identifier.trim();
  if (!value) throw new Error("auth/invalid-credential");
  if (value.includes("@")) return value;
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase Authentication is not configured.");
  const snap = await getDoc(doc(db, "usernames", value.toLowerCase()));
  if (!snap.exists()) throw new Error("auth/invalid-credential");
  const email = snap.data().email;
  if (typeof email !== "string") throw new Error("auth/invalid-credential");
  return email;
}

export async function signInAdmin(identifier: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Authentication is not configured.");
  const email = await resolveLoginEmail(identifier);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const isAdmin = await verifyApprovedAdmin(credential.user.uid);
  if (!isAdmin) {
    await signOut(auth);
    throw new Error("This account is not approved for admin access.");
  }
  return credential.user;
}

export async function verifyApprovedAdmin(uid: string) {
  const db = getFirebaseDb();
  if (!db) return false;
  const profile = await getDoc(doc(db, "adminProfiles", uid));
  if (!profile.exists()) return false;
  const data = profile.data();
  return data.isAdmin === true && data.disabled !== true;
}

export async function logoutAdmin() {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
}

export async function changeAdminPassword(user: User, currentPassword: string, newPassword: string) {
  if (!user.email) throw new Error("The current admin account has no email address.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
