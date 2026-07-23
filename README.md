# Multilingual Cafe Digital Menu

Multi-tenant digital menu platform for cafes and restaurants. Built with Next.js App Router, TypeScript, Tailwind CSS, Firebase Auth + Firestore, and Cloudflare R2 for images.

## Product model

| Audience | URL |
|----------|-----|
| Cafe staff admin | `/{clientSlug}/admin` |
| Platform supervisor | `/admin` |

The root URL `/` and public cafe-slug URLs return **404**. The application exposes only authenticated platform and cafe administration routes.

Legacy feature routes under `/admin/*` redirect to the platform supervisor at `/admin`.

## Quick start

```bash
npm install
cp .env.example .env.local
# fill Firebase + Cloudflare R2 values
npm run dev
```

Open:

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

- **Admin path:** Firebase Web SDK scoped to `clients/{slug}/…`.
- **Images:** Cloudflare R2 (`docs/IMAGE_STORAGE.md`); nightly Vercel cron cleans expired `imageHistory`.
- **Roles:** full `admin` vs `employee` with per-feature permissions (UI + Firestore rules).

See `docs/` for Firebase setup, development, and deployment.

