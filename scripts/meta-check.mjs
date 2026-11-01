import {socialConnectionReport} from '../server/social-share.mjs';
// Read-only check inside the secret-bearing Vercel runtime. No raw API logging.
if (process.env.VERCEL_ENV === 'preview' && process.env.META_DIAGNOSTICS === 'true') {
 console.log('META_CONNECTION_CHECK ' + JSON.stringify(await socialConnectionReport()));
}
