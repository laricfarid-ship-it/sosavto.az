# Daily free Stories

The home page displays a circular Story section between the introduction and categories. It stays visible when the feed is empty and offers a working composer. The grid wraps on small screens instead of adding horizontal page scrolling.

Authenticated active users can publish **one free story per calendar day in Asia/Baku**. Admin accounts have no daily or Story-specific hourly quota (general API abuse protection remains). A story is visible for 24 hours. There is no trial expiry, subscription, payment, or paid promotion in this flow. Existing storage-provider usage charges still apply to the site owner's existing storage account.

Users can upload a JPEG/PNG/WebP image (up to 3 MB), a video, or select an active listing. The composer accepts videos up to 30 seconds and 100 MB and, when needed, compresses them locally to MP4/WebM at up to 720×1280 with audio. The stored video is capped at 3 MB by the server so its base64 request fits the hosting body limit. Browsers without recording support can upload an existing MP4/WebM up to 3 MB. Duration is checked by the composer; the server independently checks size and container signature. The viewer plays muted inline with a sound toggle and pauses with viewer controls or background tabs. They can attach an active SosAvto listing using its number, UUID or canonical link. A listing-only post uses the existing listing photo without making another storage copy. Caption and three visual themes are supported. Ordinary users do not acquire public profile pages through Stories.

The viewer supports previous/next, keyboard controls, touch swipe, press to pause, a pause button, share link, owner deletion, reports and an `Elana bax` link. Links to sold, removed or inactive listings are suppressed. Text is escaped. Image decoding and reencoding strips uploaded metadata.

The server enforces the daily limit inside a transaction with a per-user row lock and a separate `(user_id, day)` quota ledger. Deleting a story cannot reset the allowance. A two-field cursor preserves pagination when timestamps are equal. Expired stories and blocked accounts are excluded from the feed.

The premium admin sidebar contains `Story idarəetməsi`: active story images, authors, report counts, expiry, and a two-step removal action. It uses existing admin authentication and 2FA.

## Database and media

`server/stories-schema.sql` is additive and compatible with the earlier stories branch's table. `scripts/build.mjs` applies it transactionally on production and preview Vercel builds and aborts a deployment if migration fails. Local full-schema initialization includes the same schema. No existing stories, trials or listing media are dropped by migration.

New uploaded images use the existing S3/R2 configuration with keys under `stories/`; local development uses `.data/uploads`. Read requests perform bounded cleanup at most once per warm instance per minute. Explicit deletion immediately removes the object and then its row; failed object deletion retains the expired row for retry. Vercel Cron invokes `/api/stories/cleanup` daily at 20:00 UTC (midnight Baku), including when no visitors open the site; when `CRON_SECRET` is configured it requires the matching bearer token. The endpoint can only delete expired Story media. Previous-day quota ledger rows are also pruned. DeleteObject permission is needed for cleanup. A failed deletion leaves its database row available for a later cleanup attempt. Shared listing photos are never deleted. Visibility expires after exactly 24 hours. Physical deletion runs on the next cleanup pass; with no traffic it can take up to another daily cron interval, and storage failures retain rows for retry. Each pass is bounded (100 rows on reads, 200 on cron); a large backlog drains over subsequent passes. Shared listing photos are never deleted.

## Validation

- `npm test`: API integration, real composer-to-API UI integration and existing regression suite.
- `npm run build`: syntax, HTML entrypoints and packaged hosted Android UI.
- Story tests cover guest permissions, listing lookup, invalid uploads, Baku reset time, deletion isolation, simultaneous posts, reports, inactive ads, expiry, tied-cursor pagination, escaped text and migration reruns.

No new environment variable or external paid API is required.
