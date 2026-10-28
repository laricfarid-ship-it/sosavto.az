# SOSAVTO payment foundation (pre-merchant onboarding)

Status: preparation only. No live charges, provider keys, prices or paid listings enabled.

## Product rules
- Free listing submission stays unchanged.
- Optional paid promotions (VIP/Premium) require separately approved prices and durations.
- A client redirect to a success page is NOT proof of payment.
- Payment must be confirmed server-side by validating the provider-signed callback and, where supported, querying transaction status.
- Never store PAN, CVV, or card expiry; use hosted checkout.
- Enforce listing ownership and prevent users buying promotion for others' listings.
- Each order uses an immutable server-calculated amount in AZN, UUID, unique provider order ID, and an idempotent activation path.
- Record pending/success/failed/refunded states, provider transaction ID, timestamps, and an audit trail.
- Handle callback duplicates, delays, forged signatures, refunds, mismatched amounts, concurrent requests, and expired orders.
- Only activate promotion after verified success; refunds should trigger review and reversal policy.
- All admin views require admin authentication; no credentials or payment keys in source control.

## Suggested database design (NOT APPLIED)
- payment_orders: id UUID PK, user_id FK, listing_id FK, product_code, amount_minor INTEGER, currency 'AZN', status, provider, provider_order_id UNIQUE, provider_transaction_id, created_at, paid_at.
- payment_events: id UUID PK, order_id FK, provider_event_id UNIQUE, event_type, verified BOOLEAN, received_at, sanitized_payload JSONB.
- listing_promotions: id UUID PK, listing_id FK, order_id UNIQUE FK, tier, starts_at, ends_at, status.

## Proposed API (NOT IMPLEMENTED)
- POST /api/payments/orders: authenticated listing owner creates a pending order from a server-side product catalog.
- POST /api/payments/epoint/callback: signature verified, status checked, idempotently records success and activates promotion.
- GET /api/payments/orders/:id: owner/admin only; never leak another user's order.
- GET /api/admin/payments: admin-only ledger, filters and refund review.

## Merchant integration checklist
1. Confirm active tax registration, eligible activity codes, bank business account, and merchant acceptance.
2. Confirm provider pricing/commissions, refund and settlement terms; get written approval before paid activation.
3. Obtain provider public/private keys securely as environment variables (not GitHub).
4. Register production success, error and result URLs with provider. Callback is authoritative, not redirects.
5. Implement and test using a non-production database and safe test credentials; verify signature rules against the contracted API version.
6. Deploy behind PAYMENTS_ENABLED=false; run production migration separately after review.
7. Activate only after owner explicitly approves final product prices and live processing.

Provider candidate: Epoint. Official docs: https://developer.epoint.az/az . No provider chosen or contracted yet.
