# Ledgerly Billing

A JavaScript-only Next.js billing ledger using Firebase Authentication and Firestore.

## Setup

1. Create a Firebase project and enable **Email/Password** in Authentication.
2. Create a Firestore database.
3. Copy `.env.example` to `.env.local` and fill in the Firebase web app values.
4. Install and run:

```bash
npm install
npm run dev
```

5. Deploy `firestore.rules` using the Firebase CLI before production use.

The first user can register from the login screen. Each authenticated user's data is isolated under `users/{uid}`.
