# Daily free Stories

The home page displays a circular Story section between the introduction and categories. It stays visible when the feed is empty and offers a working composer. The grid wraps on small screens instead of adding horizontal page scrolling.

Authenticated active users can publish **one free story per calendar day in Asia/Baku**. A story is visible for 24 hours. There is no trial expiry, subscription, payment, or paid promotion in this flow. Existing storage-provider usage charges still apply to the site owner's existing storage account.

Users can upload one JPEG/PNG/WebP image (up to 3 MB), including a screenshot, or select an active listing. They can attach an active SosAvto listing using its number, UUID or canonical link. A listing-only post uses the existing listing photo without making another storage copy. Caption and three visual themes are supported. Ordinary users do not acquire public profile pages through Stories.

The viewer supports previous/next, keyboard controls, touch swipe, press to pause, a pause button, share link, owner deletion, reports and an `Elana bax` link. Links to sold, removed or inactive listings are suppressed. Text is escaped. Image decoding and reencoding strips uploaded metadata.

The server enforces the daily limit inside a transaction with a per-user row lock and a separate `(user_id, day)` quota ledger. Deleting a story cannot reset the allowance. A two-field cursor preserves pagination when timestamps are equal. Expired stories and blocked accounts are excluded from the feed.

The premium admin sidebar contains `Story idarəetməsi`: active story images, authors, report counts, expiry, and a two-step removal action. It uses existing admin authentication and 2FA.

## Database and media

`server/stories-schema.sql` is additive and compatible with the earlier stories branch's table. `scripts/build.mjs` applies it transactionally on production and preview Vercel builds and aborts a deployment if migration fails. Local full-schema initialization includes the same schema. No existing stories, trials or listing media are dropped by migration.

New uploaded images use the existing S3/R2 configuration with keys under `stories/`; local development uses `.data/uploads`. Read requests perform bounded cleanup at most once per warm instance per minute. DeleteObject permission is needed for cleanup. A failed deletion leaves its database row available for a later cleanup attempt. Shared listing photos are never deleted. This is request-driven cleanup, so objects can remain longer than 24 hours when the site has no traffic; visibility still expires exactly on the server.

## Validation

- `npm test`: API integration, real composer-to-API UI integration and existing regression suite.
- `npm run build`: syntax, HTML entrypoints and packaged hosted Android UI.
- Story tests cover guest permissions, listing lookup, invalid uploads, Baku reset time, deletion isolation, simultaneous posts, reports, inactive ads, expiry, tied-cursor pagination, escaped text and migration reruns.

No new environment variable or external paid API is required.
