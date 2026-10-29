# sosavto.az launch checklist

Primary URL: https://sosavto.az. Registrar: online.az. Vercel project: sosavto-az.

## Prepared in this change
- Public static pages declare their canonical and Open Graph URL on sosavto.az.
- robots.txt advertises https://sosavto.az/sitemap.xml.
- Listing SEO falls back to the custom domain; APP_ORIGIN remains the explicit override.
- .env.example uses the custom domain for production configuration.

## Cutover
1. Confirm both nameservers at the registrar: ns1.vercel-dns.com and ns2.vercel-dns.com.
2. Wait for Vercel to report valid DNS for both sosavto.az and www.sosavto.az; inspect DNS records if it stays invalid. Verify HTTPS and the www -> apex redirect.
3. Set production APP_ORIGIN to https://sosavto.az. A new production deployment is required for it to take effect. Do not change branch-specific preview settings.
4. Publish this branch only after DNS/HTTPS is ready. The old vercel.app origin will no longer pass production write-origin checks; direct users to the custom domain.
5. On the custom domain, verify login/logout, registration, listing creation, image upload, moderation, SOS and authenticated AI access. Existing users may need to log in again because cookies do not move between domains. Do not make paid AI requests merely to test DNS.
6. Check /robots.txt, /sitemap.xml and an active /elan?id=... page; canonical, Open Graph and sitemap URLs must use the custom domain.
7. Verify sosavto.az in Google Search Console using its actual verification value and submit https://sosavto.az/sitemap.xml. Do not assume an old vercel.app property verifies the new domain.
8. Set up a verified sender before enabling password-recovery email: RESEND_API_KEY, EMAIL_FROM and the provider's actual DNS verification/SPF/DKIM records; define DMARC after checking all senders. See password-recovery.md. A mailbox such as info@sosavto.az is a separate service/decision.
9. Check registrar account security and renewal before the displayed expiry of 2027-10-27; do not enable paid auto-renew without the owner's preference.

## Recovery
If a release has a functional regression, roll back its deployment and check that the restored deployment's APP_ORIGIN matches the URL users are using. Setting an environment variable alone does not change an existing deployment. Preserve the working DNS configuration while diagnosing application errors.

## 2026-10-29 update
Production sitemap already returns https://sosavto.az URLs. Correct robots.txt and static canonicals, preserve Google verification file, and render descriptive homepage content/links before JavaScript. Search Console submission and index status must be verified in the owner account; deployment does not guarantee Google indexing.
