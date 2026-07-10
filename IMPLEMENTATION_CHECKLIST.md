# Multilingual Cafe Digital Menu Implementation Checklist

## Complete Folder Structure

```text
.
├── apphosting.yaml
├── components.json
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── storage.rules
├── messages/
│   ├── ar.json
│   ├── ckb.json
│   └── en.json
├── scripts/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── menu/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── admin/
│   │   ├── forms/
│   │   ├── menu/
│   │   ├── qr/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   │   ├── auth/
│   │   ├── firebase/
│   │   ├── i18n/
│   │   ├── utils/
│   │   └── validation/
│   ├── services/
│   └── types/
└── tests/
    ├── e2e/
    └── unit/
```

## Firebase Architecture Explanation

Firebase is the only backend. Client components use the Firebase Web SDK for Auth, Firestore reads, Storage uploads, and admin form writes. Server routes and server components use Firebase Admin SDK to verify ID tokens and protect privileged operations. Firestore stores menu data and settings. Storage stores public menu images. Firebase Emulator Suite is configured for local development and tests.

## Firestore Collection Design

- `/categories/{categoryId}`: localized category data, slug, image fields, display order, active state, timestamps.
- `/menuItems/{menuItemId}`: localized item data, category reference, prices as integer minor units, flags, variants, tags, allergens, timestamps.
- `/settings/general`: restaurant branding, contact details, enabled languages, default language and currency.
- `/settings/menu`: public menu visibility and behavior options.
- `/settings/appearance`: colors, radius, layout, default theme.
- `/settings/qr`: main menu QR URL and design.
- `/adminProfiles/{uid}`: approved admin records.
- `/auditLogs/{logId}`: optional admin activity records.

## Firebase Authentication Flow

Admins sign in with Firebase email/password at `/admin/login`. No public registration exists. The app checks the signed-in UID against `/adminProfiles/{uid}` and requires `isAdmin: true`. Admin pages are guarded client-side for UX and server-side where privileged API routes are used. Forgot-password uses Firebase reset email. Password changes require reauthentication with the current password.

## Firestore Security Strategy

Public users can read active categories, public menu items, and public settings. Writes require an authenticated approved admin. Rules check either a custom admin claim or an active `/adminProfiles/{uid}` document. Public reads are constrained by document state. Client validation is backed by rules and server-side validation.

## Storage Security Strategy

Public users can read menu image paths. Writes are limited to authenticated approved admins. Rules validate image MIME type, max size, and permitted paths for logos, covers, categories, menu items, and QR assets. Firestore stores both URL and path so replaced or deleted images can be cleaned up.

## Route Map

- `/`: redirects to `/menu`.
- `/menu`: public multilingual menu.
- `/menu/category/[slug]`: category-focused menu view.
- `/menu/item/[slug]`: item detail view.
- `/admin/login`: admin login and forgot password.
- `/admin/dashboard`: protected overview.
- `/admin/categories`: protected category CRUD.
- `/admin/menu-items`: protected menu item CRUD.
- `/admin/qr-code`: protected QR preview/export/print workflow.
- `/admin/qr-code/print`: protected print-friendly QR page.
- `/admin/settings`: protected settings and password change.
- `/api/admin/session`: token verification endpoint.

## Public Menu Component List

- `MenuShell`
- `MenuHeader`
- `LanguageSelector`
- `ThemeToggle`
- `CategoryTabs`
- `MenuSearch`
- `MenuFilters`
- `MenuItemCard`
- `MenuItemDetail`
- `StatusBadge`
- `PriceText`
- `PublicErrorState`
- `MenuSkeleton`

## Admin Dashboard Component List

- `AdminShell`
- `AdminSidebar`
- `AdminMobileNav`
- `AdminGuard`
- `DashboardStats`
- `CategoryManager`
- `CategoryForm`
- `MenuItemManager`
- `MenuItemForm`
- `VariantEditor`
- `SettingsForm`
- `PasswordChangeForm`
- `QrDesigner`
- `QrPreview`
- `ImageUploadField`
- `ConfirmDialog`
- `Toast`

## QR-Code Workflow

The QR URL is `${NEXT_PUBLIC_SITE_URL}/menu`. Admins can preview, hide/show, copy URL, attempt image clipboard copy with URL fallback, download PNG, download SVG, print, open a print route, customize colors, include logo, edit title/subtitle, reset to defaults, test the link, and open the public menu. The QR renderer uses high error correction, a quiet zone, visible fallback URL, and contrast warnings.

## Translation and RTL Strategy

Messages live in `/messages/en.json`, `/messages/ar.json`, and `/messages/ckb.json`. Content documents store localized fields under `en`, `ar`, and `ckb`. Language choice persists in local storage. `ar` and `ckb` set `dir="rtl"` and `en` sets `dir="ltr"`. Fallback order is selected language, English, then any available translation.

## Phase Checklist

- [x] Phase 1: Planning artifact completed.
- [x] Phase 2: Project setup, TypeScript, Tailwind, shadcn-style UI, Firebase, i18n, emulator config.
- [x] Phase 3: Firebase data layer, models, converters, services, rules, indexes, seed script.
- [x] Phase 4: Authentication, protected admin layout, forgot password, password change.
- [x] Phase 5: Admin dashboard, categories, menu items, settings, QR page.
- [x] Phase 6: Public menu, language switching, RTL/LTR, categories, item details, search, filters.
- [x] Phase 7: QR preview, copy, PNG/SVG download, print layout, customization safety.
- [x] Phase 8: Type checking, linting, tests, security and responsive checks.
- [x] Phase 9: Documentation for setup, development, Firebase, deployment, backup/export.
