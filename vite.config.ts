import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: precache the app shell (workbox) + web manifest so the app installs and
    // boots with zero network. User data lives in IndexedDB (LocalFirstStore), so
    // shell-cache + local store together give a full offline launch.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto', // inject the SW registration script automatically
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Workout Tracker',
        short_name: 'Workout',
        description: 'Track your workouts, sets, and progress — with smart next-set targets.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        // Pull in the Web Push handlers (push + notificationclick) so rest-complete
        // alerts fire while the phone is locked. Served from public/push-sw.js.
        importScripts: ['push-sw.js'],
      },
      devOptions: { enabled: false }, // no SW in dev / tests
    }),
  ],
  test: {
    // Pure lib tests run in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Tests always run in demo mode, independent of a developer's .env.local
    // (which now carries real Supabase vars).
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_ML_URL: '',
      VITE_VAPID_PUBLIC_KEY: '',
    },
    // globals: true so React Testing Library registers its afterEach cleanup —
    // otherwise renders leak across tests in the same file.
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
