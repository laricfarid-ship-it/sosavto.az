# Vehicle 360 frame sequences

## Seller workflow

Car listings have an optional, separate 360 exterior upload section. Select 24–36 JPEG/PNG/WebP images, each <=3 MB, in one selection. Files are sorted naturally by name (001.jpg, 002.jpg, ...). The vehicle stays stationary while the photographer completes a circle at the same distance/height/zoom. For 24 frames use roughly 15-degree spacing, for 36 use 10 degrees. Keep the whole vehicle centered and lighting/doors/wheels unchanged. Do not mix interior shots or unrelated photos. Use preview and reverse order if needed. Seller uploads must actually cover the circle; frame count alone cannot prove capture quality. Moderators should check the preview before approval.

Each frame uploads separately, sequentially, and is processed to WebP <=1200x900 with orientation normalization/metadata removal. Normal eight-photo limits remain unchanged. A failed sequence can resume at the next uncompleted frame on the same page. Refreshing or closing the page loses unsaved local selection/progress; retry is not a cross-session upload service. While an upload is running, save, normal-image selection and category switching are locked. Incomplete sequences block saving until resumed or discarded. Replacing a sequence keeps the previous selection until the new upload completes. Removing/reversing a sequence is committed only on listing save. Edits go through existing moderation.

## Buyer workflow

Cards with complete car sequences show a 360 link. Listing detail presents an explicit open button; no spin images are downloaded before activation. Drag horizontally on mouse/touch, use previous/next, keyboard arrows/Home/End, or the frame slider. Frames wrap around; only adjacent frames are preloaded, no autoplay. Native vertical scrolling and normal photo galleries remain available. Network failure shows a frame error with fallback advice. This is a sequence-based exterior spin, not a generated 3D reconstruction or cabin panorama.

## Server invariants

No schema migration: the existing images table reserves sort_order >=100 for spin uploads/frames; ordinary images stay 0–7. New spin uploads start at 100 without listing_id. Media assignment locks all selected image rows, verifies user ownership and unattached-or-same-listing status, rejects duplicates/cross-gallery reuse, and assigns sequence positions 100 onward in the listing write transaction. An omitted spinImageIds on an older car client preserves existing frames. Explicit [] removes them; switching to a non-car category drops the association. User-supplied URLs are not accepted. Draft frames follow existing listing visibility rules. Public CDN URLs retain the same privacy model as ordinary listing uploads.

GET detail adds spin_frames (ordered id/url pairs). Listing projection adds has_spin and excludes frames from cover/card_images. POST /api/spin-uploads uses existing authentication, origin checks, 3 MB validation and transformation/storage with its own 80/hour/account limit, plus shared write/IP rate limits. Normal uploads retain their 40/hour limit. No external renderer/subscription is added.

As with normal media, replaced/abandoned uploaded objects remain orphaned pending storage retention/cleanup. Rollback should restore this feature's code rather than run old image assignment logic on 360 listings, since old code did not separate sort_order ranges. Database and bucket backup must both include frames. No production listings were created solely for automated testing.

Validation covers complete frame bounds, category/ownership/duplicate/cross-listing rejection, transaction-backed attachment, moderation visibility, omission preservation, replacement ordering/removal, upload tagging, separation from ordinary images, lazy display, circular keys/drag, resumable upload and discard behavior.
