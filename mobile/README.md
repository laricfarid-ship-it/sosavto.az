# SosAvto Android beta (live website wrapper)

The Android beta loads https://sosavto.az inside Capacitor. This is a live website wrapper, not an offline demo or a complete native rewrite.

## Behavior
- The original website supplies listings, login, search, AI, maps, and other features.
- Existing relative /api requests and session cookies stay on the sosavto.az origin.
- No database credentials, API keys, or server code are bundled in the APK.
- Admin-only SOS and car wash permissions remain controlled by the website/backend.
- The APK connects to **production**: submitting listings or editing an account may modify real data. Use a separate test account and avoid test listings unless approved.

## Build
GitHub Actions workflow: .github/workflows/android-test-apk.yml. Open the latest successful workflow run and download the APK artifact, unzip it, then install app-debug.apk.

## Device checks (required before calling this production-ready)
1. Open the app with an internet connection; confirm homepage, listings, search and detail pages.
2. Test sign-in/sign-out and back navigation; verify no loop or blank screen.
3. Test image chooser, camera, map location permission, WhatsApp/telephone external links.
4. Test AI response and session persistence.
5. Verify SOS and car wash are still closed to ordinary accounts and admin-only access is enforced by backend.
6. Verify password recovery email deep links, push notifications, and app restart.
7. Check performance, accessibility and Android status bar overlap.

## Safety and release
This is a debug beta. Do not publish to Play Store or merge to main without testing. The APK uses the real site, not a sandbox. Future native improvements should migrate from remote server.url to a bundled frontend with explicit API configuration, native permissions and robust auth.
