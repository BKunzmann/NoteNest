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
      // Service Worker im Development-Mode deaktivieren (verhindert Cache-Probleme)
      devOptions: {
        enabled: false
      },
      registerType: 'autoUpdate',
      includeManifestIcons: true,
      includeAssets: [
        'favicon.ico',
        'icons/favicon.ico',
        'icons/favicon-16x16.png',
        'icons/favicon-32x32.png',
        'icons/favicon-48x48.png',
        'icons/icon-96x96.png',
        'icons/icon-120x120.png',
        'icons/icon-152x152.png',
        'icons/icon-167x167.png',
        'icons/icon-180x180.png',
        'icons/icon-192x192.png',
        'icons/icon-512x512.png',
        'icons/Designer.png'
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Caching-Strategien
        runtimeCaching: [
          {
            urlPattern: /\/api\/files\/content(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-file-content-cache',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 14
              },
              networkTimeoutSeconds: 8
            }
          },
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 // 24 Stunden
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
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/Designer.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-167x167.png',
            sizes: '167x167',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-120x120.png',
            sizes: '120x120',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/favicon-48x48.png',
            sizes: '48x48',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        shortcuts: [
          {
            name: 'Neue Notiz',
            short_name: 'Neu',
            description: 'Erstelle eine neue Notiz',
            url: '/notes/new',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }]
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
