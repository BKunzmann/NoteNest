import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const ICON_96 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAABCklEQVR4nO3OoQEAMAjAMO7e83BGRCfiM/N2P4gH6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+p4oI4H6nigjgfqeKCOB+IOaa3lKWGdzC4AAAAASUVORK5CYII=';
const ICON_192 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAACWklEQVR4nO3OoQEAMAjAMO7e83BGxSLiM/N24Vt5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEp5AEIH4cOUztIU9AIAAAAASUVORK5CYII=';
const ICON_512 = 'data:image/png;base64,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';

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
      includeAssets: ['favicon.ico'],
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
            src: ICON_192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: ICON_512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Neue Notiz',
            short_name: 'Neu',
            description: 'Erstelle eine neue Notiz',
            url: '/notes/new',
            icons: [{ src: ICON_96, sizes: '96x96', type: 'image/png' }]
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

