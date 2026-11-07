# Manual Facebook and Instagram sharing

Status: test branch only; do not merge or enable production without the owner's approval.

Approved, active, non-deleted listings appear in Admin. The admin prepares the caption, selects a platform, and confirms publication. Approval of a listing never publishes automatically. Only public listing title, price, city, link and photo are sent; user email, password, session, phone and private description fields are excluded.

## Existing Meta configuration

- META_FB_PAGE_ID selects the single authorized Page.
- META_ACCESS_TOKEN is the existing secret system-user token. The server resolves the Page token and the Page-linked Instagram account in memory. It never persists derived tokens or returns them to the browser.
- Optional META_FB_PAGE_ACCESS_TOKEN and META_IG_ACCESS_TOKEN override the corresponding platform credential.
- Optional META_IG_USER_ID must match the account linked to the Page. A mismatch blocks publication.
- Existing S3 configuration is reused to prepare a 1080×1080 JPEG from gallery WebP/PNG files. No new service is provisioned. Conversion/uploads run only on a confirmed enabled publication. Output strips image metadata and uses a content-addressed public object key.

## Release gates

SOCIAL_SHARE_ENABLED defaults off. Production additionally requires SOCIAL_SHARE_PRODUCTION_APPROVED=true. Preview currently has SOCIAL_SHARE_ENABLED=false. No automatic publishing worker or moderation hook exists.

META_DIAGNOSTICS=true on this preview enables an optional read-only build check. Admin also has a rate-limited POST /api/admin/social-connection check. Diagnostics return only account IDs, required permission names, validity and redacted errors. Never log raw API bodies or token values. System-user permission inspection uses /me/permissions; debug_token may reject a system token as the inspecting credential, which alone does not prove an invalid token.

Verified on 2026-11-01 against Graph API v26.0:

- Facebook Page 1479681408553895 is reachable.
- Linked Instagram 17841472457536910 is reachable.
- Stored token is valid; pages_read_engagement, instagram_basic, instagram_content_publish and pages_show_list are granted.
- Facebook pages_manage_posts is missing. It must be granted in Meta and the updated secret stored directly in Vercel before Facebook publication can be tested. Never paste the token into chat or GitHub.
- No real Facebook or Instagram post has been created by these tests.

## Duplicate prevention and recovery

An atomic database update claims one listing/platform before any remote publication. The top-level social_shares object is initialized so first publication is actually locked. Concurrent clicks, sent posts and legacy failed attempts are rejected. Instagram container IDs are persisted before media_publish. Successful IDs and audit records are committed together. Any timeout, uncertain response, database failure or other failed attempt remains blocked as publishing or review_required. Listing edits preserve these states.

There is intentionally no automatic retry/reset. Before a maintainer clears a blocked state, inspect the target Meta account and any recorded Instagram container. If a post exists, reconcile its ID as sent. Only after proving that no publication occurred may a maintainer clear that platform state. Never reset unknown outcomes simply because a timeout elapsed.

## Validation and remaining release work

Run npm test and npm run build. Tests use an isolated in-memory PostgreSQL implementation, fake credentials and mocked network/storage requests. They cover authentication, pending listings, concurrent claims, edit persistence, uncertain outcomes, production gates, token redaction, account resolution and JPEG conversion/storage.

Before release: grant the missing Facebook permission; rerun read-only diagnostics; verify the protected preview admin UI with a test admin; authorize a controlled real test post per platform and inspect its image/caption/link. Then obtain the owner's approval to merge main and enable the two production gates. Keep publishing manual. Vercel preview HTTP verification was blocked by the protection/access flow during this session; build and local integration tests passed, but an authenticated preview browser walkthrough is still outstanding.
