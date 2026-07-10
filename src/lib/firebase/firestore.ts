import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions
} from "firebase/firestore";
import { defaultAppData } from "@/data/default-data";
import { getFirebaseDb } from "@/lib/firebase/client";
import { removeImage } from "@/lib/supabase/storage";
import { slugify } from "@/lib/utils/format";
import type { AdminPermissions, AdminProfile, AdminRole, AppData, Category, Expense, MenuItem, OptionalLocalizedText, PosCompletedOrder, PosShape, PosShapeKind, PosState, PosTableArea, PosTableShape } from "@/types/models";

function converter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: T) {
      const data = { ...modelObject } as Partial<T>;
      delete data.id;
      return stripUndefined(data);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      return { id: snapshot.id, ...snapshot.data(options) } as T;
    }
  };
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)])
  ) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

const categoryConverter = converter<Category>();
const itemConverter = converter<MenuItem>();
const expenseConverter = converter<Expense>();
const completedOrderConverter = converter<PosCompletedOrder>();

const defaultPosState: PosState = {
  tables: Array.from({ length: 8 }, (_, index) => ({
    id: `table-${index + 1}`,
    name: index < 6 ? `Indoor ${index + 1}` : `Outdoor ${index - 5}`,
    area: index < 6 ? "indoor" : "outdoor",
    displayOrder: index,
    isActive: true
  })),
  orders: {},
  completedOrders: []
};

// Public menu data is fetched server-side via the Firestore REST API in
// src/lib/firebase/rest.ts (getPublicAppDataRest) so the Firebase SDK stays off
// the customer bundle. Do not add a client getPublicAppData back to public pages.

export async function getAdminAppData(): Promise<AppData> {
  const db = getFirebaseDb();
  if (!db) return defaultAppData;

  const [categorySnap, itemSnap, generalSnap, menuSnap, appearanceSnap, qrSnap] = await Promise.all([
    getDocs(query(collection(db, "categories").withConverter(categoryConverter), orderBy("displayOrder"), limit(200))),
    getDocs(query(collection(db, "menuItems").withConverter(itemConverter), orderBy("displayOrder"), limit(500))),
    getDoc(doc(db, "settings", "general")),
    getDoc(doc(db, "settings", "menu")),
    getDoc(doc(db, "settings", "appearance")),
    getDoc(doc(db, "settings", "qr"))
  ]);

  const menuItems = itemSnap.docs.map((entry) => entry.data());
  await Promise.all(menuItems.map((item) => pruneExpiredImageHistory(item, true)));

  return {
    categories: categorySnap.docs.map((entry) => entry.data()),
    menuItems: menuItems.map(withActiveImageHistory),
    general: generalSnap.exists() ? { ...defaultAppData.general, ...generalSnap.data() } : defaultAppData.general,
    menu: menuSnap.exists() ? { ...defaultAppData.menu, ...menuSnap.data() } : defaultAppData.menu,
    appearance: appearanceSnap.exists() ? { ...defaultAppData.appearance, ...appearanceSnap.data() } : defaultAppData.appearance,
    qr: qrSnap.exists() ? { ...defaultAppData.qr, ...qrSnap.data() } : defaultAppData.qr
  };
}

// --- Admin / employee user profiles ---

function toAdminProfile(uid: string, data: Record<string, unknown>): AdminProfile {
  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    username: typeof data.username === "string" ? data.username : undefined,
    displayName: typeof data.displayName === "string" ? data.displayName : undefined,
    isAdmin: data.isAdmin === true,
    role: data.role === "employee" ? "employee" : data.role === "admin" ? "admin" : undefined,
    permissions: (data.permissions as AdminPermissions | undefined) || undefined,
    disabled: data.disabled === true
  };
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

// Public username -> email lookup so the login screen can resolve a username to
// an email before the user is authenticated. Requires the `usernames` rule in
// firestore.rules to be deployed.
export async function getUsernameEmail(username: string): Promise<string | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, "usernames", normalizeUsername(username)));
  if (!snap.exists()) return null;
  const email = snap.data().email;
  return typeof email === "string" ? email : null;
}

export async function isUsernameAvailable(username: string, exceptUid?: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return true;
  try {
    const snap = await getDoc(doc(db, "usernames", normalizeUsername(username)));
    if (!snap.exists()) return true;
    return snap.data().uid === exceptUid;
  } catch {
    return true; // can't verify (rules not deployed yet) — don't block creation
  }
}

export async function claimUsername(username: string, email: string, uid: string) {
  const db = getFirebaseDb();
  if (!db || !username) return;
  await setDoc(doc(db, "usernames", normalizeUsername(username)), { email, uid });
}

export async function releaseUsername(username: string) {
  const db = getFirebaseDb();
  if (!db || !username) return;
  await deleteDoc(doc(db, "usernames", normalizeUsername(username)));
}

export async function getAdminProfile(uid: string): Promise<AdminProfile | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, "adminProfiles", uid));
  if (!snap.exists()) return null;
  return toAdminProfile(uid, snap.data());
}

export async function listAdminProfiles(): Promise<AdminProfile[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, "adminProfiles"));
  return snap.docs
    .map((entry) => toAdminProfile(entry.id, entry.data()))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function saveAdminProfile(profile: {
  uid: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermissions;
  username?: string;
  displayName?: string;
  disabled?: boolean;
}) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  // isAdmin stays true for every staff member so the current Firestore rules
  // grant them admin-data access; the role + permissions drive the UI gating.
  await setDoc(
    doc(db, "adminProfiles", profile.uid),
    stripUndefined({
      email: profile.email,
      username: profile.username ? normalizeUsername(profile.username) : undefined,
      displayName: profile.displayName,
      isAdmin: true,
      role: profile.role,
      permissions: profile.role === "employee" ? profile.permissions : {},
      disabled: profile.disabled === true,
      updatedAt: serverTimestamp()
    }),
    { merge: true }
  );
}

export async function setAdminProfileDisabled(uid: string, disabled: boolean) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  await updateDoc(doc(db, "adminProfiles", uid), { disabled, updatedAt: serverTimestamp() });
}

export async function deleteAdminProfile(uid: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  await deleteDoc(doc(db, "adminProfiles", uid));
}

export async function saveCategory(category: Category) {
  const db = getFirebaseDb();
  if (!db) return;
  const payload = {
    ...category,
    slug: category.slug || slugify(category.name.en),
    updatedAt: serverTimestamp(),
    createdAt: category.createdAt || serverTimestamp()
  };
  if (category.id) {
    await setDoc(doc(db, "categories", category.id).withConverter(categoryConverter), payload);
  } else {
    await addDoc(collection(db, "categories").withConverter(categoryConverter), payload);
  }
}

export async function deleteCategory(categoryId: string) {
  const db = getFirebaseDb();
  if (!db) return;
  await deleteDoc(doc(db, "categories", categoryId));
}

export async function updateCategoryActive(categoryId: string, isActive: boolean) {
  const db = getFirebaseDb();
  if (!db) return;
  await updateDoc(doc(db, "categories", categoryId), { isActive, updatedAt: serverTimestamp() });
}

export async function reorderCategories(updates: { id: string; displayOrder: number }[]) {
  const db = getFirebaseDb();
  if (!db || !updates.length) return;
  const batch = writeBatch(db);
  for (const update of updates) {
    batch.update(doc(db, "categories", update.id), { displayOrder: update.displayOrder, updatedAt: serverTimestamp() });
  }
  await batch.commit();
}

export async function saveMenuItem(item: MenuItem) {
  const db = getFirebaseDb();
  if (!db) return;
  await pruneExpiredImageHistory(item, false);
  const payload = {
    ...withActiveImageHistory(item),
    updatedAt: serverTimestamp(),
    createdAt: item.createdAt || serverTimestamp()
  };
  if (item.id) {
    await setDoc(doc(db, "menuItems", item.id).withConverter(itemConverter), payload);
  } else {
    await addDoc(collection(db, "menuItems").withConverter(itemConverter), payload);
  }
}

export async function updateMenuItemAvailability(itemId: string, isAvailable: boolean, isSoldOut?: boolean) {
  const db = getFirebaseDb();
  if (!db) return;
  const patch: Record<string, unknown> = { isAvailable, updatedAt: serverTimestamp() };
  if (typeof isSoldOut === "boolean") patch.isSoldOut = isSoldOut;
  await updateDoc(doc(db, "menuItems", itemId), patch);
}

export async function reorderMenuItems(updates: { id: string; displayOrder: number }[]) {
  const db = getFirebaseDb();
  if (!db || !updates.length) return;
  const batch = writeBatch(db);
  for (const update of updates) {
    batch.update(doc(db, "menuItems", update.id), { displayOrder: update.displayOrder, updatedAt: serverTimestamp() });
  }
  await batch.commit();
}

async function pruneExpiredImageHistory(item: MenuItem, persist: boolean) {
  const expired = (item.imageHistory || []).filter((entry) => isExpired(entry.expiresAt));
  if (!expired.length) return;
  await Promise.allSettled(expired.map((entry) => removeImage(entry.imagePath)));
  if (persist && item.id) {
    const db = getFirebaseDb();
    if (db) await updateDoc(doc(db, "menuItems", item.id), { imageHistory: withActiveImageHistory(item).imageHistory || [] });
  }
}

function withActiveImageHistory(item: MenuItem): MenuItem {
  return {
    ...item,
    imageHistory: (item.imageHistory || []).filter((entry) => !isExpired(entry.expiresAt))
  };
}

function isExpired(value: string) {
  return Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now();
}

export async function deleteMenuItem(itemId: string) {
  const db = getFirebaseDb();
  if (!db) return;
  await deleteDoc(doc(db, "menuItems", itemId));
}

export async function listExpenses(): Promise<Expense[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "expenses").withConverter(expenseConverter), orderBy("date", "desc"), limit(500)));
  return snap.docs.map((entry) => entry.data());
}

export async function saveExpense(expense: Expense) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  const payload = {
    ...expense,
    updatedAt: serverTimestamp(),
    createdAt: expense.createdAt || serverTimestamp()
  };
  if (expense.id) {
    await setDoc(doc(db, "expenses", expense.id).withConverter(expenseConverter), payload);
  } else {
    await addDoc(collection(db, "expenses").withConverter(expenseConverter), payload);
  }
}

export async function deleteExpense(expenseId: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  await deleteDoc(doc(db, "expenses", expenseId));
}

export async function cancelExpense(expenseId: string, cancelledByUid?: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  await updateDoc(doc(db, "expenses", expenseId), stripUndefined({
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    cancelledByUid,
    updatedAt: serverTimestamp()
  }));
}

export async function saveSettings(section: "general" | "menu" | "appearance" | "qr", value: Record<string, unknown>) {
  const db = getFirebaseDb();
  if (!db) return;
  await updateDoc(doc(db, "settings", section), { ...value, updatedAt: serverTimestamp() }).catch(async () => {
    await setDoc(doc(db, "settings", section), { ...value, updatedAt: serverTimestamp() });
  });
}

export async function getPosState(): Promise<PosState> {
  const db = getFirebaseDb();
  if (!db) return defaultPosState;
  const [snap, completedSnap] = await Promise.all([
    getDoc(doc(db, "settings", "pos")),
    getDocs(query(collection(db, "completedOrders").withConverter(completedOrderConverter), orderBy("completedAt", "desc"), limit(2000))).catch(() => null)
  ]);
  const state = snap.exists() ? normalizePosState(snap.data()) : defaultPosState;
  const storedOrders = completedSnap?.docs.map((entry) => entry.data()) || [];
  const mergedOrders = new Map<string, PosCompletedOrder>();
  for (const order of state.completedOrders || []) mergedOrders.set(order.id, order);
  for (const order of storedOrders) mergedOrders.set(order.id, order);
  return { ...state, completedOrders: [...mergedOrders.values()] };
}

export async function savePosState(state: PosState) {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(doc(db, "settings", "pos"), { ...serializePosState(state), updatedAt: serverTimestamp() }, { merge: true });
}

export async function completePosOrder(state: PosState, completedOrder: PosCompletedOrder) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  const batch = writeBatch(db);
  batch.set(doc(db, "settings", "pos"), { ...serializePosState(state), updatedAt: serverTimestamp() }, { merge: true });
  batch.set(doc(db, "completedOrders", completedOrder.id).withConverter(completedOrderConverter), completedOrder);
  await batch.commit();
}

export async function cancelCompletedOrder(order: PosCompletedOrder, cancelledByUid?: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  const cancelledOrder: PosCompletedOrder = {
    ...order,
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    cancelledByUid
  };
  const posRef = doc(db, "settings", "pos");
  const posSnap = await getDoc(posRef);
  const legacyOrders = posSnap.exists() && Array.isArray(posSnap.data().completedOrders)
    ? (posSnap.data().completedOrders as PosCompletedOrder[]).map((entry) => entry.id === order.id ? cancelledOrder : entry)
    : [];
  const batch = writeBatch(db);
  batch.set(doc(db, "completedOrders", order.id).withConverter(completedOrderConverter), cancelledOrder);
  if (legacyOrders.some((entry) => entry.id === order.id)) {
    batch.set(posRef, { ...stripUndefined({ completedOrders: legacyOrders }), updatedAt: serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

export async function deleteCompletedOrder(orderId: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  const posRef = doc(db, "settings", "pos");
  const posSnap = await getDoc(posRef);
  const legacyOrders = posSnap.exists() && Array.isArray(posSnap.data().completedOrders)
    ? (posSnap.data().completedOrders as PosCompletedOrder[]).filter((entry) => entry.id !== orderId)
    : [];
  const batch = writeBatch(db);
  batch.delete(doc(db, "completedOrders", orderId));
  if (posSnap.exists() && Array.isArray(posSnap.data().completedOrders)) {
    batch.set(posRef, { completedOrders: legacyOrders, updatedAt: serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

// Full-admin edit of a recorded sale (change lines/prices/discount). Writes the new order to the
// completedOrders collection and mirrors it into any legacy settings/pos.completedOrders entry.
export async function updateCompletedOrder(order: PosCompletedOrder) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  const posRef = doc(db, "settings", "pos");
  const posSnap = await getDoc(posRef);
  const batch = writeBatch(db);
  batch.set(doc(db, "completedOrders", order.id).withConverter(completedOrderConverter), order);
  if (posSnap.exists() && Array.isArray(posSnap.data().completedOrders)) {
    const legacyOrders = (posSnap.data().completedOrders as PosCompletedOrder[]);
    if (legacyOrders.some((entry) => entry.id === order.id)) {
      const merged = legacyOrders.map((entry) => (entry.id === order.id ? order : entry));
      batch.set(posRef, { ...stripUndefined({ completedOrders: merged }), updatedAt: serverTimestamp() }, { merge: true });
    }
  }
  await batch.commit();
}

function normalizePosState(value: unknown): PosState {
  const data = value && typeof value === "object" ? value as Partial<PosState> : {};
  const tables = Array.isArray(data.tables) && data.tables.length ? data.tables : defaultPosState.tables;
  const orders = data.orders && typeof data.orders === "object" ? data.orders : {};
  const shapes = Array.isArray(data.shapes) ? data.shapes : [];
  const completedOrders = Array.isArray(data.completedOrders) ? data.completedOrders : [];
  return {
    tables: tables
      .filter((table) => table && typeof table.id === "string" && typeof table.name === "string")
      .map((table, index) => ({
        id: table.id,
        name: table.name,
        area: normalizeTableArea(table.area),
        displayOrder: Number.isFinite(table.displayOrder) ? table.displayOrder : index,
        isActive: table.isActive !== false,
        ...(normalizeLocalizedNames(table.names) ? { names: normalizeLocalizedNames(table.names) } : {}),
        // Floor-plan geometry is optional; only carry values that are actually present.
        ...(Number.isFinite(table.x) ? { x: Number(table.x) } : {}),
        ...(Number.isFinite(table.y) ? { y: Number(table.y) } : {}),
        ...(Number.isFinite(table.w) ? { w: Number(table.w) } : {}),
        ...(Number.isFinite(table.h) ? { h: Number(table.h) } : {}),
        ...(isTableShape(table.shape) ? { shape: table.shape } : {}),
        ...(Number.isFinite(table.rotation) ? { rotation: Number(table.rotation) } : {}),
        ...(Number.isFinite(table.fontSize) ? { fontSize: Number(table.fontSize) } : {})
      })),
    shapes: shapes
      .filter((shape): shape is PosShape => Boolean(shape && typeof shape.id === "string"))
      .map((shape) => ({
        id: shape.id,
        area: normalizeTableArea(shape.area),
        kind: normalizeShapeKind(shape.kind),
        x: Number.isFinite(shape.x) ? Number(shape.x) : 0,
        y: Number.isFinite(shape.y) ? Number(shape.y) : 0,
        w: Number.isFinite(shape.w) ? Math.max(1, Number(shape.w)) : 100,
        h: Number.isFinite(shape.h) ? Math.max(1, Number(shape.h)) : 100,
        rotation: Number.isFinite(shape.rotation) ? Number(shape.rotation) : undefined,
        label: typeof shape.label === "string" ? shape.label : undefined,
        fontSize: Number.isFinite(shape.fontSize) ? Number(shape.fontSize) : undefined
      })),
    orders: Object.fromEntries(
      Object.entries(orders)
        .filter((entry): entry is [string, PosState["orders"][string]] => {
          const order = entry[1];
          return Boolean(order && typeof order === "object" && Array.isArray(order.lines));
        })
        .map(([tableId, order]) => {
          const normalizedOrder: PosState["orders"][string] = {
            tableId,
            lines: order.lines.filter((line) => line && typeof line.id === "string" && typeof line.itemId === "string"),
            discountType: order.discountType === "percent" ? "percent" : "amount",
            discountValue: Number.isFinite(order.discountValue) ? Math.max(0, order.discountValue) : 0
          };
          if (typeof order.takenBy === "string" && order.takenBy) normalizedOrder.takenBy = order.takenBy;
          if (typeof order.takenByUid === "string" && order.takenByUid) normalizedOrder.takenByUid = order.takenByUid;
          if (typeof order.updatedAt === "string") normalizedOrder.updatedAt = order.updatedAt;
          return [tableId, normalizedOrder];
        })
    ),
    completedOrders: completedOrders
      .filter((order) => order && typeof order.id === "string" && typeof order.tableId === "string" && Array.isArray(order.lines))
      .map((order) => ({
        id: order.id,
        tableId: order.tableId,
        tableName: typeof order.tableName === "string" ? order.tableName : order.tableId,
        lines: order.lines.filter((line) => line && typeof line.id === "string" && typeof line.itemId === "string"),
        discountType: order.discountType === "percent" ? "percent" : "amount",
        discountValue: Number.isFinite(order.discountValue) ? Math.max(0, order.discountValue) : 0,
        subtotal: Number.isFinite(order.subtotal) ? Math.max(0, order.subtotal) : 0,
        discountAmount: Number.isFinite(order.discountAmount) ? Math.max(0, order.discountAmount) : 0,
        serviceFeeRate: typeof order.serviceFeeRate === "number" && Number.isFinite(order.serviceFeeRate) ? Math.max(0, order.serviceFeeRate) : 0,
        serviceFeeAmount: typeof order.serviceFeeAmount === "number" && Number.isFinite(order.serviceFeeAmount) ? Math.max(0, order.serviceFeeAmount) : 0,
        total: Number.isFinite(order.total) ? Math.max(0, order.total) : 0,
        currency: order.currency || "IQD",
        completedAt: typeof order.completedAt === "string" ? order.completedAt : new Date().toISOString(),
        takenBy: typeof order.takenBy === "string" ? order.takenBy : undefined,
        takenByUid: typeof order.takenByUid === "string" ? order.takenByUid : undefined,
        completedBy: typeof order.completedBy === "string" ? order.completedBy : undefined,
        completedByUid: typeof order.completedByUid === "string" ? order.completedByUid : undefined,
        status: order.status === "cancelled" ? "cancelled" : "completed",
        cancelledAt: typeof order.cancelledAt === "string" ? order.cancelledAt : undefined,
        cancelledByUid: typeof order.cancelledByUid === "string" ? order.cancelledByUid : undefined
      }))
  };
}

function normalizeTableArea(value: unknown): PosTableArea {
  return value === "outdoor" ? "outdoor" : "indoor";
}

function isTableShape(value: unknown): value is PosTableShape {
  return value === "rounded" || value === "square" || value === "circle";
}

function normalizeShapeKind(value: unknown): PosShapeKind {
  return value === "rectangle" || value === "circle" || value === "triangle" || value === "wall" || value === "door"
    ? value
    : "rectangle";
}

function normalizeLocalizedNames(value: unknown): OptionalLocalizedText | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const names: OptionalLocalizedText = {};
  for (const locale of ["en", "ar", "ckb"] as const) {
    if (typeof source[locale] === "string" && source[locale]) names[locale] = source[locale] as string;
  }
  return Object.keys(names).length ? names : undefined;
}

function serializePosState(state: PosState) {
  const normalized = normalizePosState(state);
  // Order lines carry optional fields (variantId/variantName/flavor) that are `undefined` when a
  // plain item is added. Firestore rejects nested `undefined`, so strip them before writing. This
  // only walks plain objects/arrays, so any serverTimestamp() added by the caller is untouched.
  return stripUndefined({
    tables: normalized.tables,
    shapes: normalized.shapes ?? [],
    orders: Object.fromEntries(
      Object.entries(normalized.orders).map(([tableId, order]) => {
        const payload: PosState["orders"][string] = {
          tableId: order.tableId || tableId,
          lines: order.lines,
          discountType: order.discountType,
          discountValue: order.discountValue
        };
        if (typeof order.takenBy === "string" && order.takenBy) payload.takenBy = order.takenBy;
        if (typeof order.takenByUid === "string" && order.takenByUid) payload.takenByUid = order.takenByUid;
        if (typeof order.updatedAt === "string") payload.updatedAt = order.updatedAt;
        return [tableId, payload];
      })
    )
  });
}
