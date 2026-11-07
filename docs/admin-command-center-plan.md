# SosAvto Admin Command Center — implementation plan

Branch: `feat/admin-command-center`. Do not merge or deploy without founder approval.

## Existing foundation (verified on main)
- `admin.html` is a shell rendered by `assets/app.js`.
- PostgreSQL `listings` supports pending, active, rejected, sold, archived.
- `notifications`, `audit_logs`, admin TOTP, admin push subscriptions exist.
- `server/service-access.mjs` restricts SOS and carwash to verified founder admin (except isolated local tests).
- Android UI and test tooling live under `mobile/`.

## Delivery phases
1. Inventory admin routes, auth middleware, existing listing actions and UI. Build admin-only dashboard read endpoints with actual database aggregates (never demo counts).
2. Build responsive premium dashboard with summary KPIs, listing status/category filters, moderation queue, growth trends, and accessibility/mobile checks.
3. Add admin-owned notes, priority and stage history to listings and service businesses using additive SQL migrations, validated write endpoints, audit logs, and admin-only authorization. Do not expose private notes publicly.
4. Add Instagram/Facebook **manual** publishing queue with statuses draft/queued/publishing/published/failed; do not claim auto-posting until Meta tokens and permissions are verified. Never put tokens in frontend or repository.
5. Add service-map business management with verification, status and categories; do not invent business records.
6. Add notification center and mobile-app task tracker with stage/priority/comments; link to GitHub PRs where available.
7. Add tests for permissions, filters, CSRF/session, 2FA continuity, responsive layout, and regression checks. Create Vercel preview, review, then request approval for production.

## Invariants
- SOS and Avtoyuma remain closed to ordinary users; verified founder admin retains access.
- Do not modify existing category icons, public styling or current listing behavior as part of this feature.
- No paid API integration, secrets, or credentials added.
- Existing admin authentication and 2FA must remain intact.
- Production is not changed without explicit review and approval.
