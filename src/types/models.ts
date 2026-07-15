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
  coverImageUrl?: string;
  coverImagePath?: string;
  // Optional announcement shown in the "promo" above-category strip.
  promoText?: OptionalLocalizedText;
  // Optional headline on the public welcome page, e.g. "Welcome to".
  welcomeHeader?: OptionalLocalizedText;
  // Optional tagline on the public welcome page, e.g. "Freshly brewed, just for you".
  welcomeTagline?: OptionalLocalizedText;
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

export type MenuCardDesign = "classic" | "compact" | "overlay" | "minimal" | "poster";
export type CategoryNavStyle = "pills" | "underline" | "cards" | "segmented" | "minimal" | "iconOnly" | "bubble";
export type SectionHeaderStyle = "plain" | "divider" | "banner" | "centered" | "boxed" | "accent" | "numbered" | "overline";
export type MenuBackgroundType = "preset" | "solid" | "gradient" | "image" | "pattern";
export type HeaderAlign = "left" | "center";
export type HeaderBackgroundType = "theme" | "solid" | "gradient";
export type SearchShape = "pill" | "rounded" | "square" | "soft";
export type SearchStyle = "filled" | "outlined" | "glass" | "underline" | "shadow";
export type SearchSize = "compact" | "normal" | "large";
export type SearchPlacement = "header" | "sticky";
export type AboveCategoryRegion = "none" | "cover" | "promo" | "featured";
export type MenuLogoStyle = "rounded" | "circle" | "square" | "badge" | "wordmark";
export type OpenStatusStyle = "pill" | "compact" | "outline" | "card" | "banner";
export type ContactLayout = "inline" | "centered" | "stacked" | "grid";
export type ContactChipStyle = "pill" | "soft" | "outline" | "square" | "iconOnly";
export type SocialLinkStyle = "icons" | "soft" | "outline" | "square";
export type SearchIconPosition = "left" | "right" | "none";
export type SearchWidth = "normal" | "wide" | "full";
export type MenuBackgroundPattern =
  | "none"
  | "cafe"
  | "bakery"
  | "drinks"
  | "dessert"
  | "leaves"
  | "utensils"
  | "hearts"
  | "beans"
  | "sparkles"
  | "mixed"
  | "dots"
  | "grid"
  | "diagonal"
  | "waves"
  | "checker"
  | "confetti"
  | "stars"
  | "mesh"
  | "honeycomb"
  | "crosshatch"
  | "chevron"
  | "diamonds"
  | "plus"
  | "rings"
  | "rain"
  | "herringbone"
  | "bubbles"
  | "triangles"
  | "mosaic"
  | "circuit"
  | "polka"
  | "stripes"
  | "scatter";
export type MenuBackgroundImageStyle = "cover" | "contain" | "tile" | "fixed";
export type MenuFontPreset = "brand" | "modern" | "classic" | "soft" | "display" | "mono" | "rounded";
export type FontScale = "sm" | "md" | "lg";
export type HeadingWeight = "normal" | "semibold" | "bold" | "extrabold";
export type PageDensity = "cozy" | "comfortable" | "compact";
export type ContentWidth = "narrow" | "normal" | "wide";
export type ItemColumns = "auto" | "1" | "2" | "3";
export type PriceStyle = "plain" | "badge" | "large" | "tag";
export type MenuNavSurface = "solid" | "muted" | "tinted" | "transparent";
export type ImageAspect = "square" | "wide" | "tall" | "auto";
export type TitleCaseStyle = "normal" | "uppercase";
export type CardHoverStyle = "lift" | "glow" | "border" | "none";
export type CoverHeight = "sm" | "md" | "lg" | "xl";
export type MenuLanguageStyle = "globe" | "buttons" | "segmented" | "cards" | "minimal";
export type WelcomeLogoStyle = "circle" | "rounded" | "square";
export type WelcomeThemeToggleStyle = "circle" | "pill" | "segmented";
export type WelcomeThemeIconStyle = "sunMoon" | "coffeeMoon" | "sparkles" | "contrast";
export type WelcomeLanguageStyle = "buttons" | "segmented" | "cards" | "minimal";
export type WelcomeCardStyle = "glass" | "solid" | "outlined" | "floating";
/** Same pattern vocabulary as the menu background (floating icons + CSS textures). */
export type WelcomePattern = MenuBackgroundPattern;
export type WelcomeBackgroundStyle = "gradient" | "solid" | "pattern" | "image";
export type WelcomeEnterStyle = "pill" | "rounded" | "square" | "outline";
export type WelcomeCardWidth = "narrow" | "normal" | "wide";
export type WelcomeCardAlign = "center" | "bottom";

export type AppearanceSettings = {
  primaryColor: string;
  secondaryColor: string;
  font: string;
  borderRadius: number;
  cardStyle: "flat" | "outlined" | "elevated";
  headerLayout: "compact" | "expanded";
  menuLayout: "list" | "grid";
  defaultTheme: "light" | "dark";
  // Item-card layout. Drives the section layout too: compact ⇒ single-column
  // list, classic/overlay ⇒ grid. `cardStyle` above still modifies border/shadow.
  cardDesign?: MenuCardDesign;
  // Sticky category navigation presentation.
  categoryNavStyle?: CategoryNavStyle;
  // In-page section heading treatment.
  sectionHeaderStyle?: SectionHeaderStyle;
  // Public menu background. Fields are read per `backgroundType`.
  backgroundType?: MenuBackgroundType;
  backgroundColor?: string;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  backgroundImageUrl?: string;
  backgroundImagePath?: string;
  backgroundImageStyle?: MenuBackgroundImageStyle;
  // Dark scrim over an image background, 0–100 (%). Keeps menu text readable.
  backgroundOverlay?: number;
  // Which built-in preset when backgroundType === "preset". "cafe" = the
  // original animated food-icon layer.
  backgroundPreset?: string;
  backgroundPattern?: MenuBackgroundPattern;
  backgroundPatternColor?: string;
  backgroundPatternAnimated?: boolean;
  // Header (logo/name/description/contact row). `headerLayout` above controls
  // density; these control alignment, background, and the contact-chips row.
  headerAlign?: HeaderAlign;
  headerBackgroundType?: HeaderBackgroundType;
  headerBackgroundColor?: string;
  headerGradientFrom?: string;
  headerGradientTo?: string;
  showContactRow?: boolean;
  menuLogoStyle?: MenuLogoStyle;
  openStatusStyle?: OpenStatusStyle;
  contactLayout?: ContactLayout;
  contactChipStyle?: ContactChipStyle;
  socialLinkStyle?: SocialLinkStyle;
  // Search bar presentation.
  searchShape?: SearchShape;
  searchStyle?: SearchStyle;
  searchSize?: SearchSize;
  searchPlacement?: SearchPlacement;
  searchIconPosition?: SearchIconPosition;
  searchWidth?: SearchWidth;
  searchShowLabel?: boolean;
  // Region shown between the header and the sticky category nav.
  aboveCategory?: AboveCategoryRegion;
  promoColor?: string;
  // Distinctive UI knobs so each cafe can look different from the next.
  fontPreset?: MenuFontPreset;
  fontScale?: FontScale;
  headingWeight?: HeadingWeight;
  pageDensity?: PageDensity;
  contentWidth?: ContentWidth;
  itemColumns?: ItemColumns;
  priceStyle?: PriceStyle;
  priceColor?: string;
  navSurface?: MenuNavSurface;
  navActiveColor?: string;
  imageAspect?: ImageAspect;
  sectionTitleCase?: TitleCaseStyle;
  showCategoryIcons?: boolean;
  pageSurfaceColor?: string;
  cardSurfaceColor?: string;
  darkPageSurfaceColor?: string;
  darkCardSurfaceColor?: string;
  darkPrimaryColor?: string;
  headerTextColor?: string;
  headerMutedColor?: string;
  headerShowGlow?: boolean;
  cardHover?: CardHoverStyle;
  coverHeight?: CoverHeight;
  coverOverlay?: number;
  featuredNavStyle?: CategoryNavStyle;
  menuLanguageStyle?: MenuLanguageStyle;
  menuThemeToggleStyle?: WelcomeThemeToggleStyle;
  menuThemeIconStyle?: WelcomeThemeIconStyle;
  showCartButton?: boolean;
  // Welcome page presentation at /{clientSlug}.
  welcomeAccentColor?: string;
  welcomeHeaderTextColor?: string;
  welcomeHelperTextColor?: string;
  welcomeThemeToggleStyle?: WelcomeThemeToggleStyle;
  welcomeThemeIconStyle?: WelcomeThemeIconStyle;
  welcomeLanguageStyle?: WelcomeLanguageStyle;
  welcomeCardStyle?: WelcomeCardStyle;
  welcomeCardPattern?: WelcomePattern;
  welcomeFormColor?: string;
  welcomeFormTextColor?: string;
  welcomeFormBorderColor?: string;
  welcomeFormBlur?: number;
  welcomeFormTransparency?: number;
  welcomeBackgroundStyle?: WelcomeBackgroundStyle;
  welcomeBackgroundColor?: string;
  welcomeBackgroundGradientFrom?: string;
  welcomeBackgroundGradientTo?: string;
  welcomeBackgroundImageUrl?: string;
  welcomeBackgroundImagePath?: string;
  welcomeBackgroundMediaType?: "image" | "video";
  welcomeBackgroundPattern?: WelcomePattern;
  welcomeBackgroundPatternColor?: string;
  welcomeBackgroundOverlay?: number;
  welcomeLogoStyle?: WelcomeLogoStyle;
  welcomeShowSocialLinks?: boolean;
  welcomeEnterStyle?: WelcomeEnterStyle;
  welcomeCardWidth?: WelcomeCardWidth;
  welcomeCardAlign?: WelcomeCardAlign;
  showHeaderDescription?: boolean;
  updatedAt?: Timestamp;
};

export type QrSettings = {
  menuUrl: string;
  foregroundColor: string;
  backgroundColor: string;
  includeLogo: boolean;
  logoUrl?: string;
  title: LocalizedText;
  subtitle: OptionalLocalizedText;
  updatedAt?: Timestamp;
};

export type AdminRole = "admin" | "employee";

export type AdminFeature = "dashboard" | "categories" | "menuItems" | "pos" | "reports" | "expenses" | "qrCode" | "settings";

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
  createdAt?: Timestamp;
};

export type ClientStatus = "active" | "disabled";

export type ClientAccount = {
  id: string;
  name: string;
  slug: string;
  status: ClientStatus;
  ownerEmail?: string;
  defaultCurrency?: Currency;
  defaultLanguage?: Locale;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type AppData = {
  categories: Category[];
  menuItems: MenuItem[];
  general: GeneralSettings;
  menu: MenuSettings;
  appearance: AppearanceSettings;
  qr: QrSettings;
};
