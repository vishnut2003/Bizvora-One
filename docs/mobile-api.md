# Bizvora Mobile API

REST API for the Bizvora mobile app, served by this Next.js project under
`/api/mobile-app/**`. These endpoints are **only** for the mobile app — the
web app keeps using server actions and cookie sessions.

## Authentication

Token-based (the NextAuth cookie session is not used here).

1. **Login** — `POST /api/mobile-app/auth/login`
   ```json
   { "email": "user@example.com", "password": "…", "device": { "name": "Pixel 8", "platform": "android", "appVersion": "1.0.0" } }
   ```
   → `{ ok, accessToken, refreshToken, expiresIn: 900, user }`
   - `accessToken`: JWT, **15 min** TTL. Send on every request as
     `Authorization: Bearer <accessToken>`.
   - `refreshToken`: opaque, **30 day** TTL, single-use (rotated on refresh).
     Store it in secure storage (Keychain / Keystore).
   - Errors: `401 invalid_credentials`, `400 wrong_provider` (Google-only
     account), `403 account_disabled`.

2. **Refresh** — `POST /api/mobile-app/auth/refresh` with `{ refreshToken }`
   → new `{ accessToken, refreshToken }`. The old refresh token is revoked;
   presenting it again revokes the whole session family
   (`401 refresh_reuse_detected`). Other failures: `401 invalid_refresh_token`.

3. **Logout** — `POST /api/mobile-app/auth/logout` (Bearer required).
   Body optional: `{ refreshToken }` revokes that session, `{ "all": true }`
   revokes every device, empty body revokes the current session. Note the
   access token stays technically valid until its 15-min expiry.

Forgot password (same OTP flow as the web):
- `POST /auth/forgot-password` `{ email }` → always `{ ok: true }`
- `POST /auth/forgot-password/verify-otp` `{ email, code }` → `{ ok, resetToken }`
  (`400 incorrect_code` includes `attemptsRemaining`)
- `POST /auth/forgot-password/reset` `{ email, resetToken, password }`

Sessions: `GET /me/sessions` lists devices (`current: true` marks the caller);
`DELETE /me/sessions/:sessionId` revokes one.

Env var: `MOBILE_JWT_SECRET` (base64, 32 bytes) signs the access tokens.
Rotating it invalidates all mobile access tokens without touching web logins.

## Conventions

- **Success**: `{ "ok": true, ... }`. Creates return `201`.
- **Errors**: `{ "error": "snake_case_code" }` with a proper status.
  Validation failures: `422 { "error": "validation_failed", "fields": { "<field>": "message" } }`.
- **Lists**: `{ ok, items, page, limit, total, hasMore }`. Query params:
  `?page=1&limit=20` (limit cap 100), `?sort=-updatedAt` (whitelisted fields,
  `-` = descending), plus per-resource filters (`q`, `status`, `stage`, …).
- **IDs**: Mongo ObjectIds as strings; documents come back with `id` (not
  `_id`), dates as ISO strings.
- **Partial updates**: `PATCH` merges the provided fields over the current
  document, then runs the same full validation as the web edit form.
- **Workspace scoping**: everything except auth/profile lives under
  `/api/mobile-app/workspaces/:workspaceId/…`. The caller must be a member;
  the effective role decides what's visible (e.g. sales executives only see
  their own leads/customers/vouchers; team members only their projects).
  Common errors: `404 workspace_not_found`, `403 forbidden`,
  `403 workspace_not_active`, `401 token_expired`.

## Endpoints

### Profile & workspaces
| Method | Path | Notes |
|---|---|---|
| GET/PATCH | `/me` | PATCH: `name`, `image` |
| GET | `/me/sessions` · DELETE `/me/sessions/:id` | device sessions |
| GET | `/workspaces` | all memberships, incl. pending (flagged) |
| GET | `/workspaces/:id` | detail + `myRole` |
| GET | `/workspaces/:id/members` | directory; emails only for owner/admin/hr |
| GET | `/workspaces/:id/overview` | role-scoped dashboard metrics |
| GET/PUT | `/workspaces/:id/company` | owner/admin only |
| GET | `/workspaces/:id/notifications` | `?unread=true`, paginated, + `unreadCount` |
| POST | `/workspaces/:id/notifications/read` | `{ id }`, `{ ids: [] }` or empty = all |

### CRM (roles: owner/admin/sales_manager/sales_executive)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `…/leads` | filters: `q, stage (or "open"), priority, source, assignedTo (id/me/unassigned)` |
| GET/PATCH | `…/leads/:leadId` | detail includes notes + activity |
| POST | `…/leads/:leadId/stage` | `{ stage, lostReason? }` |
| POST | `…/leads/:leadId/notes` | `{ body }` |
| POST | `…/leads/:leadId/follow-up` | `{ nextFollowUpAt: "YYYY-MM-DD" \| null }` |
| POST | `…/leads/:leadId/convert` | customer fields optional (prefilled from lead); `409 already_converted` |
| GET/POST | `…/customers` · GET/PATCH `…/customers/:customerId` | filters: `q, status, source, assignedTo` |

No lead/customer DELETE — the web has none (parity rule).

### Projects (roles: owner/admin/project_manager/team_member)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `…/projects` · GET/PATCH `…/projects/:projectId` | create/edit = manager roles |
| GET/PUT | `…/projects/:projectId/team` | PUT `{ team: [userId] }` replaces roster |
| GET/POST | `…/projects/:projectId/tasks` | filters: `status, assignee (id/me/unassigned), milestone` |
| GET/PATCH/DELETE | `…/tasks/:taskId` | full edit/delete = manager roles |
| POST | `…/tasks/:taskId/status` | `{ status }`; team members: own tasks only, "done" lands as `in_review` |
| GET/POST | `…/projects/:projectId/milestones` · PATCH/DELETE `…/milestones/:milestoneId` | manager roles for writes |
| GET | `…/projects/:projectId/files` | list only (no upload in v1) |
| GET | `…/files/:fileId/download-url` | `{ url, kind, expiresAt }`; uploads return a permanent public Blob URL with `expiresAt: null` |

### Finance
Voucher bodies share a wire shape: `partyId/partyName/partyCompany/partyEmail/partyGstin`,
`status`, `currency`, `primaryDate`/`secondaryDate` (order: order/expected date;
invoice: invoice/due date), `discount`, `notes`,
`items: [{ description, quantity, unitPrice, taxRate }]`. Totals are computed
server-side. Numbers (`SO-2026-0001`, …) are allocated automatically.
Receipts/payments use `date`, `amount`, `paymentMode`, `reference`,
`allocations: [{ invoiceId, amount }]` instead of items.

| Method | Path | Notes |
|---|---|---|
| GET/POST | `…/quotations` · GET/PATCH/DELETE `…/quotations/:id` | recipient: `recipientKind (customer/lead/custom), recipientId, recipientName, …`, `terms`, `assignedTo` |
| GET | `…/quotations/recipients?q=` | unified customer+lead picker |
| GET/POST | `…/sales-orders` · GET/PATCH/DELETE `…/sales-orders/:id` | |
| POST | `…/sales-orders/:id/convert-to-invoice` | `409 order_not_convertible` if invoiced/cancelled |
| GET/POST | `…/sale-invoices` · GET/PATCH/DELETE `…/sale-invoices/:id` | DELETE refused with receipts (`409 invoice_has_receipts`) |
| POST | `…/sale-invoices/:id/follow-ups` | `{ note }` — collections log |
| GET/POST | `…/receipts` · GET/PATCH `…/receipts/:id` | allocations recompute invoice `amountPaid`/status; cancel via `status: "cancelled"` |
| GET | `…/recovery` | open invoices + follow-ups; `?bucket=overdue\|due-soon`, `?q=`; summary totals (INR) |
| GET/POST | `…/purchase-orders` · GET/PATCH/DELETE `…/purchase-orders/:id` | owner/admin/accounts only |
| POST | `…/purchase-orders/:id/convert-to-invoice` | |
| GET/POST | `…/purchase-invoices` · GET/PATCH `…/purchase-invoices/:id` | + `vendorBillNumber`; no DELETE |
| GET/POST | `…/payments` · GET/PATCH `…/payments/:id` | vendor-side mirror of receipts |
| GET/POST | `…/vendors` · GET/PATCH/DELETE `…/vendors/:id` | DELETE refused when linked (`409 vendor_has_linked_documents`) |

### HR (employees: owner/admin/hr · payroll: owner/admin/hr)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `…/employees` · GET/PATCH/DELETE `…/employees/:id` | `salaryStructure: { earnings: [{label, amount}], deductions: [...] }`; DELETE refused with payslips |
| GET/POST | `…/payroll/runs` | POST: `{ periodMonth, periodYear, currency, employeeIds, workingDays?, lopDaysById? }`; one run per month (`409 run_already_exists`) |
| GET/DELETE | `…/payroll/runs/:runId` | GET includes payslips; DELETE draft/cancelled only |
| POST | `…/payroll/runs/:runId/approve` · `/mark-paid` · `/cancel` | lifecycle: draft → approved → paid |
| POST | `…/payroll/runs/:runId/payslips` | `{ employeeId }` — draft runs only |
| GET/PATCH/DELETE | `…/payslips/:payslipId` | PATCH: `{ adjustments: { earnings, deductions }, notes? }` |

## Error code catalog

`unauthorized`, `token_expired`, `account_disabled`, `invalid_credentials`,
`wrong_provider`, `invalid_refresh_token`, `refresh_reuse_detected`,
`invalid_workspace`, `workspace_not_found`, `workspace_not_active`,
`forbidden`, `invalid_id`, `invalid_json`, `invalid_body`,
`validation_failed` (+ `fields`), `<resource>_not_found`,
`already_converted`, `number_allocation_failed`, `invoice_has_receipts`,
`order_not_convertible`, `order_has_no_items`, `vendor_has_linked_documents`,
`employee_has_payslips`, `user_already_linked`, `duplicate_employee`,
`run_already_exists`, `run_not_draft`, `run_not_approved`,
`run_not_cancellable`, `run_not_deletable`, `run_has_no_payslips`,
`currency_mismatch`, `employee_already_in_run`, `download_url_failed`,
`save_failed`, `internal_error`.

## Architecture notes (for maintainers)

- Guards: `lib/mobile-auth.ts` (`requireMobileUser`, `requireMobileWorkspace`)
  — JSON mirrors of `requireWorkspaceAccess`; roles resolve per-workspace via
  `getActorRole`, never from the JWT.
- Shared route utilities: `lib/mobile-api.ts` (`withMobile` wrapper, `ok`/
  `fail`, pagination, `serialize`).
- Refresh tokens: `models/mobile-session.ts`, SHA-256-hashed, TTL-indexed,
  family-based reuse detection.
- Domain logic shared with the web: `lib/credentials.ts`,
  `lib/password-reset.ts`, `lib/services/lead-service.ts`,
  `lib/services/customer-service.ts` (their server actions now call these).
  `lib/services/voucher-service.ts` + `app/api/mobile-app/_lib/*` mirror the
  voucher/payroll action logic for mobile (TODO: migrate those actions onto
  the shared service too).
