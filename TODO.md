# Implementation outcomes

- [x] **Secure roles and authorization:** Support scalable roles beginning with `student` and `super_admin`; use Firebase Authentication custom claims as the trusted authorization source; store appropriate profile data in Firestore; never trust a frontend-selected or edited role; prevent student self-promotion; allow only authorized administrators to assign roles; do not add public admin registration; protect routes, functions, API operations, and database access; provide reusable permissions and a path to add future roles.

- [x] **Academic information:** Require the registration question “أنت في سنة دراسية كام؟” / “What is your current academic year?”; make education options configurable; provide Primary, Preparatory, Secondary, University, and Other choices, relevant grade/year fields, Arabic and English labels, conditional/optional fields, Firestore persistence, and later editing under Profile & Settings; save only fields relevant to the chosen level. Registration and profile saves now enforce the shared validation (`academicDetailsError`): a school level requires a grade and “Other” requires a specified level, guarded both in the UI and in the `signUp` service.

- [x] **Lesson-based learning model:** Make lessons the primary student-facing unit across planning, task descriptions, dashboard cards, statistics, charts, and progress; support lesson title, subject, source file, chapter, description, order, difficulty, estimated/actual duration, scheduled date, status (`not_started`, `in_progress`, `completed`, `delayed`), and notes; keep source page numbers only as internal document-location metadata; retain old page data for compatibility and never delete it merely for migration.

- [x] **Lesson analysis:** Identify subjects, chapters, lessons, titles, descriptions, original order, difficulty, estimated duration, dependencies, and duplicates from uploaded source material; distinguish chapters, lessons, subtopics, exercises, and revision sections; do not invent source content; surface uncertainty/unreadable content; let students edit extracted lessons before planning.

- [x] **Private document library:** Support PDF, DOC, DOCX, JPG, JPEG, PNG, and WEBP with drag/drop and browse, file preview/name/size, upload and processing progress, cancel/retry, and confirmed deletion; make the interface responsive and bilingual. Store files privately; verify ownership; validate MIME type and actual content; enforce size limits; never make private files public; use short-lived access where appropriate.

- [x] **PDF pipeline:** Validate, upload privately, create Firestore metadata, queue background work, extract text and internal page counts, OCR scanned/image-based pages, analyze chapters and lessons, retain source locations, persist structured results, and report status (`uploaded`, `queued`, `processing`, `completed`, `failed`, `requires_review`). Clearly warn on partial processing and never claim full analysis when extraction is incomplete. OCR for scanned/image-only pages and automatic DOC/DOCX/image analysis remain unsupported and are surfaced as review warnings rather than silent failure.

- [x] **Lesson-based planner:** Generate plans from extracted lessons using desired completion period, daily study time, routine, rest days, and preferred session duration; account for difficulty, estimated time, available days, dependencies, and rest; avoid difficult lesson overload; allow preview/edit/approval; preserve existing completed work and avoid silent rescheduling. Routine time-block modeling (e.g., class/work hours) remains a future input.

- [x] **Student dashboard and progress:** Display total, completed, remaining, delayed, and today's lessons, weekly progress, overall progress, and lesson-based charts. Calculate overall progress as completed unique lessons / total unique lessons × 100; avoid duplicate lesson counting. Do not show page count as the primary student metric.

- [x] **Super Admin student management:** Provide authorized student/user/role management, activation/subscription/device/statistics/platform settings/activity log/content capabilities as supported by the existing product; expose student name, phone when available, education level/grade/university details, subscription type/expiration, account status, and registered device; filter by education, grade, subscription/account status; search by name/phone; avoid unnecessary personal-data exposure.

- [x] **Firebase compatibility and security:** Adapt existing collections/models without unnecessary duplicate collections or breaking existing records, authentication, plans, files, or subscriptions; update Firestore/Storage rules and backend together; preserve existing page metadata and user data; keep unconfigured development behavior understandable; add tests for roles, academic selection/editing, lesson extraction and progress, rescheduling, PDF cases/partial failure/ownership, and old-account compatibility. File records are now schema-checked at create/update (allowed key sets, typed MIME/size/name, path/ID ownership), and Storage objects are immutable after upload. Emulator/live compatibility checks remain unrun.

- [ ] **Design and delivery report:** Preserve the app's existing approved design conventions and required palette (#5268E8, #7957D5, #101522, #1A2233, #F5F7FC, #FFFFFF), premium responsive interface, Arabic RTL/English LTR, dark/light themes, clear upload states, professional PDF preview, consistent lesson cards, subtle transitions, and a concise registration step. Report additions/modifications, changed collections/rules, checks that passed, and remaining limitations.

## Status notes

- The administrator can edit bilingual grade choices; the five top-level education levels remain fixed in code.

- The original dashboard had no graph/chart components beyond the overall progress bar; that progress display and all dashboard cards now use lessons.

- OCR, automatic extraction for DOC/DOCX/images, automatic progress percentages for document processing, and non-PDF previews remain unsupported.

- Plans now validate date edits, daily capacity, and prerequisites before saving; a missing uncompleted prerequisite excluded by the subject filter blocks generation.

- Full subscription/device-request/activation-code/system-settings administration and emulator/live-data compatibility checks remain open.
