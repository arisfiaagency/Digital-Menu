import type { Timestamp } from "firebase/firestore";

export type Locale = "en" | "ar" | "ckb";
export type Currency = "IQD" | "USD" | "EUR" | "TRY";
export type LocalizedText = Record<Locale, string>;
export type OptionalLocalizedText = Partial<Record<Locale, string>>;

export type Category = {
  id: string;
  name: LocalizedText;
  description: OptionalLocalizedText;
  slug: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type MenuVariant = {
  id: string;
  name: LocalizedText;
  price: number;
  isAvailable: boolean;
  displayOrder: number;
};

export type ImageHistoryEntry = {
  id: string;
  imageUrl: string;
  imagePath: string;
  createdAt: string;
  expiresAt: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: LocalizedText;
  description: OptionalLocalizedText;
  ingredients?: OptionalLocalizedText;
  flavor?: string;
  imageUrl?: string;
  imagePath?: string;
  imageHistory?: ImageHistoryEntry[];
  basePrice: number;
  discountPrice?: number;
  currency: Currency;
  preparationMinutes?: number;
  calories?: number;
  spicyLevel?: number;
  dietaryLabels: string[];
  allergens: string[];
  tags: string[];
  variants: MenuVariant[];
  isAvailable: boolean;
  isSoldOut: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isNew: boolean;
  displayOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type GeneralSettings = {
  restaurantName: LocalizedText;
  description: OptionalLocalizedText;
  logoUrl?: string;
  logoPath?: string;
  // Optional announcement shown in the "promo" above-category strip.
  promoText?: OptionalLocalizedText;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  googleMapsUrl?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    snapchat?: string;
  };
  defaultLanguage: Locale;
  enabledLanguages: Locale[];
  defaultCurrency: Currency;
  // POS service fee added to each bill, as a percentage (e.g. 10 = 10%).
  serviceFeePercent?: number;
  // Café opening hours (0–24, whole hours) used by the public Open/Closed badge.
  // Uniform across the week. Falls back to the defaults when unset.
  openHour?: number;
  closeHour?: number;
  updatedAt?: Timestamp;
};

export type MenuSettings = {
  showImages: boolean;
  showPrices: boolean;
  showCalories: boolean;
  showIngredients: boolean;
  showAllergens: boolean;
  showSoldOutItems: boolean;
  enableSearch: boolean;
  enableFilters: boolean;
  enableDarkMode: boolean;
  updatedAt?: Timestamp;
};

export type PosDiscountType = "amount" | "percent";
export type PosTableArea = "indoor" | "outdoor";

// Outline used when a table is drawn on the POS floor plan.
export type PosTableShape = "rounded" | "square" | "circle";

export type PosTable = {
  id: string;
  name: string;
  // Optional per-language names. When set for the active admin language they are
  // shown instead of `name` (which stays the English/canonical fallback).
  names?: OptionalLocalizedText;
  area: PosTableArea;
  displayOrder: number;
  isActive: boolean;
  // Optional floor-plan geometry. Coordinates/sizes are in logical units on a
  // fixed FLOOR_W x FLOOR_H canvas (see pos-manager). Absent = not placed yet;
  // the floor plan then auto-arranges the table in a default grid flow.
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  shape?: PosTableShape;
  rotation?: number;
  // Label font size in logical units (scales with the board). Optional.
  fontSize?: number;
};

// Non-table features drawn on the POS floor plan (pillars, walls, counters…).
// Purely visual reference — never tappable for orders.
export type PosShapeKind = "rectangle" | "circle" | "triangle" | "wall" | "door";

export type PosShape = {
  id: string;
  area: PosTableArea;
  kind: PosShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  label?: string;
  // Label font size in logical units (scales with the board). Optional.
  fontSize?: number;
};

export type PosOrderLine = {
  id: string;
  itemId: string;
  name: LocalizedText;
  variantId?: string;
  variantName?: LocalizedText;
  flavor?: string;
  quantity: number;
  unitPrice: number;
  currency: Currency;
};

export type PosTableOrder = {
  tableId: string;
  lines: PosOrderLine[];
  discountType: PosDiscountType;
  discountValue: number;
  // Who started the order (stamped when the first line is added). Carried into
  // the completed order so reports can show who took it.
  takenBy?: string;
  takenByUid?: string;
  updatedAt?: string;
};

export type PosCompletedOrder = {
  id: string;
  tableId: string;
  tableName: string;
  lines: PosOrderLine[];
  discountType: PosDiscountType;
  discountValue: number;
  subtotal: number;
  discountAmount: number;
  serviceFeeRate?: number;
  serviceFeeAmount?: number;
  total: number;
  currency: Currency;
  completedAt: string;
  // Who took the order (built it at the table) vs. who completed/closed it.
  takenBy?: string;
  takenByUid?: string;
  completedBy?: string;
  completedByUid?: string;
  status?: "completed" | "cancelled";
  cancelledAt?: string;
  cancelledByUid?: string;
};

export type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: Currency;
  date: string;
  note?: string;
  byWho: string;
  createdByUid?: string;
  createdByEmail?: string;
  status?: "active" | "cancelled";
  cancelledAt?: string;
  cancelledByUid?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type PosState = {
  tables: PosTable[];
  orders: Record<string, PosTableOrder>;
  shapes?: PosShape[];
  completedOrders?: PosCompletedOrder[];
  updatedAt?: Timestamp;
};

export type ThemeToggleStyle = "circle" | "pill" | "segmented";
export type ThemeIconStyle = "sunMoon" | "coffeeMoon" | "sparkles" | "contrast";

export type AdminRole = "admin" | "employee";

export type AdminFeature = "dashboard" | "categories" | "menuItems" | "pos" | "reports" | "expenses" | "settings";

export type AdminPermissions = Partial<Record<AdminFeature, boolean>>;

export type AdminProfile = {
  uid: string;
  email: string;
  username?: string;
  displayName?: string;
  isAdmin: boolean;
  role?: AdminRole;
  permissions?: AdminPermissions;
  disabled?: boolean;
  // The Main Admin (owner) of this cafe. Full admins run the cafe; the Main Admin
  // is the one with oversight — currently the only role that can read the cafe's
  // Activity Log. Only a Main Admin can grant/revoke it (enforced in firestore.rules).
  isMainAdmin?: boolean;
  createdAt?: Timestamp;
};

// --- Audit trail ---------------------------------------------------------
// Append-only accountability log: who changed what, and when. Written from the
// data layer (firestore.ts) on every mutating action; stored per cafe under
// clients/{slug}/auditLogs and readable by that cafe's Main Admin.

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "activate"
  | "deactivate"
  | "availability"
  | "reorder"
  | "cancel"
  | "complete";

export type AuditEntity = "category" | "menuItem" | "expense" | "order" | "settings" | "user";

// One changed field on an "update" — kept as short display strings so the log
// renders directly and never carries nested `undefined` into Firestore.
export type AuditChange = {
  field: string;
  before: string;
  after: string;
};

export type AuditLog = {
  id: string;
  action: AuditAction | string;
  entity: AuditEntity | string;
  entityId?: string;
  // Human-readable name of the thing acted on, at the time of the action.
  label?: string;
  // Optional freeform detail (e.g. "kept 4 items as Others").
  summary?: string;
  // Field-level before/after for edits.
  changes?: AuditChange[];
  // Who did it — resolved displayName → username → email when the action ran.
  actorUid?: string;
  actorName?: string;
  actorEmail?: string;
  // ISO timestamp captured client-side; createdAt is the Firestore server time.
  at?: string;
  createdAt?: Timestamp;
};

export type ClientStatus = "active" | "disabled";

// The customer-facing menu design ("skin"). Chosen by the platform admin when a
// cafe is created and locked afterwards — stored on the client account doc, which
// tenants cannot write (see firestore.rules). Each value maps to a distinct menu
// layout in src/components/menu/*.
export type MenuDesign =
  | "luxury"
  | "modern"
  | "classic"
  | "minimal"
  | "neon"
  | "gallery"
  | "chalkboard"
  | "tabs";

export type ClientSubscriptionPlan = "free" | "basic" | "pro" | "custom";
export type ClientSubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "none";

export type ClientSubscription = {
  plan: ClientSubscriptionPlan;
  price: number;
  currency: Currency;
  status: ClientSubscriptionStatus;
  period?: "monthly" | "yearly";
  /** When paid access ends (ISO). Extended by each monthly payment. */
  expiresAt?: string;
  note?: string;
};

export type ClientTrial = {
  startAt: string;
  endAt: string;
  days?: number;
};

export type ClientBilling = {
  amountPaid: number;
  amountOwed: number;
  currency: Currency;
};

/** Platform supervisor payment ledger entry (cafe subscription payments). */
export type PlatformPayment = {
  id: string;
  clientSlug: string;
  clientName: string;
  amount: number;
  currency: Currency;
  /** How many months of access this payment added. */
  monthsAdded?: number;
  /** Subscription expiry after applying this payment. */
  expiresAtAfter?: string;
  note?: string;
  amountPaidAfter: number;
  amountOwedAfter: number;
  recordedByEmail?: string;
  createdAt?: string;
};

export type ClientAccount = {
  id: string;
  name: string;
  slug: string;
  status: ClientStatus;
  ownerEmail?: string;
  defaultCurrency?: Currency;
  defaultLanguage?: Locale;
  /** Locked customer-menu design, chosen at creation by the platform admin. */
  menuDesign?: MenuDesign;
  /** Accent color (hex) tinting the locked design. Set at creation. */
  menuAccent?: string;
  /** Supervisor kill-switch (e.g. unpaid). Overrides trial/subscription access. */
  blocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  subscription?: ClientSubscription;
  trial?: ClientTrial;
  billing?: ClientBilling;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type AppData = {
  categories: Category[];
  menuItems: MenuItem[];
  general: GeneralSettings;
  menu: MenuSettings;
};
