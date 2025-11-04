import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oneeddy.members',
  appName: 'Eddy',
  webDir: 'dist',
  // Server config removed for production
  // Uncomment below for local development testing
  // server: {
  //   url: 'http://localhost:3000',
  //   cleartext: true
  // }
  // Deep linking is configured in:
  // - Android: android/app/src/main/AndroidManifest.xml
  // - iOS: ios/App/App/Info.plist
};

export default config;
