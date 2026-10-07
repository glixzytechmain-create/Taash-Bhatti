import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const mapsKey =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  'AIzaSyCZju-0iZDXc3_Q-W4mDQsNjDS96nHRufE';

export default defineConfig(() => {
  const isNativeApp = process.env.CAPACITOR_BUILD === 'true' || process.env.ELECTRON_BUILD === 'true';
  return {
    base: isNativeApp ? './' : '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(mapsKey),
      'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(mapsKey),
      'process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(mapsKey),
      'import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(mapsKey),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(mapsKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
