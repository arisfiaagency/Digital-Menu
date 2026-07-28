import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getActiveClientSlug } from "@/lib/tenant";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

/**
 * Separate Auth persistence per surface:
 * - `platform` → supervisor `/admin`
 * - `client-{slug}` → that cafe's `/{slug}/admin` only
 * So logout on one cafe (or the supervisor) never clears another.
 * App names stay alphanumeric/hyphen (Firebase-safe).
 */
export type FirebaseAuthScope = "platform" | `client-${string}`;

const authCache = new Map<FirebaseAuthScope, Auth>();

export function getFirebaseConfig() {
  return firebaseConfig;
}

export function hasFirebaseClientConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  );
}

export function getFirebaseAuthScope(clientSlug?: string | null): FirebaseAuthScope {
  const slug = clientSlug === undefined ? getActiveClientSlug() : clientSlug;
  return slug ? `client-${slug}` : "platform";
}

export function getFirebaseApp(scope?: FirebaseAuthScope): FirebaseApp | null {
  if (!hasFirebaseClientConfig()) return null;
  const name = scope ?? getFirebaseAuthScope();
  const existing = getApps().find((app) => app.name === name);
  if (existing) return existing;
  return initializeApp(firebaseConfig, name);
}

export function getFirebaseAuth(scope?: FirebaseAuthScope) {
  const resolved = scope ?? getFirebaseAuthScope();
  const cached = authCache.get(resolved);
  if (cached) return cached;
  const app = getFirebaseApp(resolved);
  if (!app) return null;
  const auth = getAuth(app);
  authCache.set(resolved, auth);
  return auth;
}

export function getFirebaseDb(scope?: FirebaseAuthScope) {
  const app = getFirebaseApp(scope);
  return app ? getFirestore(app) : null;
}
