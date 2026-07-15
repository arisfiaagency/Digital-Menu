import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { defaultAppData } from "../src/data/default-data";
import { mihrakoCategories, mihrakoMenuItems } from "../src/data/mihrako-menu";
import { isReservedClientSlug, normalizeClientSlug } from "../src/lib/tenant";

// tsx does not auto-load .env.local.
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
  let client = "demo";
  let name = "";
  let sampleMenu = true;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--client") client = (argv[++i] || "").trim().toLowerCase();
    else if (arg === "--name") name = argv[++i] || "";
    else if (arg === "--sample-menu") sampleMenu = true;
    else if (arg === "--no-sample-menu") sampleMenu = false;
  }
  return {
    client: normalizeClientSlug(client) || "demo",
    name: name.trim(),
    sampleMenu
  };
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin env vars (FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY). Add them to .env.local."
  );
}

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey })
});

const db = getFirestore();
const now = Timestamp.now();

async function main() {
  const { client: slug, name, sampleMenu } = parseArgs(process.argv.slice(2));
  if (isReservedClientSlug(slug)) {
    throw new Error(`Slug "${slug}" is reserved. Choose a different client slug.`);
  }
  const displayName = name || (slug === "demo" ? "Demo Cafe" : slug === "mihrako" ? "Mihrako" : slug);
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const clientRef = db.collection("clients").doc(slug);
  const existing = await clientRef.get();

  await clientRef.set(
    {
      id: slug,
      name: displayName,
      slug,
      status: "active",
      defaultCurrency: defaultAppData.general.defaultCurrency,
      defaultLanguage: defaultAppData.general.defaultLanguage,
      createdAt: existing.exists ? existing.data()?.createdAt || now : now,
      updatedAt: now
    },
    { merge: true }
  );

  const general = {
    ...defaultAppData.general,
    restaurantName: { en: displayName, ar: displayName, ckb: displayName },
    updatedAt: now
  };

  const batch = db.batch();
  batch.set(clientRef.collection("settings").doc("general"), general, { merge: true });
  batch.set(clientRef.collection("settings").doc("menu"), { ...defaultAppData.menu, updatedAt: now }, { merge: true });
  batch.set(clientRef.collection("settings").doc("appearance"), { ...defaultAppData.appearance, updatedAt: now }, { merge: true });
  batch.set(
    clientRef.collection("settings").doc("qr"),
    { ...defaultAppData.qr, menuUrl: `${siteOrigin}/${slug}`, updatedAt: now },
    { merge: true }
  );
  batch.set(
    clientRef.collection("settings").doc("pos"),
    {
      tables: Array.from({ length: 8 }, (_, index) => ({
        id: `table-${index + 1}`,
        name: index < 6 ? `Indoor ${index + 1}` : `Outdoor ${index - 5}`,
        area: index < 6 ? "indoor" : "outdoor",
        displayOrder: index,
        isActive: true
      })),
      orders: {},
      updatedAt: now
    },
    { merge: true }
  );

  if (sampleMenu) {
    const categories = slug === "mihrako" ? mihrakoCategories : defaultAppData.categories;
    const menuItems = slug === "mihrako" ? mihrakoMenuItems : defaultAppData.menuItems;
    for (const category of categories) {
      const { id, ...data } = category;
      batch.set(clientRef.collection("categories").doc(id), { ...data, createdAt: now, updatedAt: now }, { merge: true });
    }
    for (const item of menuItems) {
      const { id, ...data } = item;
      batch.set(clientRef.collection("menuItems").doc(id), { ...data, createdAt: now, updatedAt: now }, { merge: true });
    }
  }

  await batch.commit();

  // Drop legacy root collections note is intentional — data now lives under clients/{slug}.
  console.log(`Seeded clients/${slug}`);
  console.log(`  Welcome: ${siteOrigin}/${slug}`);
  console.log(`  Menu:    ${siteOrigin}/${slug}/menu`);
  console.log(`  Admin:   ${siteOrigin}/${slug}/admin`);
  console.log(`  Sample menu: ${sampleMenu ? "yes" : "no (settings only)"}`);
  console.log("\nTip: create a tenant admin with:");
  console.log(`  npm run create-admin -- you@example.com secret --client ${slug}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
