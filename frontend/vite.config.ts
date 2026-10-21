import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this app from https://<owner>.github.io/Vitalis/, a
// subpath — not the domain root — so every asset/route reference needs this
// base. Override with VITE_BASE_PATH for other hosts (e.g. Vercel, where the
// app lives at the root and base should be '/').
const base = process.env.VITE_BASE_PATH ?? '/Vitalis/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Vitalis EHR',
        short_name: 'Vitalis',
        description: 'Offline-first EHR for Nigerian hospitals',
        theme_color: '#111111',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // App shell only — clinical data is cached in IndexedDB (Dexie) by
        // the sync engine, not by the service worker.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
