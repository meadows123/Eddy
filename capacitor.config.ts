import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oneeddy.members',
  appName: 'Eddys Members',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
plugins: {
  SplashScreen: {
    launchShowDuration: 10000, // Increase to 10 seconds
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
