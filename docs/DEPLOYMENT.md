# Production Deployment Guide

1. Set environment variables from `.env.example` in the hosting provider (Vercel recommended).
2. Set `NEXT_PUBLIC_SITE_URL` to the production domain (no trailing slash).
3. Optionally set `NEXT_PUBLIC_DEFAULT_CLIENT_SLUG` if you want legacy `/menu` to redirect to a specific cafe.
4. Deploy Firestore rules and indexes (and Storage rules if you still use Firebase Storage):

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

5. Create the platform supervisor:

```bash
npm run create-admin -- platform@example.com 'strong-password'
```

6. Create the first cafe from `/admin` (or `npm run seed -- --client your-slug --name "Your Cafe"`).
7. Create tenant staff:

```bash
npm run create-admin -- staff@example.com 'strong-password' --client your-slug
```

8. Deploy the Next.js app. Confirm Vercel cron for `/api/cron/cleanup-expired-images` (see `vercel.json`) and set `CRON_SECRET` if you want Bearer protection.
9. Smoke-test:

- `/{slug}` welcome and `/{slug}/menu`
- `/{slug}/admin/login` and staff features
- `/admin` platform supervisor
- Image upload (Supabase) and QR download/print

Backups:

```bash
gcloud firestore export gs://YOUR_BACKUP_BUCKET
```
