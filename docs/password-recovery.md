# Email password recovery

Login links to `/sifre-berpa.html`. A Resend email contains a one-use 20-minute link. The URL fragment is removed from browser history after reading; only a SHA-256 token hash is stored. Successful reset revokes all sessions and outstanding links and returns to `/giris.html?reset=success`; it does not log the customer in.

## Activation

Set production Vercel environment variables directly in the dashboard (never commit secrets):
- `RESEND_API_KEY`: sending key for the verified sender domain.
- `EMAIL_FROM`: verified sender, for example `SosAvto <hesab@your-owned-domain.example>`.
- `APP_ORIGIN`: canonical HTTPS production origin, currently `https://sosavto-az.vercel.app`.

Verify the sender domain in Resend and disable link tracking for authentication emails. Redeploy after setting variables. Without configuration the UI honestly says recovery is not active and the request endpoint returns 503. Configured delivery failures are logged as `password_reset_delivery_failed` without email, token or key, and the unusable token is removed. Public responses are deliberately identical for known and unknown accounts.

Production build applies additive `password-reset-schema.sql` with a five-second lock timeout. Existing accounts and passwords remain intact. Local base schema includes the table. For manual migration use `node server/password-reset-migrate.mjs` with the appropriate database environment.

## Acceptance

Automated tests use a mock email provider and in-memory database. Once activated, test with an account you control: request email, open the link, enter matching new passwords, confirm redirect to login, confirm old password fails and new password works, and confirm reusing the link fails. Check actual inbox/spam delivery; an accepted provider response alone does not prove inbox delivery. SMS is not implemented.
