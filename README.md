# Multilingual Cafe Digital Menu

Multi-tenant digital menu platform for cafes and restaurants. Built with Next.js App Router, TypeScript, Tailwind CSS, Firebase Auth + Firestore, and Supabase Storage.

## Product model

| Audience | URL |
|----------|-----|
| Guest welcome | `/{clientSlug}` |
| Cafe staff admin | `/{clientSlug}/admin` |
| Platform supervisor | `/admin` |

The root URL `/` returns **404** — guests must use a cafe slug (e.g. `/your-cafe`).

Without Firebase Web config (or when the `demo` tenant is missing), `/demo` serves local sample data for previews and e2e.

Legacy feature routes under `/admin/*` redirect to the platform supervisor at `/admin`.

## Quick start

```bash
npm install
cp .env.example .env.local
# fill Firebase + Supabase values (optional for /demo preview)
npm run dev
```

Open:

- `http://localhost:3000/demo` — guest welcome (sample or seeded)
- `http://localhost:3000/admin` — platform supervisor
- `http://localhost:3000/{slug}/admin` — tenant staff

### Bootstrap a tenant

```bash
# Seed clients/demo with settings + sample categories/items
npm run seed

# Or a named client without sample menu:
npm run seed -- --client my-cafe --name "My Cafe" --no-sample-menu

# Platform supervisor (root adminProfiles + admin claim)
npm run create-admin -- you@example.com your-password

# Tenant staff admin
npm run create-admin -- staff@example.com your-password --client my-cafe
```

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e   # expects app on :3000
npm run seed
npm run create-admin
npm run recompress-images
```

## Stack notes

- **Guest welcome:** server-side Firestore REST reads (no Firebase SDK on the guest bundle).
- **Admin path:** Firebase Web SDK scoped to `clients/{slug}/…`.
- **Images:** Supabase Storage; nightly Vercel cron cleans expired `imageHistory`.
- **Roles:** full `admin` vs `employee` with per-feature permissions (UI + Firestore rules).

See `docs/` for Firebase setup, development, and deployment.
