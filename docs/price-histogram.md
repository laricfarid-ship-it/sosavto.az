# Price histogram filter

Home search includes a real-listing histogram and keyboard/touch native range controls for minimum and maximum AZN price. Manual price fields remain canonical form/URL values; submitting the existing search button applies them. Clearing a field removes that bound. Range thumbs clamp to observed prices without silently narrowing pre-existing typed filters outside that domain. One observed price disables ranges but preserves manual entry.

GET /api/price-histogram applies the listing search filter allowlist, excluding price_min, price_max, page and sort. PostgreSQL aggregates all matching active listings, not only a result page, into 20 equal-width linear bins; the maximum belongs to the last bin. Identical prices return one bin. Empty/error states retain manual fields and never render illustrative/demo listings as market data. Labels explicitly describe asking prices, not completed sale values. Other form filter changes refresh the histogram, and older responses cannot replace newer results.

No schema migration, tracking service, or external chart dependency. Tests cover aggregate filtering/counts, pending exclusion, bounds, empty/single-price datasets, form synchronization, stale responses and unavailable data. The API route is checked through the request handler.
