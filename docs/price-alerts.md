# Favorite price notifications

Favorites automatically subscribe the account to future approved price decreases. Removing a favorite stops future alerts. Alerts appear in the existing account notifications inbox and include listing title, prior published price and new published price. This release does not send email, SMS or browser push.

The existing JSONB details field stores a server-owned `_publishedPrice` snapshot. Listing input allowlists prevent clients from supplying it. Active legacy listings acquire the baseline before their first edit or status change; successive pending/rejected edits retain it. Approval compares the persisted numeric price against the last published price, alerts current active-account favorites except the owner, then updates the snapshot. Initial publication, equal/increased prices and category changes do not alert. Pending legacy listings without a baseline start tracking at their next approval; past prices cannot be reconstructed.

Moderation holds the listing row lock. Publication, snapshot update, notifications and moderation audit commit together. Repeated or competing approvals cannot duplicate a price alert; failed image validation rolls back an edit and baseline. Existing notification reading/mark-as-read behavior and access control remain in use. No new schema migration or external provider is needed.

Validation: API integration test covers legacy listing edits, repeated pending edits, rejected changes, malicious snapshot input, approved drops, duplicate/concurrent moderation, same/increased prices, seller exclusion, favorite removal, reading notifications and transaction rollback. Frontend and full regression tests/build should pass before release.
