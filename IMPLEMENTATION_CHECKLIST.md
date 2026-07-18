# Multilingual Cafe Digital Menu — Implementation Notes

The product is multi-tenant.

## Canonical paths

- Tenant admin: `/{clientSlug}/admin/*`
- Platform: `/admin` (+ `/admin/login`)
- Legacy `/admin/{feature}` → `/admin`

## Folders that matter

```text
src/app/[clientSlug]/   # tenant admin
src/app/admin/           # platform supervisor
src/app/api/             # session, users, cron
src/components/          # admin and shared UI
src/lib/firebase/        # client, admin, firestore, rest, auth
src/lib/supabase/        # image storage
src/lib/tenant.ts        # slug helpers + reserved names
messages/                # en, ar, ckb
scripts/                 # seed, create-admin, recompress-images
```

## Firestore (multi-tenant)

All cafe data lives under `clients/{clientId}/…`:

- `categories`, `menuItems`, `expenses`, `completedOrders`, `auditLogs`
- `settings/general|menu|appearance|pos`
- `adminProfiles`, `usernames`

Platform supervisors use root `adminProfiles` + custom claim `admin: true`.

## Auth roles

- Platform supervisor → `/admin`
- Tenant `admin` → full `/{slug}/admin` including users
- Tenant `employee` → feature flags (`dashboard`, `categories`, `menuItems`, `pos`, `reports`, `expenses`, `settings`)

## Storage

Primary uploads: Supabase bucket (`menu-images` by default). Image history expiry is cleaned by `/api/cron/cleanup-expired-images` across all `clients/*/menuItems` (and any legacy root `menuItems`).

## Local bootstrap

```bash
cp .env.example .env.local
npm run seed
npm run create-admin -- you@example.com secret
npm run create-admin -- staff@example.com secret --client demo
```
