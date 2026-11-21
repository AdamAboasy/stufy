# Study — Smart Study Planner

A complete **HTML / CSS / vanilla JavaScript** study-planning SaaS, served by a lightweight
**Node.js (Express)** backend. No React, no Next.js, no build step.

Upload educational materials (PDF / Word / images), and Study extracts the structure,
pages, and topics, then builds a realistic, page-accurate study plan that respects rest
days, routines, and your daily study time.

## Features

- **Auth**: phone + password sign-in, activation-code onboarding, device locking, password recovery.
- **Library**: upload materials, automatic extraction with chapter/topic detection and LLM enrichment.
- **Plans**: generate a day-by-day study plan, recalculate the schedule, start/complete sessions.
- **Tasks / Calendar / Routine**: today's tasks, a per-day calendar view, and routine blocks that plans never overlap.
- **Statistics**: completion, weekly study time, pages, progress by subject.
- **Subscriptions**: weekly / monthly / quarterly / yearly activation codes, renewals, suspension.
- **Admin panel**: overview, students, activation codes (generate / reveal / revoke), subscriptions, device requests, file jobs, activity logs, platform settings.
- **i18n**: Arabic (RTL) and English, toggled live.
- **Themes**: light / dark / system.

## Tech stack

- **Frontend**: plain HTML, CSS, and JavaScript (single-page app with client-side routing).
- **Backend**: Node.js + Express. All API routes live in [`server/index.js`](server/index.js).
- **Storage**: local file-backed store under `.data/` (no external services required). The
  same service layer mirrors Firestore collections, so it can be pointed at live Firebase.
- **AI**: deterministic document extraction (`unpdf` + `mammoth`), optional LLM enrichment via
  OpenAI/Gemini if `OPENAI_API_KEY` / `GEMINI_API_KEY` is set.

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

### Default accounts (local backend)

| Role | Phone | Password |
|---|---|---|
| Super Admin | `+201000000000` | `Admin@123456` |

The bootstrap also creates one demo activation code per plan type on first run (logged to
the console).

### Master admin code

Entering the master code **`27022010`** at the activation step creates an **admin / manager**
account instead of a student account. Only the manager holds this code — it is never listed in
the admin's code panel and is not a subscription code. Regular users can only get access with a
plan code that the manager generates and approves. The code can be changed with
`ADMIN_ACTIVATION_CODE` in the environment.

**Manager sign-in (fast path):** on the sign-in page, enter your **phone number** and the master
code **`27022010`** as the password and sign in. If the account does not exist yet it is created
for you automatically, and you land in the admin panel directly.

### Admin-only mode

The app ships with **admin-only mode enabled**: only admins/managers can sign in or register, and
all student endpoints are blocked. Toggle it off from **Admin → Settings → Access mode** when you
want to admit students again.

## Project structure

```
server/            Express backend
  index.js         All API routes + static file serving
  local.js         File-backed Firestore/Auth/Storage emulation
  db.js            Collection abstraction & helpers
  session.js       JWT sessions (jose)
  crypto.js        Code hashing, encryption, tokens
  config.js        Firebase web config from env
  services/        auth, codes, plans, routines, stats, subscriptions, devices, files, logs, notifications, planner, extract
public/           Static frontend (HTML/CSS/JS)
  index.html       SPA shell
  css/styles.css   All styling
  js/i18n.js       Translations loader
  js/api.js        Fetch wrapper
  js/ui.js         Icons, toasts, modals, formatters
  js/app.js        Router + all page renderers
  locales/         en.json, ar.json
.data/            Local storage (created at runtime, gitignored)
```

## Environment

See [`.env.example`](.env.example). The server auto-loads `.env.local`.

- `USE_LOCAL_BACKEND` — `true` (default) uses the file-backed store; `false` requires Firebase Admin credentials.
- `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, and the `NEXT_PUBLIC_FIREBASE_*` vars configure
  the Firebase web app (`study-managment-45332`).
- For live Firebase, place `serviceAccount.json` in the project root and set `USE_LOCAL_BACKEND=false`.

## Deployment

The app is a static frontend plus a Node server. Run it with any Node 18+ host:

```bash
npm start
```

Serve `public/` from any static host and point it at the Node API, or run the single Node
process which serves both. No build step is required.
