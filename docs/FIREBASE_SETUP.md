# Firebase Setup Guide

1. Create a Firebase project.
2. Enable Authentication with email/password.
3. Create the first admin user manually in Firebase Authentication.
4. Create `/adminProfiles/{uid}` in Firestore with `isAdmin: true` and `disabled: false`.
5. Enable Firestore and Storage.
6. Copy Web App config values into `.env.local`.
7. Create a service account and copy Admin SDK values into `.env.local`.
8. Deploy rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Firebase App Check should be enabled for production after the hosting domain is known.
