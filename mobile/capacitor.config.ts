import type { CapacitorConfig } from '@capacitor/cli';
// Offline-only first APK: no access to production credentials or data.
const config: CapacitorConfig = {
  appId: 'az.sosavto.app',
  appName: 'SosAvto',
  webDir: 'www',
  android: { allowMixedContent: false }
};
export default config;
