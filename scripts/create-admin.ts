import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Bootstrap an approved admin account. The Firestore rules only let an existing
// full admin create /adminProfiles documents, so the very first admin has to be
// created with the Admin SDK (which bypasses rules) — that's what this script is
// for. It creates (or updates) the Firebase Auth login, sets the platform admin
// custom claim, and writes the matching adminProfiles doc the login gate reads.
//
// Usage:
//   npm run create-admin -- [email] [password] [--client <slug>] [--role admin|employee] [--name "Display Name"]
// Defaults: rozh@gmail.com / 123456, platform-level admin.

// tsx does not auto-load .env.local, so pull the Admin SDK creds in ourselves.
function loadEnvLocal() {
  let raw = "";
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let client = "";
  let role: "admin" | "employee" = "admin";
  let name = "";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--client") client = (argv[++i] || "").trim().toLowerCase();
    else if (arg === "--role") role = argv[++i] === "employee" ? "employee" : "admin";
    else if (arg === "--name") name = argv[++i] || "";
    else positional.push(arg);
  }
  return {
    email: (positional[0] || "rozh@gmail.com").trim(),
    password: positional[1] || "123456",
    client,
    role,
    name
  };
}

async function main() {
  const { email, password, client, role, name } = parseArgs(process.argv.slice(2));

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars (FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY). Add them to .env.local."
    );
  }
  if (password.length < 6) throw new Error("Firebase passwords must be at least 6 characters.");

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const auth = getAuth();
  const db = getFirestore();

  // Create the auth login, or reuse + reset the password if it already exists.
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password, emailVerified: true, disabled: false });
    console.log(`Reused existing Auth user (password reset): ${uid}`);
  } catch (err) {
    if ((err as { code?: string }).code === "auth/user-not-found") {
      const created = await auth.createUser({ email, password, emailVerified: true });
      uid = created.uid;
      console.log(`Created Auth user: ${uid}`);
    } else {
      throw err;
    }
  }

  const displayName = name || email.split("@")[0];

  if (client) {
    // Tenant-scoped admin under clients/{slug}/adminProfiles/{uid}.
    await db
      .collection("clients")
      .doc(client)
      .collection("adminProfiles")
      .doc(uid)
      .set(
        {
          email,
          displayName,
          isAdmin: true,
          role,
          permissions: {},
          disabled: false,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    console.log(`Wrote clients/${client}/adminProfiles/${uid} (role: ${role}).`);
  } else {
    // Platform supervisor: root adminProfiles doc + admin custom claim so they
    // can sign in at /admin immediately.
    await auth.setCustomUserClaims(uid, { admin: true });
    await db
      .collection("adminProfiles")
      .doc(uid)
      .set(
        {
          email,
          displayName,
          isAdmin: true,
          role,
          permissions: {},
          disabled: false,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    console.log(`Wrote adminProfiles/${uid} and set { admin: true } claim (platform ${role}).`);
  }

  console.log("\n✅ Done.");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Scope:    ${client ? `client "${client}"` : "platform (/admin)"}`);
}

main().catch((error) => {
  console.error("\n❌ Failed to create admin:", error);
  process.exit(1);
});
