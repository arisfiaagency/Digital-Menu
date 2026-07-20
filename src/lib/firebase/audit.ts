import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type Firestore
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getActiveClientSlug } from "@/lib/tenant";
import type { AuditChange, AuditLog } from "@/types/models";

// The person currently signed into the admin. Set once from the admin shell
// when the session resolves, so the data-layer helpers can attribute every
// write without threading the actor through each call site.
export type AuditActor = { uid?: string; name?: string; email?: string };

let currentActor: AuditActor | null = null;

export function setAuditActor(actor: AuditActor | null) {
  currentActor = actor;
}

export function getAuditActor(): AuditActor | null {
  return currentActor;
}

// The audit log is tenant-scoped: each cafe keeps its own append-only
// `clients/{slug}/auditLogs` collection, matching how the rest of the tenant
// data (categories, menuItems, settings…) is stored. Falls back to a root
// `auditLogs` only when no client slug is active (platform-level context).
function auditCollection(db: Firestore) {
  const slug = getActiveClientSlug();
  return slug ? collection(db, "clients", slug, "auditLogs") : collection(db, "auditLogs");
}

export type AuditInput = {
  action: string;
  entity: string;
  entityId?: string;
  label?: string;
  summary?: string;
  changes?: AuditChange[];
};

// Append one entry to the append-only `auditLogs` collection. Fire-and-forget:
// it never throws, so a logging hiccup (rules, offline…) can't break the actual
// admin action it records. Runs AFTER the underlying write has succeeded.
export async function logAudit(input: AuditInput): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const actor = currentActor;
  try {
    await addDoc(
      auditCollection(db),
      omitUndefined({
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        label: input.label,
        summary: input.summary,
        changes: input.changes && input.changes.length ? input.changes : undefined,
        actorUid: actor?.uid,
        actorName: actor?.name,
        actorEmail: actor?.email,
        at: new Date().toISOString(),
        createdAt: serverTimestamp()
      })
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Audit log write failed", error);
  }
}

// Shallow drop of undefined keys — Firestore rejects nested undefined. The only
// nested value here is `changes`, whose elements are always plain strings.
function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

export async function listAuditLogs(max = 400): Promise<AuditLog[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await getDocs(query(auditCollection(db), orderBy("createdAt", "desc"), limit(max)));
  return snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<AuditLog, "id">) }));
}

// --- diffing ------------------------------------------------------------

// Internal/technical keys never worth showing in the activity log.
const IGNORED_FIELDS = new Set(["id", "createdAt", "updatedAt", "imagePath", "logoPath", "coverImagePath"]);

// Compare two versions of an entity and return the human-visible field changes.
// Nested localized objects flatten to `name.en`, `name.ar`… so even a single
// letter edit surfaces as its own row.
export function buildChanges(before: unknown, after: unknown): AuditChange[] {
  const flatBefore = flatten(before);
  const flatAfter = flatten(after);
  const keys = new Set([...Object.keys(flatBefore), ...Object.keys(flatAfter)]);
  const changes: AuditChange[] = [];
  for (const key of keys) {
    if (isIgnored(key)) continue;
    const previous = flatBefore[key];
    const next = flatAfter[key];
    if (previous === next) continue;
    changes.push({ field: key, before: previous ?? "", after: next ?? "" });
  }
  return changes.sort((a, b) => a.field.localeCompare(b.field));
}

function isIgnored(field: string): boolean {
  if (IGNORED_FIELDS.has(field)) return true;
  return field.startsWith("imageHistory");
}

// Flatten a plain object one+ levels deep into { "a.b": "display" }. Arrays and
// primitives become a single display string leaf.
function flatten(value: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      flatten(entry, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  if (prefix) out[prefix] = display(value);
  return out;
}

function display(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return truncate(isImageUrl(value) ? basename(value) : value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (!value.length) return "";
    return truncate(value.map((entry) => (isPlainObject(entry) ? JSON.stringify(entry) : String(entry))).join(", "));
  }
  return truncate(JSON.stringify(value));
}

function isImageUrl(value: string): boolean {
  return /^https?:\/\//.test(value) && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(value);
}

function basename(value: string): string {
  const clean = value.split("?")[0];
  return clean.slice(clean.lastIndexOf("/") + 1) || clean;
}

function truncate(value: string, max = 120): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
