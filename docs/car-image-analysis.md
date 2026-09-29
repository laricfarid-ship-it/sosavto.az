# Three-view car analysis — implementation and release gate

## Status

Implemented behind an explicit OFF-by-default flag. No paid provider calls have
been made during development. This is NOT yet a validated vehicle recognizer and
must not be described as live or accurate based on mocked tests.

The existing plain-JavaScript/Vercel application uses `/api/index.mjs`, not the
Next.js App Router. `/api/analyze-car` is routed through that existing handler.
The Anthropic Messages HTTPS API is called server-side with structured JSON
output; an extra SDK dependency is not required.

## User flow

1. Signed-in eligible user opens `elan-ver.html`, category **Avtomobillər**.
2. Adds separate front, rear and interior photos. All three are required for AI;
   manual listing entry continues to work without AI or these three views.
3. Browser checks JPEG/PNG/WebP, up to 12 MB and 20 megapixels per file, then
   resizes to at most 1280×960 and strips metadata by re-encoding as JPEG.
   HEIC is explicitly not supported in v1; the user is told to use JPEG.
4. User explicitly agrees to send the three photos to Anthropic and starts analysis.
5. Server checks authentication, origin, audience, body size, valid/unique roles,
   actual image format/dimensions and normalized duplicate images. It strips
   metadata again and asks the model to assess image roles and vehicle consistency.
6. Invalid, conflicting or uncertain views produce no applicable suggestions.
   High/medium qualitative suggestions are checked against site brand/model and
   color/body catalogs. Unknown models remain manual; no fuzzy model substitution.
7. User reviews a checkbox for each proposed field. Existing values start unchecked.
   Applying cannot create an inconsistent brand/model pair or overwrite edits
   made after review. Year, mileage, price, engine and condition are never inferred.
8. On explicit apply, the three photos are also uploaded through the existing
   authenticated upload endpoint into the listing gallery (8-photo limit remains).
   Partial upload retries reuse successful uploads. Photo removal/primary-photo
   controls remain available. Normal listing submission still requires moderation.

Image consistency and confidence are model judgments, not identity/ownership
proof or calibrated accuracy percentages. Different encodings/crops of the same
photo may evade exact duplicate detection; the model's role assessment is also
fallible. Multiple similar cars, rebadging, aftermarket parts and poor photos
require real-world evaluation before public release.

## Persistence, limits and failures

`car_analyses` stores an ID before each paid call, owner, model/prompt version,
image fingerprints, status, raw text output, validated result, token usage and
optional estimated USD cost. It does not store submitted base64 photos. A result
is retrievable only by its owner at `/api/car-analyses/:id` and can be reopened at
`/elan-ver.html?analysis=:id`; photo selections themselves do not survive refresh.

Same client key plus different pictures is rejected. Same account/pictures/model
within 24 hours reuses completed output. Pending requests do not start a second
provider call. An interrupted attempt older than 90 seconds is marked failed when
the next POST is processed; it is never silently replayed. Provider timeout is
20 seconds with no automatic paid retries.

Pilot limits: two provider attempts per account per rolling 24 hours (including
failed calls), 10 endpoint requests/minute/account, 20 potential provider calls
per global 24-hour rate-limit window, 1600 max output tokens/call. These are usage
limits, NOT a guaranteed money cap or a replacement for provider billing limits.
Provider billing remains authoritative. Raw results are private and must be
covered by the platform's retention/deletion policy before public release.

## Configuration and safe rollout

Keep `CAR_ANALYSIS_ENABLED=false` until the owner approves paid API use. Keep the
key secret in Vercel server environment variables, never chat, Git, HTML or a
browser bundle. Neither an existing key nor deployment alone grants spending
approval.

Required settings after approval:

- `ANTHROPIC_API_KEY`: owner's secret provider credential.
- `ANTHROPIC_MODEL`: explicit vision + structured-output-capable model ID; the
  documented `claude-sonnet-4-6` is one candidate to evaluate, not an activated default.
- `CAR_ANALYSIS_ENABLED=true`.
- `CAR_ANALYSIS_AUDIENCE=admin` for the first real-photo pilot; only change to `all`
  after acceptance. Both the UI and API enforce the audience.
- Optional current `CAR_ANALYSIS_INPUT_USD_PER_MILLION` and
  `CAR_ANALYSIS_OUTPUT_USD_PER_MILLION` for an estimate. Unknown prices stay null.

Apply `npm run migrate:car-analysis` to an isolated preview database first.
Production builds also apply the additive schema when the flag is explicitly on.
Use a preview origin in APP_ORIGIN; never grant untrusted previews production DB
credentials. No deployment or user registration enables this feature implicitly.

## Verification evidence and remaining gate

Automated tests exercise image parsing, duplicate/corrupt/SVG input, ownership,
audience, CSRF, catalog normalization, uncertainty/mixed-view results, idempotency,
concurrent calls, failure persistence, timeout, token/cost metadata, limits,
review-before-apply, dirty field preservation and complete listing-form mounting.
Provider responses in these tests are MOCKED; they do not measure recognition.

The local browser fixture is `node tests/car-analysis-browser-server.mjs`, bound
only to 127.0.0.1:4174, with an in-memory database and explicitly synthetic provider
answers. It refuses production/VERCEL environments and is never built into public
assets. Development agent-browser failed to start; the Chromium download was
invalid. No real-browser visual/compression or end-to-end pass is claimed.

Before release, verify on desktop and an actual phone:

- Three genuine views of each test vehicle, with ground-truth brand/model known.
  Cover different manufacturers, visually similar generations and regional names.
- Mixed cars, three fronts, repeated crops, dark/blurred interiors and non-car
  images: require corrections or abstention, not a forced model guess.
- Compare each suggested field with ground truth; record correct, wrong and
  abstained results separately. Agree on an acceptable error rate before launch.
- Preserve already entered fields and in-flight edits; validate photo additions,
  image failures, 8-photo capacity, full listing submission and pending moderation.
- Disconnect/retry, double click, refresh/reopen, expired login, disabled provider,
  quota exhaustion and unsupported HEIC all retain a usable manual form.
- Inspect the deployed client/network for secret leakage and verify no cost
  occurs on GET, disabled feature, invalid inputs or duplicate successful requests.

Vercel connector currently returned no authorized teams. Live model credentials,
paid-call authorization, real test photos and browser verification remain open.

Official API references:
- https://platform.claude.com/docs/en/build-with-claude/vision
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/models/sonnet-4-6/overview
