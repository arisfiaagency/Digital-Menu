import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { defaultAppData } from "../src/data/default-data";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing Firebase Admin environment variables.");
}

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey })
});

const db = getFirestore();
const now = Timestamp.now();

async function main() {
  const batch = db.batch();

  for (const category of defaultAppData.categories) {
    const { id, ...data } = category;
    batch.set(db.collection("categories").doc(id), { ...data, createdAt: now, updatedAt: now });
  }

  for (const item of defaultAppData.menuItems) {
    const { id, ...data } = item;
    batch.set(db.collection("menuItems").doc(id), { ...data, createdAt: now, updatedAt: now });
  }

  batch.set(db.collection("settings").doc("general"), { ...defaultAppData.general, updatedAt: now });
  batch.set(db.collection("settings").doc("menu"), { ...defaultAppData.menu, updatedAt: now });
  batch.set(db.collection("settings").doc("appearance"), { ...defaultAppData.appearance, updatedAt: now });
  batch.set(db.collection("settings").doc("qr"), { ...defaultAppData.qr, updatedAt: now });

  await batch.commit();
  console.log("Seeded categories, menu items, and settings.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
