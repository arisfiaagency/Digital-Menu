# Multilingual Digital Café & Restaurant Menu

## Project Goal

Build a complete, production-ready digital menu system for a café or restaurant.

The application must support:

1. English
2. Arabic
3. Kurdish Sorani

Arabic and Kurdish must use right-to-left layout. English must use left-to-right layout.

The system must include:

- A public digital menu for customers
- A simple admin dashboard
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- A QR-code page for the main menu
- Printable and copyable QR-code output
- Category management
- Menu item management
- Admin password change
- Responsive design for mobile, tablet, and desktop

This version does not require table management, table-specific QR codes, customer accounts, carts, or ordering.

---

# 1. Required Technology Stack

Use this stack unless there is a strong technical reason to change it.

## Frontend

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Hook Form
- Zod
- `next-intl` or another reliable internationalization library

## Backend and Data

Use Firebase only:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Admin SDK for secure server-side operations
- Firebase App Check where practical

Do not use:

- PostgreSQL
- Prisma
- Supabase
- MySQL
- MongoDB
- NextAuth
- Auth.js

## QR Code

Use a reliable package such as:

- `qrcode`
- `react-qr-code`

The QR code should open the main public menu URL:

```text
https://restaurant-domain.com/menu
```

---

# 2. Main Application Areas

Create these main areas:

```text
/menu
/admin
```

The public menu must not require customer login.

The admin dashboard must require Firebase Authentication.

Suggested routes:

```text
/
├── menu
│   ├── page.tsx
│   ├── category/[slug]
│   └── item/[slug]
│
├── admin
│   ├── login
│   ├── dashboard
│   ├── categories
│   ├── menu-items
│   ├── qr-code
│   └── settings
│
└── api
```

Do not create table-management pages.

Do not create table-specific QR-code pages.

Do not create ordering pages unless added later as a separate optional upgrade.

---

# 3. Public Digital Menu

The public menu should open immediately when the customer scans the QR code.

The public menu must:

- Work without customer registration
- Display the restaurant logo
- Display the restaurant name
- Display the restaurant description
- Display categories
- Display menu items
- Support English, Arabic, and Kurdish Sorani
- Support RTL and LTR layouts correctly
- Be mobile-first
- Load quickly
- Show available and sold-out items
- Show item images
- Show prices clearly
- Support search
- Support category filtering
- Remember the selected language
- Show a language selector
- Support optional light and dark themes

Public menu URL:

```text
/menu
```

Example production URL:

```text
https://restaurant-domain.com/menu
```

The QR code must always point to this main menu URL.

---

# 4. Public Menu Header

The public menu header should contain:

- Restaurant logo
- Restaurant name
- Short restaurant description
- Search bar
- Language selector
- Theme toggle if enabled
- Open or closed status if configured
- Phone number
- WhatsApp button if configured
- Google Maps button if configured
- Social media links if configured

Language selector:

```text
English
العربية
کوردی
```

For Arabic and Kurdish:

```html
dir="rtl"
```

For English:

```html
dir="ltr"
```

The entire page must adapt correctly, including:

- Text alignment
- Navigation direction
- Icons
- Spacing
- Drawers
- Dialogs
- Form alignment
- Card layout

---

# 5. Menu Categories

Example categories:

- Breakfast
- Hot Drinks
- Cold Drinks
- Coffee
- Tea
- Fresh Juices
- Smoothies
- Desserts
- Cakes
- Sandwiches
- Burgers
- Pizza
- Pasta
- Main Meals
- Salads
- Appetizers
- Kids Menu
- Shisha
- Special Offers

Each category must include:

```text
English name
Arabic name
Kurdish name
English description
Arabic description
Kurdish description
Category image
Display order
Active or inactive status
Slug
Created date
Updated date
```

The admin must be able to:

- Create a category
- Edit a category
- Delete a category
- Activate a category
- Deactivate a category
- Upload a category image
- Reorder categories
- Preview a category
- Search categories
- Filter active and inactive categories

Inactive categories must not appear on the public menu.

Before deleting a category, warn the admin if it contains menu items.

Allow the admin to move those items to another category before deleting it.

---

# 6. Menu Items

Each menu item must include:

```text
English name
Arabic name
Kurdish name

English description
Arabic description
Kurdish description

Base price
Discounted price
Currency
Image
Category
Display order

Available status
Sold-out status
Featured status
Popular status
New status

Preparation time
Calories

English ingredients
Arabic ingredients
Kurdish ingredients

Spicy level
Dietary labels
Allergens
Tags

Created date
Updated date
```

Example:

```text
English: Iced Spanish Latte
Arabic: سبانيش لاتيه مثلج
Kurdish: سپانیش لاتێی سارد
Price: 5,000 IQD
```

Each public item card should display:

- Image
- Localized item name
- Localized description
- Price
- Discounted price if present
- Sold-out status
- Featured badge
- Popular badge
- New badge
- Dietary labels
- Allergen warning if enabled

There is no customer cart or order button in this version.

---

# 7. Item Variants and Sizes

Menu items may optionally have sizes or variants.

Example:

```text
Small: 3,000 IQD
Medium: 4,000 IQD
Large: 5,000 IQD
```

Each variant should support:

```text
English name
Arabic name
Kurdish name
Price
Available status
Display order
```

Possible variant types:

- Small, medium, large
- Hot or cold
- Single or double shot
- Regular or decaf
- Milk type
- Sugar level
- Ice level
- Spicy level

The admin should be able to add, edit, reorder, activate, deactivate, and remove variants from an item.

---

# 8. Search and Filtering

Customers must be able to search using all three languages.

Search across:

- Item names
- Item descriptions
- Ingredients
- Tags
- Category names

Filters may include:

- Category
- Available
- Featured
- Popular
- New
- Vegetarian
- Vegan
- Gluten-free
- Sugar-free
- Spicy
- Non-spicy
- Price range

Search should ignore letter case.

Normalize common Arabic and Kurdish character variations where practical.

---

# 9. Currency

The default currency should be configurable from the admin settings page.

Support:

```text
IQD
USD
EUR
TRY
```

Format Iraqi dinar prices like:

```text
5,000 IQD
```

Admin options:

- Default currency
- Currency symbol or code
- Currency position
- Decimal places
- Thousands separator

Store money safely as integer minor units or another precise representation.

Do not use unsafe floating-point arithmetic for prices.

---

# 10. Firebase Architecture

Use Firebase as the complete backend platform.

## Firebase Authentication

Use Firebase Authentication for admin login.

Required features:

- Email and password login
- Secure logout
- Forgot-password email
- Password reset
- Change password
- Reauthentication before sensitive password changes
- Disabled-user handling
- Session protection
- Route protection

Only approved admin accounts may access `/admin`.

Do not allow public self-registration.

Admin users should be created manually in Firebase Authentication or through a secure one-time setup process.

## Cloud Firestore

Use Cloud Firestore for:

- Categories
- Menu items
- Restaurant settings
- QR settings
- Optional audit logs
- Optional translation metadata

## Firebase Storage

Use Firebase Storage for:

- Restaurant logo
- Cover image
- Category images
- Menu item images
- QR-code logo if enabled

## Firebase Admin SDK

Use Firebase Admin SDK on the server for:

- Verifying Firebase ID tokens
- Protecting admin actions
- Performing trusted server-side writes where needed
- Managing secure admin-only functionality

Never rely only on client-side authentication checks.

---

# 11. Firestore Collections

Use a structure similar to:

```text
/categories/{categoryId}
/menuItems/{menuItemId}
/settings/general
/settings/menu
/settings/appearance
/settings/qr
/adminProfiles/{uid}
/auditLogs/{logId}
```

## Category Document

```ts
type Category = {
  id: string;
  name: {
    en: string;
    ar: string;
    ckb: string;
  };
  description: {
    en?: string;
    ar?: string;
    ckb?: string;
  };
  imageUrl?: string;
  imagePath?: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

## Menu Item Document

```ts
type MenuItem = {
  id: string;
  categoryId: string;

  name: {
    en: string;
    ar: string;
    ckb: string;
  };

  description: {
    en?: string;
    ar?: string;
    ckb?: string;
  };

  ingredients?: {
    en?: string;
    ar?: string;
    ckb?: string;
  };

  imageUrl?: string;
  imagePath?: string;

  basePrice: number;
  discountPrice?: number;
  currency: "IQD" | "USD" | "EUR" | "TRY";

  preparationMinutes?: number;
  calories?: number;
  spicyLevel?: number;

  dietaryLabels: string[];
  allergens: string[];
  tags: string[];

  variants: Array<{
    id: string;
    name: {
      en: string;
      ar: string;
      ckb: string;
    };
    price: number;
    isAvailable: boolean;
    displayOrder: number;
  }>;

  isAvailable: boolean;
  isSoldOut: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isNew: boolean;

  displayOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

## General Settings Document

```ts
type GeneralSettings = {
  restaurantName: {
    en: string;
    ar: string;
    ckb: string;
  };

  description: {
    en?: string;
    ar?: string;
    ckb?: string;
  };

  logoUrl?: string;
  logoPath?: string;
  coverImageUrl?: string;
  coverImagePath?: string;

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

  defaultLanguage: "en" | "ar" | "ckb";
  enabledLanguages: Array<"en" | "ar" | "ckb">;
  defaultCurrency: "IQD" | "USD" | "EUR" | "TRY";

  updatedAt: Timestamp;
};
```

## QR Settings Document

```ts
type QrSettings = {
  menuUrl: string;
  foregroundColor: string;
  backgroundColor: string;
  includeLogo: boolean;
  logoUrl?: string;
  title: {
    en: string;
    ar: string;
    ckb: string;
  };
  subtitle: {
    en?: string;
    ar?: string;
    ckb?: string;
  };
  updatedAt: Timestamp;
};
```

Use Firestore converters or strong TypeScript validation for document data.

---

# 12. Firebase Security Rules

Create strict Firestore and Storage rules.

## Firestore Rules

Public users may read only:

- Active categories
- Public menu items
- Public restaurant settings
- Public QR settings if needed

Only authenticated approved admins may:

- Create categories
- Update categories
- Delete categories
- Create menu items
- Update menu items
- Delete menu items
- Update settings
- Access admin profiles
- Access audit logs

Do not trust a user merely because `request.auth != null`.

Use an admin claim or approved admin profile.

Example concept:

```text
request.auth != null
and request.auth.token.admin == true
```

Alternatively, verify the UID against a protected admin profile.

## Storage Rules

Public users may read public menu images.

Only authenticated admins may upload, replace, or delete images.

Validate:

- File type
- File size
- Storage path
- Authenticated admin role

---

# 13. Admin Login

Create a simple admin login page.

Fields:

- Email
- Password

Features:

- Login button
- Show and hide password
- Forgot-password link
- Clear validation errors
- Friendly Firebase error messages
- Loading state
- Redirect to `/admin/dashboard` after success

Do not create public account registration.

---

# 14. Simplified Admin Dashboard

The dashboard should be easy for restaurant staff.

Main navigation:

```text
Dashboard
Categories
Menu Items
QR Code
Settings
Logout
```

Do not include:

- Table management
- Order management
- Customer management
- Delivery management
- Complex analytics
- Multi-role management unless added later

Dashboard cards may show:

- Total categories
- Active categories
- Total menu items
- Available items
- Sold-out items
- Missing translations
- Missing images
- Last updated date

Include quick action buttons:

- Add Category
- Add Menu Item
- View Public Menu
- Show QR Code

---

# 15. Category Management Page

Admin must be able to:

- Add category
- Edit category
- Delete category
- Activate or deactivate
- Upload image
- Enter names in English, Arabic, and Kurdish
- Enter descriptions in all three languages
- Set display order
- Reorder categories
- Preview
- Search
- Filter by active status

Validate all form fields with Zod.

Require English, Arabic, and Kurdish names unless the admin settings allow incomplete translations.

---

# 16. Menu Item Management Page

Admin must be able to:

- Add menu item
- Edit menu item
- Duplicate menu item
- Delete menu item
- Activate or deactivate item
- Mark sold out
- Mark featured
- Mark popular
- Mark new
- Upload item image
- Replace item image
- Remove item image
- Enter names in all three languages
- Enter descriptions in all three languages
- Enter ingredients in all three languages
- Set base price
- Set discount price
- Choose currency
- Choose category
- Add variants
- Add tags
- Add allergens
- Add dietary labels
- Set display order
- Preview the item

Provide:

- List view
- Optional grid view
- Search
- Category filter
- Availability filter
- Sold-out filter
- Translation completion filter

All Firestore writes must show:

- Loading state
- Success feedback
- Error feedback

---

# 17. Admin Settings Page

Create an admin settings page with clear sections.

## General Settings

Allow the admin to update:

- Restaurant name in English
- Restaurant name in Arabic
- Restaurant name in Kurdish
- Restaurant description in all three languages
- Logo
- Cover image
- Phone
- WhatsApp
- Email
- Address
- Google Maps URL
- Social media links

## Menu Settings

Allow the admin to update:

- Default language
- Enabled languages
- Default currency
- Show images
- Show prices
- Show calories
- Show ingredients
- Show allergens
- Show sold-out items
- Enable search
- Enable filters
- Enable dark mode

## Appearance Settings

Allow the admin to update:

- Primary color
- Secondary color
- Font
- Border radius
- Card style
- Header layout
- Menu layout
- Light or dark default theme

## Admin Password

Create a password-change section inside settings.

Required fields:

```text
Current password
New password
Confirm new password
```

Requirements:

- Reauthenticate the admin using Firebase Authentication
- Validate password strength
- Confirm both new passwords match
- Update the password through Firebase Authentication
- Show clear success or failure feedback
- Sign out other sessions if practical
- Never store the password in Firestore
- Never log the password
- Never expose the password in client logs

Also include a forgot-password email option.

---

# 18. QR Code Page in Admin

Create a dedicated route:

```text
/admin/qr-code
```

This page is for the one main menu QR code.

The QR code must open:

```text
https://restaurant-domain.com/menu
```

The admin must be able to:

- Show the QR code
- Hide the QR preview
- Copy the menu URL
- Copy the QR code image to clipboard where browser support allows
- Download QR as PNG
- Download QR as SVG
- Print QR code
- Open a print-friendly QR page
- Preview the QR code
- Change QR foreground color
- Change QR background color
- Add or remove the restaurant logo
- Change the title above the QR
- Change the subtitle below the QR
- Reset QR design to default
- Test the menu link
- Open the public menu in a new tab

Do not generate separate QR codes for tables.

Do not create table records.

Do not require table numbers.

## Print Layout

Create a clean print-only layout.

Example:

```text
[Restaurant Logo]

Scan to View Our Menu
امسح الرمز لعرض قائمتنا
کۆدەکە سکان بکە بۆ بینینی مینیو

[QR CODE]

restaurant-domain.com/menu
```

The print page should:

- Hide admin navigation
- Hide buttons
- Hide form controls
- Center the QR code
- Use high-resolution output
- Work on A4 paper
- Work on smaller card sizes where practical
- Preserve a white quiet zone around the QR
- Avoid scaling that makes the QR unreadable

## Copy QR

Implement copy behavior:

1. Try to copy the QR image to the clipboard.
2. If image clipboard is unsupported, copy the menu URL.
3. Show a message explaining what was copied.

This allows the admin to redesign the QR later in Canva, Photoshop, Illustrator, or another design application.

---

# 19. QR Design Safety

The QR code must remain scannable.

Requirements:

- Use a proper quiet zone
- Use high contrast
- Use strong error correction if a logo is placed inside
- Keep the logo reasonably small
- Do not place text over the QR modules
- Validate the final QR code before download
- Warn the admin when selected colors have poor contrast
- Include the menu URL as visible fallback text

The QR URL should be based on an environment variable:

```env
NEXT_PUBLIC_SITE_URL=https://restaurant-domain.com
```

Generated menu URL:

```text
${NEXT_PUBLIC_SITE_URL}/menu
```

---

# 20. Internationalization

Use:

```text
/messages/en.json
/messages/ar.json
/messages/ckb.json
```

English example:

```json
{
  "menu": {
    "title": "Menu",
    "search": "Search menu",
    "categories": "Categories",
    "popular": "Popular",
    "featured": "Featured",
    "soldOut": "Sold out"
  },
  "admin": {
    "dashboard": "Dashboard",
    "categories": "Categories",
    "menuItems": "Menu Items",
    "qrCode": "QR Code",
    "settings": "Settings",
    "logout": "Logout"
  }
}
```

Arabic example:

```json
{
  "menu": {
    "title": "القائمة",
    "search": "ابحث في القائمة",
    "categories": "الأقسام",
    "popular": "الأكثر طلباً",
    "featured": "مميز",
    "soldOut": "نفد"
  },
  "admin": {
    "dashboard": "لوحة التحكم",
    "categories": "الأقسام",
    "menuItems": "عناصر القائمة",
    "qrCode": "رمز QR",
    "settings": "الإعدادات",
    "logout": "تسجيل الخروج"
  }
}
```

Kurdish Sorani example:

```json
{
  "menu": {
    "title": "مینیو",
    "search": "گەڕان لە مینیو",
    "categories": "بەشەکان",
    "popular": "بەناوبانگ",
    "featured": "تایبەت",
    "soldOut": "تەواو بووە"
  },
  "admin": {
    "dashboard": "داشبۆرد",
    "categories": "بەشەکان",
    "menuItems": "بڕگەکانی مینیو",
    "qrCode": "کۆدی QR",
    "settings": "ڕێکخستنەکان",
    "logout": "چوونەدەرەوە"
  }
}
```

Fallback order:

```text
Selected language
English
Any available translation
```

Use Kurdish Sorani, not Kurmanji.

Preferred locale code:

```text
ckb
```

---

# 21. Responsive Design

Public menu:

- Mobile-first
- Single-column list layout
- Optional two-column grid
- Sticky category navigation
- Fast image loading
- Large touch targets

Admin dashboard:

- Collapsible sidebar
- Mobile drawer
- Responsive forms
- Responsive tables
- Card fallback on small screens

QR page:

- Large preview on desktop
- Scaled preview on mobile
- Print layout independent from screen layout

---

# 22. Accessibility

Requirements:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Proper contrast
- Image alt text
- Accessible forms
- Accessible dialogs
- ARIA labels where needed
- Proper RTL reading order
- Buttons with clear labels
- Do not rely only on color for status

---

# 23. Security

Implement:

- Firebase Authentication
- Firebase Admin token verification
- Strict Firestore rules
- Strict Storage rules
- Admin custom claims or protected admin UID checks
- Zod validation
- Secure server-side authorization
- Image type validation
- Image size validation
- XSS protection
- Safe error messages
- Environment variables for secrets
- Firebase App Check where practical
- Reauthentication before password updates
- No public registration
- No client-only authorization
- No plaintext passwords
- No password storage in Firestore

---

# 24. Performance

Implement:

- Optimized images
- Lazy loading
- Firestore query limits
- Pagination where necessary
- Search debouncing
- Loading skeletons
- Error boundaries
- Cached public settings where safe
- Minimal client-side JavaScript
- Efficient Firestore reads
- Proper Firestore indexes
- Cleanup of deleted Storage files

Avoid unnecessary real-time listeners.

Use real-time listeners only when they clearly improve the admin experience.

---

# 25. Firebase Configuration

Create:

```text
src/lib/firebase/client.ts
src/lib/firebase/admin.ts
src/lib/firebase/auth.ts
src/lib/firebase/firestore.ts
src/lib/firebase/storage.ts
```

Client environment example:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Server environment example:

```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

Handle escaped newlines in the private key safely.

Never expose Firebase Admin credentials to the browser.

---

# 26. File Upload Requirements

Admin image upload must support:

- JPG
- JPEG
- PNG
- WebP

Validate:

- MIME type
- File extension
- File size
- Image dimensions if needed

Features:

- Preview before upload
- Upload progress
- Replace image
- Delete old image
- Store Storage path in Firestore
- Remove orphaned Storage files when practical
- Generate meaningful file paths

Suggested paths:

```text
restaurants/main/logo/
restaurants/main/cover/
categories/{categoryId}/
menu-items/{menuItemId}/
qr/
```

---

# 27. Error Handling

Create friendly states for:

```text
404
403
500
Offline
Firebase unavailable
Authentication expired
Permission denied
Image upload failed
Menu unavailable
```

All public errors must be shown in the selected language.

Admin errors should be clear enough to help staff retry safely.

---

# 28. Seed and Setup Data

Create a setup or seed script for Firebase Emulator or development.

Include:

- 8 categories
- 30 menu items
- English translations
- Arabic translations
- Kurdish Sorani translations
- Restaurant settings
- QR settings

Do not hard-code production admin passwords.

Create the first admin account manually through Firebase Authentication or through a documented secure setup process.

---

# 29. Testing

Create:

- Unit tests
- Integration tests
- End-to-end tests

Important test flows:

1. Admin logs in with Firebase Authentication.
2. Unauthorized users cannot open admin pages.
3. Admin creates a category.
4. Admin edits a category.
5. Admin deletes a category.
6. Admin creates a menu item.
7. Admin uploads an item image.
8. Admin updates all translations.
9. Public menu displays the new item.
10. Language switching works.
11. RTL and LTR work correctly.
12. Admin opens the QR page.
13. QR code points to `/menu`.
14. Admin copies the menu URL.
15. Admin downloads the QR as PNG.
16. Admin downloads the QR as SVG.
17. Admin opens the print layout.
18. Admin changes the password after reauthentication.
19. Public users cannot write to Firestore.
20. Non-admin authenticated users cannot modify data.

Use Playwright for end-to-end testing.

Use Firebase Emulator Suite where practical for tests.

---

# 30. Required Deliverables

Generate:

```text
1. Full source code
2. Clean folder structure
3. Firebase client configuration
4. Firebase Admin configuration
5. Firestore data models
6. Firestore security rules
7. Storage security rules
8. Firestore indexes
9. Firebase Emulator configuration
10. Development seed script
11. .env.example
12. Installation guide
13. Firebase setup guide
14. Development guide
15. Production deployment guide
16. Admin dashboard
17. Category management
18. Menu item management
19. Admin settings page
20. Password-change feature
21. Public multilingual menu
22. Main menu QR-code page
23. PNG QR download
24. SVG QR download
25. QR print layout
26. Copy URL and copy QR feature
27. Responsive UI
28. Automated tests
29. README
```

---

# 31. Development Phases

## Phase 1: Planning

Before coding:

- Define architecture
- Define Firestore collections
- Define Storage paths
- Define authentication flow
- Define admin route protection
- Define language strategy
- Define QR workflow
- Define security rules

## Phase 2: Project Setup

- Create Next.js project
- Configure TypeScript
- Configure Tailwind
- Configure Shadcn UI
- Configure Firebase client SDK
- Configure Firebase Admin SDK
- Configure internationalization
- Configure Firebase Emulator Suite

## Phase 3: Firebase Data Layer

- Create TypeScript models
- Create Firestore converters
- Create repositories or service functions
- Create security rules
- Create Storage rules
- Create indexes
- Create development seed script

## Phase 4: Authentication

- Build login
- Build logout
- Add protected admin layout
- Verify ID tokens server-side
- Add forgot password
- Add password change with reauthentication

## Phase 5: Admin Dashboard

- Build admin layout
- Build dashboard cards
- Build category management
- Build menu-item management
- Build settings
- Build QR-code page

## Phase 6: Public Menu

- Build responsive menu
- Add language switching
- Add RTL and LTR
- Add categories
- Add item details
- Add search
- Add filters

## Phase 7: QR Code

- Generate the main menu QR
- Add preview
- Add copy URL
- Add copy image
- Add PNG download
- Add SVG download
- Add print layout
- Add simple safe customization

## Phase 8: Testing and Security

- Test authentication
- Test Firestore rules
- Test Storage rules
- Test admin writes
- Test public reads
- Test QR export
- Test password change
- Test accessibility
- Test responsive layouts

## Phase 9: Deployment

- Add Firebase setup guide
- Add environment setup
- Add deployment instructions
- Add backup/export instructions
- Add rules deployment commands

---

# 32. Coding Standards

Use:

- TypeScript strict mode
- Reusable components
- Server Components where appropriate
- Clear separation of UI, validation, Firebase services, and business logic
- Proper error handling
- No duplicated logic
- Meaningful names
- Strong type safety
- ESLint
- Prettier

Suggested structure:

```text
src/
├── app/
│   ├── menu/
│   └── admin/
├── components/
│   ├── admin/
│   ├── menu/
│   ├── forms/
│   ├── qr/
│   └── ui/
├── lib/
│   ├── firebase/
│   ├── auth/
│   ├── validation/
│   ├── i18n/
│   └── utils/
├── hooks/
├── services/
├── types/
└── messages/
```

Do not place the entire application in a few oversized files.

---

# 33. User Experience Rules

- Show success feedback after saving
- Show loading state during Firebase actions
- Confirm before deleting
- Warn about unsaved changes
- Preserve form values after validation errors
- Show upload progress
- Show image preview
- Customers must not need accounts
- Save selected language
- Open the menu directly after scanning QR
- Keep the dashboard simple
- Do not create fake buttons
- Do not create unfinished placeholder pages
- Connect all main actions to Firebase
- Make QR printing simple for non-technical staff
- Let the admin copy the QR or URL for external redesign

---

# 34. Default Branding

Use temporary branding until changed in settings:

```text
English: Ary Café & Restaurant
Arabic: مقهى ومطعم آري
Kurdish: کافێ و چێشتخانەی ئاری
```

Default currency:

```text
IQD
```

Default language:

```text
Kurdish Sorani
```

Enabled languages:

```text
Kurdish Sorani
Arabic
English
```

The admin must be able to replace all branding.

---

# 35. Explicitly Excluded Features

Do not build these in the current version:

- Restaurant table management
- Table records
- Table-specific QR codes
- Table scan tracking
- Customer accounts
- Customer registration
- Shopping cart
- Customer ordering
- Order management
- Payment processing
- Delivery management
- Staff role management
- Complex analytics

The application should focus on:

```text
Public multilingual menu
Admin login
Category management
Menu item management
Settings
Admin password change
One main printable and copyable menu QR code
```

---

# 36. Instructions for the Coding Agent

You are responsible for building the actual working application.

Do not stop after producing mockups, architecture notes, or placeholder components.

Before implementation, provide:

1. Complete folder structure
2. Firebase architecture explanation
3. Firestore collection design
4. Firebase Authentication flow
5. Firestore security strategy
6. Storage security strategy
7. Route map
8. Public menu component list
9. Admin dashboard component list
10. QR-code workflow
11. Translation and RTL strategy
12. Implementation checklist

Then immediately begin implementation phase by phase.

For every phase:

- Create working code
- Run type checking
- Run linting
- Run tests
- Fix errors before continuing
- Maintain a progress checklist
- Document environment variables
- Do not silently skip requirements

Prefer simple, maintainable, production-ready solutions.

When a requirement conflicts with security, data integrity, accessibility, Firebase limitations, or browser limitations, choose the safer implementation and document the reason.
