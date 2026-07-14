import type { AppData, Category, GeneralSettings, MenuItem } from "@/types/models";

export const defaultGeneralSettings: GeneralSettings = {
  restaurantName: {
    en: "Stone Cafe",
    ar: "ستون كافيه",
    ckb: "ستۆن کافێ"
  },
  description: {
    en: "Fresh coffee, warm meals, and desserts served all day.",
    ar: "قهوة طازجة ووجبات دافئة وحلويات طوال اليوم.",
    ckb: "قاوەی تازە، خواردنی گەرم و شیرینی لە درێژایی ڕۆژدا."
  },
  welcomeHeader: {
    en: "Welcome to",
    ar: "أهلاً بك في",
    ckb: "بەخێربێیت بۆ"
  },
  welcomeTagline: {
    en: "Freshly brewed, just for you",
    ar: "قهوة طازجة، خصيصاً لك",
    ckb: "قاوەی تازە، تایبەت بۆ تۆ"
  },
  logoUrl: "/stone-cafe-logo.jpg",
  phone: "+964 750 000 0000",
  whatsapp: "+9647500000000",
  email: "hello@stone-cafe.example",
  address: "Erbil, Kurdistan Region",
  googleMapsUrl: "https://maps.google.com",
  socialLinks: {
    instagram: "https://instagram.com"
  },
  defaultLanguage: "ckb",
  enabledLanguages: ["ckb", "ar", "en"],
  defaultCurrency: "IQD",
  serviceFeePercent: 10,
  openHour: 9,
  closeHour: 23
};

export const defaultMenuSettings = {
  showImages: true,
  showPrices: true,
  showCalories: true,
  showIngredients: true,
  showAllergens: true,
  showSoldOutItems: true,
  enableSearch: true,
  enableFilters: true,
  enableDarkMode: true
};

export const defaultAppearanceSettings = {
  primaryColor: "#0f766e",
  secondaryColor: "#be123c",
  font: "system",
  borderRadius: 8,
  cardStyle: "outlined" as const,
  headerLayout: "expanded" as const,
  menuLayout: "grid" as const,
  defaultTheme: "light" as const,
  cardDesign: "classic" as const,
  categoryNavStyle: "pills" as const,
  sectionHeaderStyle: "plain" as const,
  backgroundType: "preset" as const,
  backgroundColor: "#ffffff",
  backgroundGradientFrom: "#ecfdf5",
  backgroundGradientTo: "#ffffff",
  backgroundImageStyle: "cover" as const,
  backgroundOverlay: 45,
  backgroundPreset: "cafe",
  backgroundPattern: "cafe" as const,
  backgroundPatternColor: "#3f8a49",
  backgroundPatternAnimated: true,
  headerAlign: "left" as const,
  headerBackgroundType: "theme" as const,
  headerBackgroundColor: "#ffffff",
  headerGradientFrom: "#ecfdf5",
  headerGradientTo: "#ffffff",
  showContactRow: true,
  menuLogoStyle: "rounded" as const,
  openStatusStyle: "pill" as const,
  contactLayout: "inline" as const,
  contactChipStyle: "pill" as const,
  socialLinkStyle: "icons" as const,
  searchShape: "pill" as const,
  searchStyle: "outlined" as const,
  searchSize: "normal" as const,
  searchPlacement: "header" as const,
  searchIconPosition: "left" as const,
  searchWidth: "wide" as const,
  searchShowLabel: false,
  aboveCategory: "none" as const,
  promoColor: "#0f766e",
  welcomeAccentColor: "#A4D8A6",
  welcomeHeaderTextColor: "#A4D8A6",
  welcomeHelperTextColor: "#6b7280",
  welcomeThemeToggleStyle: "circle" as const,
  welcomeThemeIconStyle: "sunMoon" as const,
  welcomeLanguageStyle: "buttons" as const,
  welcomeCardStyle: "glass" as const,
  welcomeCardPattern: "none" as const,
  welcomeFormBlur: 24,
  welcomeFormTransparency: 15,
  welcomeBackgroundStyle: "gradient" as const,
  welcomeBackgroundColor: "#d7efd8",
  welcomeBackgroundGradientFrom: "#d7efd8",
  welcomeBackgroundGradientTo: "#86cc8a",
  welcomeBackgroundImageUrl: "",
  welcomeBackgroundImagePath: "",
  welcomeBackgroundMediaType: "image" as const,
  welcomeBackgroundPattern: "cafe" as const,
  welcomeBackgroundPatternColor: "#3f8a49"
};

export const defaultQrSettings = {
  menuUrl: "",
  foregroundColor: "#0f172a",
  backgroundColor: "#ffffff",
  includeLogo: false,
  title: {
    en: "Scan to View Our Menu",
    ar: "امسح الرمز لعرض قائمتنا",
    ckb: "کۆدەکە سکان بکە بۆ بینینی مینیو"
  },
  subtitle: {
    en: "Stone Cafe",
    ar: "ستون كافيه",
    ckb: "ستۆن کافێ"
  }
};

export const defaultCategories: Category[] = [
  category("breakfast", 1, "Breakfast", "الفطور", "نانی بەیانی"),
  category("hot-drinks", 2, "Hot Drinks", "مشروبات ساخنة", "خواردنەوەی گەرم"),
  category("cold-drinks", 3, "Cold Drinks", "مشروبات باردة", "خواردنەوەی سارد"),
  category("coffee", 4, "Coffee", "قهوة", "قاوە"),
  category("desserts", 5, "Desserts", "حلويات", "شیرینی"),
  category("sandwiches", 6, "Sandwiches", "سندويشات", "ساندویچ"),
  category("main-meals", 7, "Main Meals", "وجبات رئيسية", "خواردنی سەرەکی"),
  category("special-offers", 8, "Special Offers", "عروض خاصة", "داشکاندنی تایبەت")
];

export const defaultMenuItems: MenuItem[] = [
  item("iced-spanish-latte", "coffee", 1, "Iced Spanish Latte", "سبانيش لاتيه مثلج", "سپانیش لاتێی سارد", 5000, ["coffee", "cold"], true, true, true),
  item("americano", "coffee", 2, "Americano", "أمريكانو", "ئەمەریکانۆ", 3500, ["coffee", "hot"], true, false, false),
  item("cappuccino", "hot-drinks", 3, "Cappuccino", "كابتشينو", "کاپوچینۆ", 4500, ["coffee", "hot"], true, true, false),
  item("kurdish-tea", "hot-drinks", 4, "Kurdish Tea", "شاي كردي", "چای کوردی", 1500, ["tea"], false, true, false),
  item("fresh-orange-juice", "cold-drinks", 5, "Fresh Orange Juice", "عصير برتقال طازج", "شەربەتی پرتەقاڵی تازە", 4000, ["juice", "sugar-free"], false, false, true),
  item("classic-cheesecake", "desserts", 6, "Classic Cheesecake", "تشيز كيك كلاسيكي", "چیزکێکی کلاسیکی", 5500, ["dessert"], false, true, false),
  item("chicken-sandwich", "sandwiches", 7, "Grilled Chicken Sandwich", "سندويش دجاج مشوي", "ساندویچی مریشکی برژاو", 6500, ["chicken"], false, false, false),
  item("stone-breakfast", "breakfast", 8, "Stone Breakfast Plate", "طبق فطور ستون", "پلێتی نانی بەیانی ستۆن", 9000, ["breakfast"], true, false, false),
  item("lentil-soup", "main-meals", 9, "Lentil Soup", "شوربة عدس", "شۆربای نیسک", 3500, ["vegetarian"], false, false, false),
  item("family-offer", "special-offers", 10, "Family Coffee Set", "مجموعة قهوة عائلية", "سێتی قاوەی خێزان", 18000, ["offer"], true, false, true)
];

export const defaultAppData: AppData = {
  categories: defaultCategories,
  menuItems: defaultMenuItems,
  general: defaultGeneralSettings,
  menu: defaultMenuSettings,
  appearance: defaultAppearanceSettings,
  qr: defaultQrSettings
};

function category(slug: string, order: number, en: string, ar: string, ckb: string): Category {
  return {
    id: slug,
    slug,
    displayOrder: order,
    isActive: true,
    name: { en, ar, ckb },
    description: {
      en: `${en} selections`,
      ar: `اختيارات ${ar}`,
      ckb: `هەڵبژاردەکانی ${ckb}`
    }
  };
}

function item(
  id: string,
  categoryId: string,
  order: number,
  en: string,
  ar: string,
  ckb: string,
  price: number,
  tags: string[],
  featured: boolean,
  popular: boolean,
  isNew: boolean
): MenuItem {
  return {
    id,
    categoryId,
    displayOrder: order,
    name: { en, ar, ckb },
    description: {
      en: "Prepared fresh with selected ingredients.",
      ar: "يحضّر طازجاً بمكونات مختارة.",
      ckb: "بە پێکهاتەی هەڵبژێردراو بە تازەیی ئامادە دەکرێت."
    },
    ingredients: {
      en: tags.join(", "),
      ar: tags.join(", "),
      ckb: tags.join(", ")
    },
    basePrice: price,
    currency: "IQD",
    dietaryLabels: tags.filter((tag) => ["vegetarian", "vegan", "gluten-free", "sugar-free"].includes(tag)),
    allergens: tags.includes("dessert") ? ["Dairy"] : [],
    tags,
    variants: [
      {
        id: "regular",
        name: { en: "Regular", ar: "عادي", ckb: "ئاسایی" },
        price,
        isAvailable: true,
        displayOrder: 1
      }
    ],
    preparationMinutes: 10,
    calories: tags.includes("dessert") ? 420 : undefined,
    spicyLevel: 0,
    isAvailable: true,
    isSoldOut: false,
    isFeatured: featured,
    isPopular: popular,
    isNew
  };
}
