# Production Deployment Guide

1. Set all Firebase Web and Admin environment variables in the hosting provider.
2. Set `NEXT_PUBLIC_SITE_URL` to the production domain.
3. Deploy Firestore and Storage rules before opening admin access.
4. Seed initial menu data if needed.
5. Create the first admin in Firebase Authentication and `/adminProfiles`.
6. Deploy the Next.js app.
7. Test `/menu`, `/admin/login`, password reset, image uploads, and QR exports.

Backups can be created with scheduled Firestore exports:

```bash
gcloud firestore export gs://YOUR_BACKUP_BUCKET
```
