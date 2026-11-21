# Deployment

## Checklist

- [ ] Separate production Firebase project
- [ ] Strict Firestore and Storage rules deployed
- [ ] App Check enabled
- [ ] Secrets in Secret Manager / hosting env (never in git)
- [ ] `SESSION_SECRET`, `CODE_PEPPER`, `CODE_ENCRYPTION_KEY` rotated and unique
- [ ] Super Admin provisioned privately
- [ ] Firestore indexes deployed
- [ ] Backup schedule for Firestore
- [ ] Cost and error monitoring

## Hosting

The app is a standard Next.js application. Deploy to a Node-compatible host (Vercel, Cloud Run, or Firebase App Hosting).

Required production variables:

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_STORAGE_BUCKET
FIREBASE_WEB_API_KEY
SESSION_SECRET
CODE_PEPPER
CODE_ENCRYPTION_KEY
NEXT_PUBLIC_APP_URL
USE_LOCAL_BACKEND=false
USE_FIREBASE_EMULATORS=false
```

## Security rules

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Test rules with the Emulator Suite before production. Do not ship open rules.

## Cloud Functions / background work

File processing and plan generation currently run in Next.js route handlers. For large documents, move `processUploadedFile` to Cloud Functions or Cloud Run and enqueue with Cloud Tasks.

## Backups

Enable Firestore daily backups (PITR) on the production database. Storage objects live under `student-files/{studentId}/...` and must remain private.
