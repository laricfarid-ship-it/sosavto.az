# SOS Yol Yardımı — isolated testing branch

Built on `e12607be6e52dcc1e49603edee0f281f71a4f4f4` in `feat/sos-roadside`.
No production database migration, production setting change, paid service, or release was performed.
`SOS_ENABLED` defaults to disabled. Do not merge/release until Farid has reviewed a private test environment.

## Implemented

- `/sos.html`: six real problem types, GPS/manual map point/coordinate input, contact and notes, persistent request history.
- `/sos-usta.html`: master application, administrator approval, specialty matching, online/offline and foreground GPS updates.
- Administrative approval and suspension in SOS pages for existing admin accounts, with audit logs.
- PostgreSQL requests, dispatches, event history, reviews; uses existing users, sessions and notifications.
- Up to ten eligible masters within 8 km, straight-line distance. Masters must be approved, unbanned, online, not busy, and have a location less than 90 seconds old.
- New online masters also receive still-searching calls. Declined offers are not resent.
- A master provides arrival/labor/parts fees and an ETA. Driver explicitly confirms before `en_route`.
- Arrival by master, completion and review by driver, cancellation with reason by participants.
- Notifications stored in the existing account notification list. UI polls every 5 seconds while visible. This is not WebSocket/Supabase Realtime or push delivery.
- Live master position is shown only to the assigned driver, after quote confirmation, during travel/arrival and while fresh.
- GPS heartbeat every 25 seconds; old positions are excluded. Background mobile tracking is not guaranteed.
- Searching and unconfirmed offers expire after five minutes. Expiry is reconciled by SOS API activity, including polling; no paid scheduler.
- Duplicate creation protected by client UUID and active-driver index; acceptance locks request/account/master and is protected by active-master index.
- Exact driver address/phone/coordinates stay hidden from dispatched and unconfirmed masters, including expired/cancelled unconfirmed offers.
- Server-side auth, ownership, CSRF, throttles and validation. RLS enabled with no public policies; server must use the table owner or a suitably scoped privileged backend role. Never give the browser database credentials.
- Leaflet 1.9.4 vendored locally with its license. OSM tile images still require internet; GPS/manual coordinates remain usable when imagery is blocked.

## Local testing

Use an isolated local database; **do not export the production DATABASE_URL**.

```sh
npm ci
mkdir -p .data
export LOCAL_DATABASE=true
export SOS_ENABLED=true
export APP_ORIGIN=http://localhost:4173
npm run migrate
npm run migrate:sos
npm run dev
```

Create separate driver, master and administrator accounts. Promote only the local administrator using the existing `npm run admin` command (see main README). No hardcoded production credentials or auto-approved real masters are included.

Test through the UI: master applies → admin verifies and approves → master goes online with location permission → driver submits a matching nearby problem → master submits fees and ETA → driver confirms → master marks arrival → driver completes and reviews. Reload both pages to confirm persistence. Confirm decline, cancellation, stale GPS, disabled feature, and no-master expiry.

Production migration is separate from `server/schema.sql`; ordinary marketplace migration does not enable SOS. `SOS_ENABLED=false` immediately hides navigation and blocks SOS API operations. Do not disable while real jobs are active without arranging manual completion/support.

## Verification performed

- `npm test`: 46 tests, including ten SOS integration scenarios using isolated PGlite (PostgreSQL engine); existing marketplace/frontend/VIN tests retained.
- `npm run build`: syntax, HTML shells and static build output checked.
- Chromium browser with three real local accounts: login, master application, admin approval, GPS permission (test coordinates), dispatch, quote, confirmation, arrival, completion, review and reload persistence.
- Desktop and 390px mobile screenshots in `docs/images/`; no horizontal overflow or uncaught page errors in the end-to-end check.
- Request acceptance contention covered by concurrent API test calls. PGlite serializes transactions; repeat contention tests against the actual isolated hosted PostgreSQL service before release.
- Map library runs locally. OSM imagery could not be verified in the restricted test network; this remains an external-environment acceptance check.
- Real phone calls, background push delivery, and real-world technician arrival were not tested or simulated as successful.

## Private online acceptance environment still required

The Vercel app connection returned HTTP 400 (`Invalid MCP request metadata`) in this session. A private hosted test URL and an isolated hosted database were not provisioned. Do not point a preview at the production database.

When access works: use a protected preview with separate PostgreSQL, set its own `APP_ORIGIN`, apply the base and SOS schemas there, enable SOS only there, and repeat the two-phone/three-account flow. Verify location permissions, OSM tile access and simultaneous accepts against hosted PostgreSQL. Production rollout remains subject to Farid's later approval.

Not part of this SOS increment: insurance-provider integration, email/push notifications, automatic route/traffic ETA, photo attachments, payments, parts-demand alerts, listing age reminders, or a financial CRM. Ratings are genuine completed-order reviews; no seeded public ratings or made-up technicians.
