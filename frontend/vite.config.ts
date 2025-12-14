import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    dedupe: ['marked', 'turndown'],
    preserveSymlinks: false,
    alias: {
      // Stelle sicher, dass Vite die Pakete im Root node_modules findet
    }
  },
  optimizeDeps: {
    include: ['marked', 'turndown'],
    force: true // Erzwinge Neuoptimierung bei Änderungen
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png'],
      workbox: {
        // Caching-Strategien
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 Stunde
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 Tage
              }
            }
          },
          {
            urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Tage
              }
            }
          }
        ],
        // Offline-Fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/]
      },
      manifest: {
        name: 'NoteNest',
        short_name: 'NN',
        description: 'Persönliche Notizen-App',
        theme_color: '#007AFF',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Erlaubt Zugriff von außen (Docker)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'build',
    sourcemap: true
  }
});

