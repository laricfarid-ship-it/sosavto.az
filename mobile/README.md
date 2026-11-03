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

## APK interface (0.2)
- `ui/app.css` and `ui/app.js` are packaged as an Android asset by `scripts/prepare-android.mjs` after Capacitor sync.
- `native/MainActivity.java` extends Capacitor's WebView client, preserving its navigation, permissions, file chooser and plugin behavior. Presentation runs only at the exact HTTPS production origin, on page commit and page finish; a DOM observer handles asynchronous site rendering.
- No hosted assets or server routes change. Existing forms, buttons, values, listeners, API calls and backend permissions are retained.
- Compact eight-category grid, collapsible filters, two-column listings, smaller sponsor banner, persistent five-tab navigation, favorites shortcut, keyboard-aware navigation.
- Android system bars and cutouts use Capacitor's native edge-to-edge margin handling. Device verification on Redmi remains necessary.
- Run `node --test --test-force-exit mobile/tests/*.test.mjs` from repository root for presentation behavior checks. Run the preparation script from `mobile` after every `cap sync`.
- Debug signing on hosted runners may differ between builds. An existing APK can only update in place if its signing certificate matches; keep accounts and credentials available before uninstalling any earlier debug build. Release distribution needs a persistent signing key.

## Hosted interface and automatic updates
The approved installed beta can receive presentation changes without reinstalling. The blocking `assets/theme.js` detects Capacitor's Android bridge, claims UI ownership before the old APK's page-commit injection, and requests the same-origin hosted `/assets/mobile-app.js`. The build bundles `mobile/ui/app.css`, `mobile/ui/app.js`, and `mobile/ui/updates.js`; edits to those source files must be published through the production Git/Vercel deployment to reach installed apps. Ordinary desktop browsers never load the mobile runtime.

Every production deployment emits `/assets/mobile-version.json`. An open visible app checks once per minute and when returning to the foreground. An untouched home/map page reloads when the version changes. On other pages, or after input, an update notice waits for a tap; unsaved edits require confirmation before reload. Network/check failures leave the current page usable. The existing push service worker does not cache pages or these assets. Native Android capabilities, permissions, signing, app icons and SDK changes still require an APK update; website/UI changes do not.

Run `node --test --test-force-exit tests/mobile-updates.test.mjs mobile/tests/*.test.mjs` to check legacy takeover, desktop isolation, hosted packaging, update notices and failure handling. Never place generated bundles or `public/` in version control; the build generates them together with the deployment version.
