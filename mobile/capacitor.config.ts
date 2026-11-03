import type { CapacitorConfig } from '@capacitor/cli';

// Only a separately deployed HTTPS staging environment may be loaded.
// Production URL and localhost are intentionally rejected to avoid test writes.
const stagingUrl = process.env.SOSAVTO_MOBILE_STAGING_URL;
if (!stagingUrl) throw new Error('Set SOSAVTO_MOBILE_STAGING_URL to the dedicated HTTPS staging deployment');
const url = new URL(stagingUrl);
if (url.protocol !== 'https:' || url.hostname === 'sosavto.az' || url.hostname === 'www.sosavto.az') {
  throw new Error('A separate HTTPS staging URL is required for mobile testing');
}
const config: CapacitorConfig = {
  appId: 'az.sosavto.app',
  appName: 'SosAvto',
  webDir: 'www',
  server: { url: url.origin, cleartext: false },
  android: { allowMixedContent: false }
};
export default config;
