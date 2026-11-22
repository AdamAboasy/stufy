# Study Management — agent notes

- Stack: Next.js (App Router) + TypeScript + Firebase client SDK (Auth + Firestore). No Express, no `firebase-admin`, no custom server.
- Firebase is only touched from the browser (effects / handlers) through `getFirebase()` in `src/lib/firebase.ts`. It returns `null` when the `NEXT_PUBLIC_FIREBASE_*` variables are missing; the UI then shows a setup notice instead of crashing.
- Data lives under `users/{uid}/subjects` and `users/{uid}/tasks`. Rules are in `firebase/firestore.rules` (owner-only access).
- The planner (`src/lib/planner.ts`) must keep covering every page exactly once and never create empty days. Run `npm test` after changing it.
- Never silently reschedule: replacing a plan requires user confirmation, and completed tasks are never deleted.
- Study time and progress come only from tasks marked done.
- All user-facing text goes through `src/lib/i18n.tsx` (Arabic RTL default, English LTR). Add every new key to both languages.
- Keep dependencies minimal (firebase, next, react, react-dom).
