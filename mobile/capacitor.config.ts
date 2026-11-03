import type { CapacitorConfig } from '@capacitor/cli';

// Android beta: show the existing live marketplace at its original origin.
// This preserves same-origin /api calls, cookies and existing access controls.
// The hosted website remains the source of truth; no server secrets are bundled.
const config: CapacitorConfig = {
  appId: 'az.sosavto.app',
  appName: 'SosAvto',
  webDir: 'www',
  server: {
    url: 'https://sosavto.az',
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    // Apply system bar and display-cutout insets on Android 15/16 too.
    adjustMarginsForEdgeToEdge: 'force'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#f5f7fa'
    }
  }
};
export default config;
