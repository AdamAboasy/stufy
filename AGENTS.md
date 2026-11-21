# Stufy agent notes

- Source of truth: the Smart Study Planner specification in the project brief.
- Architecture: static HTML/CSS/JS frontend in `public/`, Node.js (Express) backend in `server/`. No React, no build step.
- Do not put secrets in client code. Sensitive writes go through `/api` + Admin SDK.
- Local development uses `.data/` when `USE_LOCAL_BACKEND=true`.
- Production uses Firebase Auth, Firestore, and Storage with the rules in `firebase/`.
- Arabic is RTL; English is LTR. Persist language in the `stufy_lang` cookie.
- Study hours come only from recorded sessions and completed tasks.
- Never invent page numbers or silently reschedule a confirmed plan.
