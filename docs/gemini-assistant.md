# Gemini assistant Preview

Owner authorized free-tier Gemini on 2026-09-30 (Baku) and supplied a screenshot
showing Free Tier. Secret is supplied by owner in Vercel Preview as GEMINI_API_KEY;
never put it in Git, chat, browser assets or logs.

This branch is based on main, independent of the paused PR #9 photo analysis.
Only text questions and listing descriptions are supported. No search, images,
tools, attachments, automatic model fallback or request retry. The assistant has
no access to listings/accounts and does not retain conversation context.

Preview chooses Gemini when GEMINI_API_KEY exists. The fixed pilot model is
`gemini-3.1-flash-lite` (standard free-tier input/output listed on official pricing
on 2026-09-30). The owner approved production rollout after a successful live response on
2026-09-30. Gemini requires GEMINI_API_KEY in each target environment. AI_ENABLED=false disables
both providers. Existing explicitly configured OpenAI behavior remains available,
but errors from Gemini never fall back to it.

Before sending text the UI explains Google free-tier data use and asks consent;
the API also requires consent=true for Gemini. Credentials are in request headers,
never URLs. Only sanitized provider errors are returned. Timeout is 20 seconds,
output limit is 700 tokens. Existing auth/CSRF and 20 requests/account/day,
200 globally/day remain, plus 5 global requests/minute. These application limits
are not Google quota guarantees and cannot enforce Google billing status. Keep
Google project billing disabled; the screenshot proves only its observed state.

Validation: 88 automated tests and build passed. Local real Chromium UI tests at
1280/390 px use a synthetic provider and an in-memory DB. They cover consent
cancel/accept, an actual local API response, quota failure without retries,
no horizontal overflow and no uncaught page errors.

Run tests/gemini-browser.mjs with PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE, or
an installed Playwright/browser. It rejects production and makes no provider calls.

Live Preview verification is separate: check /api/config, sign in to an authorized
test account on an isolated preview database with an exact APP_ORIGIN, submit one
non-sensitive car question, then confirm its actual answer. No automatic account
creation or production DB mutation is part of verification.

References:
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/pricing

2026-09-30: live owner test returned MODEL_UNAVAILABLE for 2.5 Flash-Lite.
Switched the fixed model to stable 3.1 Flash-Lite after verifying its official
standard free-tier text input/output pricing. No fallback or billing change.
Live response with the replacement model still requires verification.

Production approval: only signed-in active accounts may send assistant requests.
Guest UI is disabled and direct unauthenticated API calls return 401 without
contacting Gemini. Photo-analysis PR #9 remains paused and excluded.
