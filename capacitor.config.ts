import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taashbhatti.app',
  appName: 'Taash Bhatti',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  ios: {
    // Standard iOS configuration
  }
};

export default config;
