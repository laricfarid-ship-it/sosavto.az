# SosAvto admin listing review — implementation log

## Scope and safety
- Work branch: `feat/admin-listing-review`
- Base: `main`
- Production branch and live site are not changed by this work.
- No paid AI/API provider is activated. This first pass uses deterministic database-backed rules only.
- Risk flags are advisory. They must not automatically reject or publish a listing.

## Audit findings
- `admin.html` routes into the shared `assets/app.js` application.
- `api/index.mjs` already has a protected `/api/admin` endpoint guarded by `requireAdmin(user)`.
- Existing moderation actions support approve/reject with a rejection reason, user blocking, reports and audit log entries.
- `server/schema.sql` already has `audit_logs`, `reports`, `images`, listing status and admin 2FA tables.
- The existing pending queue showed listing title/price and approve/reject actions, but no structured risk signals.
- The README says AI remains disabled without explicit server configuration and that production integrations require separate verification.

## Implemented in this branch so far
- Added `server/moderation-review.mjs` with deterministic signals:
  - missing listing photos;
  - possible duplicate title/image across pending or active listings;
  - five or more pending listings on the same account;
  - price far below/above the median of comparable active car listings when enough reference data exists.
- Added `tests/moderation-review.test.mjs` for clear, missing-image, duplicate, account-volume, price-outlier and malformed-metric cases.
- Extended the admin queue API to return seller name, image count, duplicate count, pending count, reference price and a computed advisory review result.
- Updated the admin queue cards to show the review result and explain the reasons.

## Important limitations
- These are rule-based warnings, not AI, not proof of fraud, and not a vehicle history/legal ownership check.
- A new account, unusual price or missing image alone must not be treated as proof of wrongdoing.
- The price comparison depends on the quantity and quality of active comparable listings. When no comparison set exists, no price warning is shown.
- The full Vercel test/build command passed on commit `654feec6bc85ab452b31cc7e9c0c5cf3e5163710`; all six new rule tests passed.
- A Vercel preview is READY at `https://sosavto-az-git-feat-admin-listing-review-laricfarid-ship-it.vercel.app`.
- Interactive visual review with an isolated preview database is still outstanding because preview protection/environment settings need verification.
- Do not merge to `main` or enable paid AI without owner approval.

## Next steps
1. Run the full test suite and build in a clean environment.
2. Fix any failures, then inspect the Vercel preview without changing production.
3. Review the query cost and add indexes/migrations only if tests or realistic data show they are needed.
4. Later, consider AI-assisted text/image checks behind an explicit feature flag and budget guard, still requiring admin review at first.
