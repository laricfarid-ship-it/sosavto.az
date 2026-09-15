# VIN auction photos — checkpoint 2026-09-15

Owner wants actual historical damage photos inside SosAvto, not basic VIN decoding
or a Google link presented as an integrated history service. No paid subscription
authorized. Public photos alone do not establish latest accident or complete history.

## Evidence

- VIN: `5XXGW4L21HG139016`, 2017 Kia Optima, IAAI lot `27684249`.
- Source: https://americamotors.com/kia/optima/5XXGW4L21HG139016
- Web reader successfully returned this exact record and ten distinct photo links
  labelled with this VIN, hosted by `vis.iaai.com/resizer`.
- First observed image key: `28128298~SID~B620~S0~I1~RW2592~H1944~TH0`.
- Photo bytes and current visual availability have NOT been verified.
- Direct Python HTTP retrieval from this development environment returned 403.
  This does not establish whether Vercel can fetch it. Do not bypass restrictions.
- Source has missing damage fields and unreliable-looking generic fields (Optima
  labelled crossover, 10 mi). Do not copy them as verified facts. No verified date.
- No published integration API or permission for automated reuse established.

## Delivered

Developer-only `scripts/vin-source-check.mjs` accepts an exact source URL and VIN.
It restricts the source host/path, refuses redirects, limits time and response size,
matches image alt text to VIN, allows only IAAI image URLs, deduplicates links and
explicitly distinguishes photo links from verified image availability/history.
Synthetic tests cover cross-VIN contamination, unsafe URLs and denied sources.
It is NOT wired into the public API, navigation or production service.

Run after `npm install`:

```sh
node scripts/vin-source-check.mjs https://americamotors.com/kia/optima/5XXGW4L21HG139016 5XXGW4L21HG139016
node --test tests/vin-source.test.mjs
```

## Resume here

1. Establish supported automated access/reuse with this source or a provider.
2. Obtain actual HTML through permitted access and verify parser against it;
   the current fixture is synthetic, not a live integration test.
3. Verify image response bytes and test additional VINs, missing records and dates.
4. Find a supported VIN-only discovery method (current URL also needs make/model).
5. Only then connect server lookup with global/user quotas, cache, UI gallery,
   source attribution and explicit unavailable/error states. Never interpret
   missing data as no accident, nor an undated gallery as latest crash.

Existing category/plates work remains in PR #4. No production merge performed.
