# Security hardening — 2026-09-28 (Baku)

This is a scoped application review, not a penetration-test certification or a
claim that the service cannot be attacked. Production platform settings require
separate verification. No paid service was enabled.

## Implemented

- Upgraded `sharp` from the vulnerable 0.34 series to 0.35.5. The production
  dependency audit reports no known advisories at the time of this change.
- Image uploads verify decoded format as JPEG, PNG or WebP, retain the 3 MB
  input/40 million pixel limits, and re-encode to WebP without metadata.
- Database-backed limits apply across serverless instances: 300 API requests
  per minute per network address, 60 auth attempts per 15 minutes per address,
  10 signup attempts per hour per address and 120 mutations per minute per user.
  Existing narrower operation limits remain. A 429 response includes Retry-After.
- On Vercel, only `x-vercel-forwarded-for` is trusted for the network bucket.
  Other hosts use the socket peer. IPv6 /64 addresses share a bucket. Missing
  trusted addresses share an `unknown` bucket; they do not bypass limits.
  Shared Wi-Fi/mobile NAT users can share limits; monitor false positives before
  changing limits. This application limit is not a substitute for edge DDoS/WAF
  protection and still consumes a database query for rejected traffic.
- Normal JSON bodies are limited to 64 KiB, uploads to 4.5 MB including encoding.
  Malformed, array, null and scalar bodies return 400. Streamed UTF-8 and Vercel
  pre-parsed/string bodies are handled consistently.
- Invalid inherited property names cannot enter SQL sort choices or wash quotes.
- Map JavaScript/CSS are served from existing local assets. CSP no longer trusts
  a third-party script CDN. Permissions-Policy allows same-origin geolocation
  and disables unused camera, microphone and browser payment capabilities.
- CI runs a high/critical production-dependency advisory gate on changes.

## Verified existing safeguards

The test suite covers server-side admin checks, cross-account listing edits and
deletion, ownership of uploaded images, cross-origin mutation rejection,
moderation before publication and after listing edits, participant-only booking
access, server-calculated prices, booking state transitions, and session
revocation after banning/password changes. Signup cannot set an admin role.

Validation: 81 passing tests, successful production build and production
dependency audit with zero known findings. A limited pattern scan of current
tracked files found no private keys or recognizable service credentials. It did
not scan full Git history or runtime environment values. Automated checks do not
establish absence of all vulnerabilities.

## Still requires account/platform access

The connected Vercel tool returned no authorized teams and denied access to this
deployment. Do not mark the following as enabled or verified based on this PR:

1. MFA/passkeys on owner email, GitHub, Vercel, database and storage accounts.
   The owner must enroll their own device and retain recovery codes privately.
2. PostgreSQL backups/PITR and a separate protected backup destination, plus
   image-object backups. Git source history is not a database or image backup.
   Review existing provider plans before choosing anything that costs money.
3. Restore drill into an isolated database and private object namespace. Verify
   schema, record counts, ownership relationships and sample images before
   relying on backups. Never test restore against the live database.
4. WAF settings, bot/abuse controls and usage/budget alerts; alert delivery must
   be tested. Public response headers alone do not verify these settings.
5. Least-privilege database/storage credentials, credential rotation policy,
   production/preview environment separation and deployment permissions.
   Preview code must not receive production credentials for untrusted changes.
6. Protected main branch and required CI checks, account collaborator review,
   secret scanning/history scan and ongoing vulnerability/incident monitoring.
7. Scheduled cleanup of expired sessions/rate-limit rows with bounded batches.
   Expired records are already ineffective, but otherwise remain in storage.

## Incident recovery order

Preserve logs; contain the affected credential/account or endpoint; revoke
compromised sessions/keys; identify and fix the entry point; restore verified
data into an isolated environment when needed; validate before switching live;
then monitor. Rolling back a deployment only rolls back code, not lost data.

References:
- https://vercel.com/docs/headers/request-headers
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://github.com/advisories/GHSA-f88m-g3jw-g9cj
- https://github.com/advisories/GHSA-rgj7-g3m4-5g8c
