import type { AppData, Category, ClientAccount, Currency, MenuItem } from "@/types/models";

/**
 * Display-only sample catalog for empty public menus.
 * Never written to Firestore — used only when `demoMenuEnabled` is on and the
 * cafe has no real menu items yet, so the locked design can be previewed.
 */

const DEMO_PREFIX = "demo-";

export function isDemoMenuId(id: string) {
  return id.startsWith(DEMO_PREFIX);
}

export const demoCategories: Category[] = [
  cat("coffee", 1, "Coffee", "قهوة", "قاوە"),
  cat("hot-drinks", 2, "Hot Drinks", "مشروبات ساخنة", "خواردنەوەی گەرم"),
  cat("cold-drinks", 3, "Cold Drinks", "مشروبات باردة", "خواردنەوەی سارد"),
  cat("desserts", 4, "Desserts", "حلويات", "شیرینی")
];

export const demoMenuItems: MenuItem[] = [
  // Coffee (6)
  item("espresso", "coffee", 1, "Espresso", "إسبريسو", "ئێسپڕێسۆ", 2500, ["coffee", "hot"], true, true, false),
  item("americano", "coffee", 2, "Americano", "أمريكانو", "ئەمەریکانۆ", 3000, ["coffee", "hot"], false, true, false),
  item("cappuccino", "coffee", 3, "Cappuccino", "كابتشينو", "کاپوچینۆ", 4000, ["coffee", "hot"], true, false, false),
  item("latte", "coffee", 4, "Cafe Latte", "لاتيه", "لاتێ", 4500, ["coffee", "hot"], false, true, true),
  item("flat-white", "coffee", 5, "Flat White", "فلات وايت", "فلات وایت", 4500, ["coffee", "hot"], false, false, false),
  item("spanish-latte", "coffee", 6, "Spanish Latte", "سبانيش لاتيه", "سپانیش لاتێ", 5000, ["coffee", "hot"], true, false, true),

  // Hot drinks (4)
  item("kurdish-tea", "hot-drinks", 7, "Kurdish Tea", "شاي كردي", "چای کوردی", 1500, ["tea"], false, true, false),
  item("hot-chocolate", "hot-drinks", 8, "Hot Chocolate", "شوكولاتة ساخنة", "شۆکۆلاتەی گەرم", 4000, ["chocolate"], false, false, false),
  item("matcha-latte", "hot-drinks", 9, "Matcha Latte", "ماتشا لاتيه", "ماتچا لاتێ", 5500, ["tea"], true, false, true),
  item("ginger-tea", "hot-drinks", 10, "Ginger Honey Tea", "شاي زنجبيل وعسل", "چای زنجەفیل و هەنگوین", 3000, ["tea"], false, false, false),

  // Cold drinks (5)
  item("iced-latte", "cold-drinks", 11, "Iced Latte", "لاتيه مثلج", "لاتێی سارد", 4500, ["coffee", "cold"], true, true, false),
  item("iced-americano", "cold-drinks", 12, "Iced Americano", "أمريكانو مثلج", "ئەمەریکانۆی سارد", 3500, ["coffee", "cold"], false, false, false),
  item("orange-juice", "cold-drinks", 13, "Fresh Orange Juice", "عصير برتقال طازج", "شەربەتی پرتەقاڵی تازە", 4000, ["juice", "sugar-free"], false, true, false),
  item("lemonade", "cold-drinks", 14, "Fresh Lemonade", "ليمونادة طازجة", "لیمۆنادەی تازە", 3500, ["juice"], false, false, true),
  item("mocha-frappe", "cold-drinks", 15, "Mocha Frappe", "موكا فرابيه", "مۆکا فراپێ", 5500, ["coffee", "cold"], true, false, false),

  // Desserts (5)
  item("cheesecake", "desserts", 16, "Classic Cheesecake", "تشيز كيك كلاسيكي", "چیزکێکی کلاسیکی", 5500, ["dessert"], true, true, false),
  item("tiramisu", "desserts", 17, "Tiramisu", "تيراميسو", "تیرامیسو", 6000, ["dessert"], false, true, false),
  item("brownie", "desserts", 18, "Chocolate Brownie", "براوني شوكولاتة", "براونیی شۆکۆلاتە", 4500, ["dessert"], false, false, true),
  item("croissant", "desserts", 19, "Butter Croissant", "كرواسون بالزبدة", "کڕواسۆنی کرە", 3500, ["dessert"], false, false, false),
  item("date-cookie", "desserts", 20, "Date Cookie", "كعكة تمر", "کوکیی خورما", 2500, ["dessert"], false, true, false)
];

/** True when the supervisor wants empty menus to show the sample catalog. Default on. */
export function isDemoMenuEnabled(client: Pick<ClientAccount, "demoMenuEnabled"> | null | undefined) {
  return client?.demoMenuEnabled !== false;
}

/**
 * If the cafe has no real items and demo mode is on, return AppData with the
 * in-memory sample catalog. Real DB content is never modified.
 */
export function withDemoMenuCatalog(data: AppData, client: ClientAccount | null | undefined): AppData {
  if (!isDemoMenuEnabled(client)) return data;
  if (data.menuItems.length > 0) return data;

  const currency: Currency = data.general.defaultCurrency || "IQD";
  return {
    ...data,
    categories: demoCategories,
    menuItems: demoMenuItems.map((entry) => ({
      ...entry,
      currency,
      variants: entry.variants.map((variant) => ({ ...variant, price: variant.price }))
    }))
  };
}

function cat(slug: string, order: number, en: string, ar: string, ckb: string): Category {
  return {
    id: `${DEMO_PREFIX}${slug}`,
    slug,
    displayOrder: order,
    isActive: true,
    name: { en, ar, ckb },
    description: {
      en: `Sample ${en.toLowerCase()} for design preview`,
      ar: `عينة ${ar} لمعاينة التصميم`,
      ckb: `نموونەی ${ckb} بۆ پێشبینینی دیزاین`
    }
  };
}

function item(
  id: string,
  categorySlug: string,
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
    id: `${DEMO_PREFIX}${id}`,
    categoryId: `${DEMO_PREFIX}${categorySlug}`,
    displayOrder: order,
    name: { en, ar, ckb },
    description: {
      en: "Sample item for menu design preview — not a real product.",
      ar: "عنصر تجريبي لمعاينة تصميم القائمة — ليس منتجاً حقيقياً.",
      ckb: "بابەتی نموونەیی بۆ پێشبینینی دیزاینی مێنو — بەرهەمی ڕاستەقینە نییە."
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
    preparationMinutes: 8,
    calories: tags.includes("dessert") ? 380 : tags.includes("coffee") ? 120 : undefined,
    spicyLevel: 0,
    isAvailable: true,
    isSoldOut: false,
    isFeatured: featured,
    isPopular: popular,
    isNew
  };
}
