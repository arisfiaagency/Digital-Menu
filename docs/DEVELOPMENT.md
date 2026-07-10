# Development Guide

Run the application:

```bash
npm install
npm run dev
```

Run checks:

```bash
npm run typecheck
npm run lint
npm run test
```

Run end-to-end tests in a second terminal while `npm run dev` is running:

```bash
npm run test:e2e
```

Seed development data:

```bash
npm run seed
```

The public menu renders local sample data when Firebase Web config is missing. Admin routes intentionally require Firebase Authentication and approved admin profiles.
