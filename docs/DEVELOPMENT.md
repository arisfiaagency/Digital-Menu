# Development Guide

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Useful URLs:

- `/` — not found
- `/admin` — platform supervisor
- `/{clientSlug}/admin` — tenant staff after creating a client

## Checks

```bash
npm run typecheck
npm run lint
npm run test
```

End-to-end (dev server must already be running on port 3000):

```bash
npm run test:e2e
```

## Seed and admins

```bash
# Default: clients/demo with sample menu
npm run seed

npm run seed -- --client stone --name "Stone Cafe"
npm run seed -- --client stone --no-sample-menu

npm run create-admin -- platform@example.com secret
npm run create-admin -- staff@example.com secret --client stone --role admin
```

Client creation from `/admin` also seeds default settings (general, menu, appearance, POS) under `clients/{slug}`. Sample categories/items come from `npm run seed` (or staff CRUD).

Tenant admin routes require Firebase configuration, Firebase Auth, and an approved admin profile.
