# Smart Study Planner implementation plan

## Baseline and constraints

The existing app is Next.js App Router with Firebase Authentication and browser-only Firestore access. Existing records live under `users/{uid}/subjects` and `users/{uid}/tasks`; tasks store page ranges. Firestore rules currently permit only a signed-in owner to read/write their subtree. The Firebase project alias points at `study-managment-45332`. There is no Firebase Admin SDK, Cloud Functions, Storage rules, server API, roles UI, or document-processing pipeline.

## Approach

Preserve the current Next.js/Firebase client integration and the existing page records. Add an isolated Firebase Functions backend for trusted user-role/claim operations and document processing; no browser code may assign roles or trust a profile role for authorization. Custom claims are authoritative, and the initial Super Admin is provisioned only through a private operator/CLI process, never public registration. Tighten Firestore and Storage rules so a student's own data remains owner-scoped and profile roles/processing states cannot be self-promoted or forged.

Extend student profiles additively with education fields, and collect a required education level during sign-up. Keep legacy page tasks and page references intact while moving student-facing planning/progress to lesson records. Add an upload library backed by private Firebase Storage and user-owned Firestore metadata; processing must report failures/partial extraction rather than presenting a false success. Structure lesson planning as a pure function so schedule rules can be tested without touching Firebase data.

Retain the current bilingual Arabic RTL/English LTR, light/dark theme, and component conventions, expanding the established interface rather than replacing the app. Protect admin routes and operations by claims and reusable permissions, and keep student and Super Admin interfaces distinct.

## Project structure

- `src/app/(app)/...`: student dashboard, library, subjects/lessons, plan, tasks, profile settings, and protected administration pages.
- `src/components/`: reusable academic selector, lesson cards, document upload/status components, and existing auth/navigation components.
- `src/lib/types.ts`: additive profile, uploaded-file, lesson, and legacy task models.
- `src/lib/permissions.ts`: role/permission definitions and reusable checks.
- `src/lib/data.ts`: owner-scoped Firestore subscriptions and mutations; do not delete/mutate legacy page data as a side effect.
- `src/lib/lesson-planner.ts` and `src/lib/progress.ts`: dependency-aware lesson scheduling, preview validation, and unique-lesson metrics; legacy page planning remains in its existing path only as needed for compatibility.
- `functions/`: Admin SDK callable/trigger code for claims, admin-only role changes, and private upload processing.
- `firebase/firestore.rules`, `firebase/storage.rules`, and `firebase.json`: authorization/deployment declarations; source changes only, no live deployment in this task.

## Delivery boundary

Work on an isolated feature branch. Validate with typecheck, unit tests, and a production build where dependencies permit. Do not deploy Functions or rules, write/delete production Firebase records, publish the app, or push to the default branch. Any external AI/OCR credentials or cloud APIs must be configured by the project owner before live processing can run.
