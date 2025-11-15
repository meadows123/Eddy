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
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Disable native splash duration
      launchAutoHide: false, // Don't auto-hide, let React control it
      backgroundColor: "#5B0202",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: false
    }
  }
};

export default config;
