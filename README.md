# Multilingual Cafe Digital Menu

Production-oriented digital menu for a cafe or restaurant using Next.js App Router, TypeScript, Tailwind CSS, shadcn-style components, Firebase Authentication, Firestore, Storage, and Firebase Admin SDK.

## Features

- Public `/menu` with English, Arabic, and Kurdish Sorani.
- RTL for Arabic and Kurdish, LTR for English.
- Admin login with Firebase email/password and approved admin profiles.
- Category and menu item CRUD.
- Settings for branding, contact details, menu behavior, appearance, and password changes.
- One main `/menu` QR code with copy, PNG/SVG download, print route, and contrast warnings.
- Firestore and Storage rules, indexes, emulator config, seed script, and tests.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/menu`.

Admin access requires Firebase env vars, an Auth user, and `/adminProfiles/{uid}` with:

```json
{ "email": "admin@example.com", "isAdmin": true, "disabled": false }
```

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run seed
```

See `docs/` for Firebase setup, development, and production deployment notes.
