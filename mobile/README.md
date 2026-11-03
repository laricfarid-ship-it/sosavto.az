# SosAvto Android test app

Status: initial Android test configuration (not yet a built APK).

## Goal
Build an Android test APK for Redmi Note 15 Pro without Play Store publication. Preserve the existing production website and admin-only service access rules.

## Proposed stack
Capacitor Android wrapper around a separately built, mobile-compatible frontend. The current Node/Vercel backend must remain hosted; never bundle server code, database credentials, or environment secrets into the APK.

## Prerequisites
- Verify mobile navigation, login sessions, upload flows, map permissions, and AI requests against a separate test environment.
- Build browser assets with the existing build script.
- Configure a dedicated app ID, e.g. az.sosavto.app (confirm before publishing).
- Add @capacitor/core, @capacitor/cli, @capacitor/android and capacitor.config.ts after validating the frontend asset routing and backend URL strategy.
- Generate native Android project and test a debug APK using Android SDK/Gradle.
- Keep the current admin push service worker and admin manifest behavior unchanged until a separate customer manifest is implemented.

## Acceptance tests
1. Install on Redmi Note 15 Pro.
2. Launch, browse listings, filter and open details.
3. Sign in and sign out safely; no credentials exposed.
4. Select camera/gallery photos and create a test listing.
5. Verify AI and map flows.
6. Confirm SOS and car wash permissions differ for admin and ordinary users.
7. Confirm notification permission behavior.
8. Confirm no production data mutations during testing.

## Release gate
Do not merge into main or deploy without explicit approval and passing tests.
