import type { Category, MenuItem } from "@/types/models";

/** Simple starter menu for the mihrako tenant. */
export const mihrakoCategories: Category[] = [
  {
    id: "coffee",
    slug: "coffee",
    displayOrder: 1,
    isActive: true,
    name: { en: "Coffee", ar: "قهوة", ckb: "قاوە" },
    description: {
      en: "Espresso drinks",
      ar: "مشروبات الإسبريسو",
      ckb: "خواردنەوەی ئەسپریسۆ"
    }
  },
  {
    id: "tea",
    slug: "tea",
    displayOrder: 2,
    isActive: true,
    name: { en: "Tea", ar: "شاي", ckb: "چای" },
    description: {
      en: "Hot teas",
      ar: "شاي ساخن",
      ckb: "چای گەرم"
    }
  },
  {
    id: "cold-drinks",
    slug: "cold-drinks",
    displayOrder: 3,
    isActive: true,
    name: { en: "Cold Drinks", ar: "مشروبات باردة", ckb: "خواردنەوەی سارد" },
    description: {
      en: "Iced & fresh",
      ar: "مثلج وطازج",
      ckb: "سارد و تازە"
    }
  },
  {
    id: "pastries",
    slug: "pastries",
    displayOrder: 4,
    isActive: true,
    name: { en: "Pastries", ar: "معجنات", ckb: "شیرینی" },
    description: {
      en: "Sweet bites",
      ar: "حلويات خفيفة",
      ckb: "شیرینیی سووک"
    }
  }
];

function simpleItem(
  id: string,
  categoryId: string,
  order: number,
  en: string,
  ar: string,
  ckb: string,
  price: number,
  opts?: { featured?: boolean; popular?: boolean }
): MenuItem {
  return {
    id,
    categoryId,
    displayOrder: order,
    name: { en, ar, ckb },
    description: {
      en: "Freshly prepared.",
      ar: "يحضّر طازجاً.",
      ckb: "بە تازەیی ئامادە دەکرێت."
    },
    ingredients: { en: "", ar: "", ckb: "" },
    basePrice: price,
    currency: "IQD",
    dietaryLabels: [],
    allergens: [],
    tags: [],
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
    spicyLevel: 0,
    isAvailable: true,
    isSoldOut: false,
    isFeatured: opts?.featured ?? false,
    isPopular: opts?.popular ?? false,
    isNew: false
  };
}

export const mihrakoMenuItems: MenuItem[] = [
  simpleItem("espresso", "coffee", 1, "Espresso", "إسبريسو", "ئەسپریسۆ", 2500, { popular: true }),
  simpleItem("americano", "coffee", 2, "Americano", "أمريكانو", "ئەمەریکانۆ", 3000),
  simpleItem("latte", "coffee", 3, "Latte", "لاتيه", "لاتێ", 4500, { featured: true }),
  simpleItem("cappuccino", "coffee", 4, "Cappuccino", "كابتشينو", "کاپوچینۆ", 4500, { popular: true }),
  simpleItem("kurdish-tea", "tea", 5, "Kurdish Tea", "شاي كردي", "چای کوردی", 1500, { popular: true }),
  simpleItem("green-tea", "tea", 6, "Green Tea", "شاي أخضر", "چای سەوز", 2000),
  simpleItem("iced-latte", "cold-drinks", 7, "Iced Latte", "لاتيه مثلج", "لاتێی سارد", 5000, { featured: true }),
  simpleItem("fresh-lemonade", "cold-drinks", 8, "Fresh Lemonade", "ليمونادة طازجة", "لیمۆنادەی تازە", 3500),
  simpleItem("croissant", "pastries", 9, "Butter Croissant", "كرواسون بالزبدة", "کرواسۆنی کەرە", 3000),
  simpleItem("cheesecake", "pastries", 10, "Cheesecake Slice", "شريحة تشيز كيك", "پارچەی چیزکێک", 5500, { featured: true })
];
