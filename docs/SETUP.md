# Setup

## 1. Install

```bash
npm install
cp .env.example .env.local
```

Generate long random values for `SESSION_SECRET`, `CODE_PEPPER`, and `CODE_ENCRYPTION_KEY` before any production use.

## 2. Local development (no Firebase project)

`USE_LOCAL_BACKEND=true` stores Auth, Firestore documents, and files under `.data/`. This is for development only.

```bash
npm run dev
```

Bootstrap creates:

- Super Admin `+201000000000` / `Admin@123456`
- One unused activation code per plan (shown on `/activate`)

## 3. Firebase Emulator Suite

Requires Java 21+.

```bash
USE_LOCAL_BACKEND=false
USE_FIREBASE_EMULATORS=true
FIREBASE_PROJECT_ID=stufy-dev
```

```bash
npm run dev:all
```

Rules and indexes load from `firebase/`.

## 4. Production Firebase (`study-managment-45332`)

The web app config (apiKey, authDomain, appId) is already stored in `.env.local`.
That file is **not** enough for the server. The Admin SDK needs a **service account**.

1. Open [Firebase Console](https://console.firebase.google.com/project/study-managment-45332/settings/serviceaccounts/adminsdk).
2. Enable **Authentication → Email/Password**.
3. Create a **Firestore** database and a **Storage** bucket if they are not created yet.
4. Project settings → **Service accounts** → **Generate new private key**.
5. Save the downloaded JSON as `serviceAccount.json` in the project root (gitignored).
6. Set `USE_LOCAL_BACKEND=false` in `.env.local`.
7. Deploy rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project study-managment-45332
```

8. Restart the app. Bootstrap will create the Super Admin in live Auth + Firestore.
9. Remove `ADMIN_BOOTSTRAP_PASSWORD` from the environment after the first admin exists.

## 5. Optional AI

Set `OPENAI_API_KEY` or `GEMINI_API_KEY` on the server. Document analysis still runs without an LLM; the model only enriches structure and must not invent page numbers.
