import { z } from "zod";

const localizedRequired = z.object({
  en: z.string().min(1, "English is required."),
  ar: z.string().min(1, "Arabic is required."),
  ckb: z.string().min(1, "Kurdish is required.")
});

const localizedOptional = z.object({
  en: z.string().optional().default(""),
  ar: z.string().optional().default(""),
  ckb: z.string().optional().default("")
});

export const categorySchema = z.object({
  id: z.string().optional().default(""),
  name: localizedRequired,
  description: localizedOptional,
  slug: z.string().min(1, "Slug is required."),
  icon: z.string().optional().default(""),
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true)
});

export const variantSchema = z.object({
  id: z.string().min(1),
  name: localizedRequired,
  price: z.coerce.number().int().min(0),
  isAvailable: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0)
});

const imageHistoryEntrySchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().url(),
  imagePath: z.string().min(1),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1)
});

export const menuItemSchema = z.object({
  id: z.string().optional().default(""),
  categoryId: z.string().min(1, "Category is required."),
  name: localizedRequired,
  description: localizedOptional,
  ingredients: localizedOptional,
  flavor: z.string().optional().default(""),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imagePath: z.string().optional(),
  imageHistory: z.array(imageHistoryEntrySchema).default([]),
  basePrice: z.coerce.number().int().min(0),
  discountPrice: z.coerce.number().int().min(0).optional(),
  currency: z.enum(["IQD", "USD", "EUR", "TRY"]),
  preparationMinutes: z.coerce.number().int().min(0).optional(),
  calories: z.coerce.number().int().min(0).optional(),
  spicyLevel: z.coerce.number().int().min(0).max(5).optional(),
  dietaryLabels: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  variants: z.array(variantSchema).default([]),
  isAvailable: z.boolean().default(true),
  isSoldOut: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  isNew: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0)
});

export const settingsSchema = z.object({
  restaurantName: localizedRequired,
  description: localizedOptional,
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  googleMapsUrl: z.string().url().optional().or(z.literal("")),
  defaultLanguage: z.enum(["en", "ar", "ckb"]),
  enabledLanguages: z.array(z.enum(["en", "ar", "ckb"])).min(1),
  defaultCurrency: z.enum(["IQD", "USD", "EUR", "TRY"])
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

export const qrSettingsSchema = z.object({
  menuUrl: z.string().url(),
  foregroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  includeLogo: z.boolean(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  title: localizedRequired,
  subtitle: localizedOptional
});
