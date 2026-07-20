import type { Locale } from "@/types/models";

// The Activity Log stores each changed field as a raw dotted path (e.g. `name.ar`,
// `variants.0.name.ckb`, `basePrice`). These helpers turn that into human language
// for display — "Arabic name", "Variant 1 – Kurdish name", "Base price". Done at
// render time so OLD log entries are humanized too, not just new ones.

const LANGUAGE_LABELS: Record<Locale, Record<Locale, string>> = {
  en: { en: "English", ar: "Arabic", ckb: "Kurdish" },
  ar: { en: "الإنجليزية", ar: "العربية", ckb: "الكردية" },
  ckb: { en: "ئینگلیزی", ar: "عەرەبی", ckb: "کوردی" }
};

// Friendly names for every field that can appear in an audit diff (categories,
// menu items, expenses, settings sections, users). Unknown keys fall back to the
// English label, then to a prettified version of the raw key.
const FIELD_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    // shared / catalog
    name: "name",
    description: "description",
    ingredients: "ingredients",
    slug: "slug",
    icon: "icon",
    displayOrder: "display order",
    isActive: "active status",
    categoryId: "category",
    flavor: "flavor",
    imageUrl: "image",
    basePrice: "base price",
    discountPrice: "discount price",
    currency: "currency",
    preparationMinutes: "prep time",
    calories: "calories",
    spicyLevel: "spicy level",
    dietaryLabels: "dietary labels",
    allergens: "allergens",
    tags: "tags",
    variants: "variant",
    price: "price",
    isAvailable: "availability",
    isSoldOut: "sold-out status",
    isFeatured: "featured",
    isPopular: "popular",
    isNew: "new",
    // expense
    title: "title",
    category: "category",
    amount: "amount",
    date: "date",
    note: "note",
    byWho: "recorded by",
    status: "status",
    // settings · general
    restaurantName: "restaurant name",
    logoUrl: "logo",
    phone: "phone",
    whatsapp: "WhatsApp",
    email: "email",
    address: "address",
    googleMapsUrl: "Google Maps link",
    socialLinks: "social links",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    snapchat: "Snapchat",
    defaultLanguage: "default language",
    enabledLanguages: "enabled languages",
    defaultCurrency: "default currency",
    serviceFeePercent: "service fee %",
    openHour: "opening hour",
    closeHour: "closing hour",
    promoText: "promo text",
    // settings · menu
    showImages: "show images",
    showPrices: "show prices",
    showCalories: "show calories",
    showIngredients: "show ingredients",
    showAllergens: "show allergens",
    showSoldOutItems: "show sold-out items",
    enableSearch: "search",
    enableFilters: "filters",
    enableDarkMode: "dark mode",
    // user
    username: "username",
    displayName: "display name",
    role: "role",
    permissions: "permissions",
    disabled: "disabled",
    isMainAdmin: "main admin",
    isAdmin: "admin access",
    dashboard: "Dashboard",
    menuItems: "Menu items",
    pos: "POS",
    reports: "Reports",
    expenses: "Expenses",
    settings: "Settings"
  },
  ar: {
    name: "الاسم",
    description: "الوصف",
    ingredients: "المكوّنات",
    slug: "المعرّف",
    icon: "الأيقونة",
    displayOrder: "الترتيب",
    isActive: "حالة التفعيل",
    categoryId: "الفئة",
    flavor: "النكهة",
    imageUrl: "الصورة",
    basePrice: "السعر الأساسي",
    discountPrice: "سعر الخصم",
    currency: "العملة",
    preparationMinutes: "وقت التحضير",
    calories: "السعرات",
    spicyLevel: "درجة الحرارة",
    dietaryLabels: "الملصقات الغذائية",
    allergens: "مسببات الحساسية",
    tags: "الوسوم",
    variants: "الخيار",
    price: "السعر",
    isAvailable: "التوفّر",
    isSoldOut: "حالة النفاد",
    isFeatured: "مميّز",
    isPopular: "شائع",
    isNew: "جديد",
    title: "العنوان",
    category: "الفئة",
    amount: "المبلغ",
    date: "التاريخ",
    note: "ملاحظة",
    byWho: "سُجّل بواسطة",
    status: "الحالة",
    restaurantName: "اسم المطعم",
    logoUrl: "الشعار",
    phone: "الهاتف",
    whatsapp: "واتساب",
    email: "البريد الإلكتروني",
    address: "العنوان",
    googleMapsUrl: "رابط خرائط جوجل",
    socialLinks: "روابط التواصل",
    facebook: "فيسبوك",
    instagram: "إنستغرام",
    tiktok: "تيك توك",
    snapchat: "سناب شات",
    defaultLanguage: "اللغة الافتراضية",
    enabledLanguages: "اللغات المفعّلة",
    defaultCurrency: "العملة الافتراضية",
    serviceFeePercent: "نسبة رسوم الخدمة",
    openHour: "ساعة الفتح",
    closeHour: "ساعة الإغلاق",
    promoText: "نص العرض",
    showImages: "عرض الصور",
    showPrices: "عرض الأسعار",
    showCalories: "عرض السعرات",
    showIngredients: "عرض المكوّنات",
    showAllergens: "عرض مسببات الحساسية",
    showSoldOutItems: "عرض العناصر النافدة",
    enableSearch: "البحث",
    enableFilters: "الفلاتر",
    enableDarkMode: "الوضع الليلي",
    username: "اسم المستخدم",
    displayName: "الاسم الظاهر",
    role: "الدور",
    permissions: "الصلاحيات",
    disabled: "معطّل",
    isMainAdmin: "المشرف الرئيسي",
    isAdmin: "صلاحية الإدارة",
    dashboard: "لوحة التحكم",
    menuItems: "عناصر القائمة",
    pos: "نقطة البيع",
    reports: "التقارير",
    expenses: "المصاريف",
    settings: "الإعدادات"
  },
  ckb: {
    name: "ناو",
    description: "وەسف",
    ingredients: "پێکهاتەکان",
    slug: "ناونیشانی کورت",
    icon: "ئایکۆن",
    displayOrder: "ڕیزبەندی",
    isActive: "دۆخی چالاکی",
    categoryId: "پۆل",
    flavor: "تام",
    imageUrl: "وێنە",
    basePrice: "نرخی بنەڕەت",
    discountPrice: "نرخی داشکاندن",
    currency: "دراو",
    preparationMinutes: "کاتی ئامادەکردن",
    calories: "کالۆری",
    spicyLevel: "ئاستی تیژی",
    dietaryLabels: "پێناسە خۆراکییەکان",
    allergens: "هۆکارەکانی هەستیاری",
    tags: "تاگەکان",
    variants: "جۆر",
    price: "نرخ",
    isAvailable: "بەردەستی",
    isSoldOut: "دۆخی تەواوبوون",
    isFeatured: "تایبەت",
    isPopular: "بەناوبانگ",
    isNew: "نوێ",
    title: "ناونیشان",
    category: "پۆل",
    amount: "بڕ",
    date: "بەروار",
    note: "تێبینی",
    byWho: "تۆمارکراوە لەلایەن",
    status: "دۆخ",
    restaurantName: "ناوی چێشتخانە",
    logoUrl: "لۆگۆ",
    phone: "تەلەفۆن",
    whatsapp: "واتساپ",
    email: "ئیمەیڵ",
    address: "ناونیشان",
    googleMapsUrl: "بەستەری گووگڵ ماپ",
    socialLinks: "بەستەرەکانی سۆشیال",
    facebook: "فەیسبووک",
    instagram: "ئینستاگرام",
    tiktok: "تیکتۆک",
    snapchat: "سناپچات",
    defaultLanguage: "زمانی بنەڕەت",
    enabledLanguages: "زمانە چالاکەکان",
    defaultCurrency: "دراوی بنەڕەت",
    serviceFeePercent: "ڕێژەی کرێی خزمەت",
    openHour: "کاتژمێری کردنەوە",
    closeHour: "کاتژمێری داخستن",
    promoText: "دەقی بانگەشە",
    showImages: "پیشاندانی وێنەکان",
    showPrices: "پیشاندانی نرخەکان",
    showCalories: "پیشاندانی کالۆری",
    showIngredients: "پیشاندانی پێکهاتەکان",
    showAllergens: "پیشاندانی هەستیارییەکان",
    showSoldOutItems: "پیشاندانی تەواوبووەکان",
    enableSearch: "گەڕان",
    enableFilters: "فلتەرەکان",
    enableDarkMode: "دۆخی تاریک",
    username: "ناوی بەکارهێنەر",
    displayName: "ناوی پیشاندان",
    role: "ڕۆڵ",
    permissions: "دەسەڵاتەکان",
    disabled: "ناچالاک",
    isMainAdmin: "بەڕێوەبەری سەرەکی",
    isAdmin: "دەسەڵاتی بەڕێوەبردن",
    dashboard: "داشبۆرد",
    menuItems: "بابەتەکانی مێنیو",
    pos: "خاڵی فرۆشتن",
    reports: "ڕاپۆرتەکان",
    expenses: "خەرجییەکان",
    settings: "ڕێکخستنەکان"
  }
};

// Booleans/toggles read better as On/Off than "true/false".
const BOOL_LABELS: Record<Locale, { true: string; false: string }> = {
  en: { true: "On", false: "Off" },
  ar: { true: "مُفعّل", false: "مُعطّل" },
  ckb: { true: "چالاک", false: "ناچالاک" }
};

const LANGUAGE_CODES = new Set<Locale>(["en", "ar", "ckb"]);

function labelFor(segment: string, locale: Locale): string {
  const dict = FIELD_LABELS[locale] || FIELD_LABELS.en;
  return dict[segment] || FIELD_LABELS.en[segment] || prettify(segment);
}

function prettify(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .trim();
}

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function combineLang(fieldLabel: string, langLabel: string, locale: Locale): string {
  // English reads "Arabic name"; Arabic/Kurdish read "الاسم (العربية)".
  return locale === "en" ? `${langLabel} ${fieldLabel}` : `${fieldLabel} (${langLabel})`;
}

// Turn a raw field path into a human-readable, localized label.
//   name.ar               -> "Arabic name"
//   variants.0.name.ckb   -> "Variant 1 – Kurdish name"
//   basePrice             -> "Base price"
export function humanizeAuditField(field: string, locale: Locale = "en"): string {
  if (!field) return "";
  const segments = field.split(".").filter(Boolean);

  // Pull a trailing language qualifier (e.g. the `ar` in `name.ar`).
  let lang: Locale | null = null;
  const last = segments[segments.length - 1];
  if (last && LANGUAGE_CODES.has(last as Locale)) {
    lang = last as Locale;
    segments.pop();
  }

  const parts: string[] = [];
  for (const segment of segments) {
    if (/^\d+$/.test(segment)) {
      // Array index — belongs to the label just before it: "variant" + "0" -> "variant 1".
      const position = Number(segment) + 1;
      if (parts.length) parts[parts.length - 1] = `${parts[parts.length - 1]} ${position}`;
      else parts.push(`#${position}`);
      continue;
    }
    parts.push(labelFor(segment, locale));
  }

  if (!parts.length) {
    return lang ? capitalizeMaybe(LANGUAGE_LABELS[locale][lang], locale) : field;
  }

  if (lang) {
    const leaf = parts.pop() as string;
    parts.push(combineLang(leaf, LANGUAGE_LABELS[locale][lang], locale));
  }

  return capitalizeMaybe(parts.join(" – "), locale);
}

function capitalizeMaybe(value: string, locale: Locale): string {
  // Only Latin script benefits from capitalization.
  return locale === "en" ? capitalizeFirst(value) : value;
}

// Make stored diff values friendlier (booleans -> On/Off). Everything else is
// already real text (names, prices, currencies…) and passes through untouched.
export function humanizeAuditValue(value: string, locale: Locale = "en"): string {
  if (value === "true" || value === "false") {
    return BOOL_LABELS[locale]?.[value] ?? BOOL_LABELS.en[value];
  }
  return value;
}
