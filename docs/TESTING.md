# Testing

## Local emulator workflow

1. Start the Firebase Emulator Suite and the Next.js app (`npm run dev:all`).
2. Bootstrap creates a Super Admin and one demo activation code per plan.
3. Open the activation page. In emulator mode the demo codes are listed.
4. Register a student, then walk through library → plan → tasks.

## Activation codes

| Case | Expected |
|---|---|
| Weekly / monthly / quarterly / yearly | Subscription expires in 7 / 30 / 90 / 365 days from activation |
| Invalid code | `INVALID_CODE` |
| Already used, revoked, suspended | `CODE_UNAVAILABLE` |
| Two simultaneous activations | Firestore transaction allows only one |

## Subscriptions

| Case | Expected |
|---|---|
| Renew before expiration | `new = current expiration + duration` |
| Renew after expiration | `new = now + duration` |
| Suspend / expire | Student data remains; planning APIs return 403 |
| Revoke | Cannot renew a revoked subscription |

## Devices

| Case | Expected |
|---|---|
| First registration | Device cookie issued, device stored hashed |
| New browser without cookie | Login returns `deviceMismatch` |
| Approve request | Old device revoked, refresh tokens revoked |
| Reject request | Old device stays active |

## Files

| Case | Expected |
|---|---|
| PDF / DOCX | Text extracted, chapters stored |
| Spoofed extension | Rejected by magic-byte check |
| Oversized file | `FILE_TOO_LARGE` |
| Unreadable / image without OCR | `failed` or `requires_review`, never silent |

## Study planning

Run the deterministic planner checks:

```bash
npx tsx --tsconfig tsconfig.json src/services/ai/planner.test.ts
```

| Case | Expected |
|---|---|
| Rest days | No tasks scheduled |
| Routine blocks | Available minutes exclude those windows |
| Page numbers | Never outside extracted ranges |
| Reschedule | Completed tasks stay, unfinished tasks move |

## Security

Use the Emulator Suite with the committed rules in `firebase/firestore.rules` and `firebase/storage.rules`.

- Students cannot read another student's documents.
- Students cannot write `role`, `subscription`, or activation codes.
- Sensitive writes are backend-only (Admin SDK).
- Session cookies are httpOnly.
- Activation codes are stored hashed (and optionally encrypted for admin export).
