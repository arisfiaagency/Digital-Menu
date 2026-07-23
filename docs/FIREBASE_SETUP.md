# Firebase Setup Guide

1. Create a Firebase project (one project hosts all cafe tenants).
2. Enable Authentication with email/password.
3. Create Firestore.
4. Copy Web App config into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
5. Create a service account and copy Admin SDK values (`FIREBASE_ADMIN_*`).
6. Deploy rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

7. Create the platform supervisor profile:

```bash
npm run create-admin -- platform@example.com 'strong-password'
```

This writes `/adminProfiles/{uid}` with `isAdmin: true` and sets the `{ admin: true }` custom claim used by `/admin`.

8. Create a client from the supervisor UI (or `npm run seed`). Tenant staff live under `clients/{slug}/adminProfiles/{uid}`.

## Data layout

- `clients/{clientId}` — cafe account (`slug`, status, defaults)
- `clients/{clientId}/categories|menuItems|settings|…` — tenant data
- `clients/{clientId}/adminProfiles/{uid}` — tenant staff
- `adminProfiles/{uid}` — platform supervisors only
- `usernames/{username}` — username → email lookup (platform or tenant)

## Images

Menu images are stored in **Cloudflare R2**, not Firebase Storage. See `docs/IMAGE_STORAGE.md`. Configure `CLOUDFLARE_R2_*` and `NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL`. Legacy `storage.rules` may still ship with the repo for older Firebase Storage assets.

Firebase App Check should be enabled for production after the hosting domain is known.
