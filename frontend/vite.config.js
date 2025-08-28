import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      
      pwaAssets: {
        disabled: false,
        config: true,
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,json,txt}',
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        
        // Political Intelligence specific caching
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^.*\/api\/v1\/geojson.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'political-geojson',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              }
            }
          },
          {
            urlPattern: /^.*\/api\/v1\/ward\/meta.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'political-ward-data',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              }
            }
          },
          {
            urlPattern: /^.*\/api\/v1\/trends.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'political-trends',
              expiration: {
                maxAgeSeconds: 60 * 5, // 5 minutes
              }
            }
          },
          {
            urlPattern: /^.*\/api\/v1\/strategist.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'political-strategist',
              expiration: {
                maxAgeSeconds: 60 * 10, // 10 minutes
              }
            }
          }
        ]
      },

      devOptions: {
        enabled: process.env.NODE_ENV === 'development',
        suppressWarnings: true,
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/$/],
        type: 'module',
      },

      selfDestroying: false,
    })
  ],
  
  resolve: {
    alias: {
      // Enhanced path aliases for new structure
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@components': path.resolve(__dirname, './src/shared/components'),
      '@hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@services': path.resolve(__dirname, './src/shared/services'),
      '@utils': path.resolve(__dirname, './src/shared/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles')
    }
  },
  build: {
    // Enable code splitting for better performance
    rollupOptions: {
      output: {
        // Enhanced manual chunks for political dashboard optimization
        manualChunks(id) {
          // Core React bundle - highest priority
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-core';
          }
          
          // Data visualization - high priority for political intelligence
          if (id.includes('chart.js') || id.includes('recharts') || id.includes('react-chartjs-2')) {
            return 'charts';
          }
          
          // Geospatial mapping - critical for ward-based analysis
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'mapping';
          }
          
          // API and state management - high priority
          if (id.includes('@tanstack/react-query') || id.includes('axios')) {
            return 'api-client';
          }
          
          // UI components and icons - medium priority
          if (id.includes('lucide-react') || id.includes('@headlessui')) {
            return 'ui-components';
          }
          
          // Internationalization - deferred loading
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }
          
          // Date/time utilities - deferred loading
          if (id.includes('date-fns') || id.includes('moment')) {
            return 'datetime';
          }
          
          // Enhanced feature-based code splitting for Phase 2
          if (id.includes('/features/strategist/')) {
            return 'strategist-features';
          }
          
          if (id.includes('/features/analytics/')) {
            return 'analytics-features';
          }
          
          if (id.includes('/features/dashboard/')) {
            return 'dashboard-features';
          }
          
          if (id.includes('/features/geographic/')) {
            return 'geographic-features';
          }
          
          if (id.includes('/features/auth/')) {
            return 'auth-features';
          }
          
          // Shared components splitting
          if (id.includes('/shared/components/ui/')) {
            return 'shared-ui';
          }
          
          if (id.includes('/shared/components/charts/')) {
            return 'shared-charts';
          }
          
          if (id.includes('/shared/hooks/')) {
            return 'shared-hooks';
          }
          
          // Legacy tab components (to be migrated)
          if (id.includes('/tabs/StrategistTab') || id.includes('StrategistChat')) {
            return 'strategist-ui';
          }
          
          if (id.includes('/tabs/SentimentTab') || id.includes('EmotionChart')) {
            return 'sentiment-analysis';
          }
          
          if (id.includes('/tabs/CompetitiveTab') || id.includes('CompetitorTrend')) {
            return 'competitive-analysis';
          }
          
          if (id.includes('/tabs/GeographicTab') || id.includes('LocationMap')) {
            return 'geographic-analysis';
          }
          
          // Analytics and monitoring - background loading
          if (id.includes('/monitoring/') || id.includes('PerformanceMonitor')) {
            return 'monitoring';
          }
          
          // Generic vendor chunks for other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        
        // Optimized file naming for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? 
            chunkInfo.facadeModuleId.split('/').pop().replace(/\.\w+$/, '') : 
            'chunk';
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          
          // Organize assets by type for better caching
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(extType)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    // Optimized chunk size limits for political dashboard
    chunkSizeWarningLimit: 1000,
    // Enable source maps for development, disable for production
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    // Enhanced minification for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        passes: 2, // Multiple passes for better compression
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
      },
      mangle: {
        safari10: true, // Handle Safari 10 bug
      },
    },
    // Target modern browsers for better optimization
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Rollup external dependencies (not bundled)
    external: [],
    // Optimize chunk loading
    experimentalMinChunkSize: 1000,
  },
  // Enhanced performance optimizations for political dashboard
  optimizeDeps: {
    include: [
      // Core dependencies - always pre-bundle
      'react',
      'react-dom',
      'react/jsx-runtime',
      'axios',
      '@tanstack/react-query',
      
      // UI and visualization - critical for user experience
      'lucide-react',
      'chart.js',
      'react-chartjs-2',
      
      // Enhanced shared components optimization
      'react-error-boundary',
      
      // Optional dependencies - conditionally include based on usage
      'leaflet',
      'react-leaflet',
      'i18next',
      'react-i18next'
    ],
    exclude: [
      // Large dependencies that benefit from dynamic loading
      'recharts',
      '@headlessui/react'
    ],
    // Force optimization of specific modules
    force: true,
    // Optimize for ESM
    esbuildOptions: {
      target: 'es2020',
      supported: {
        'top-level-await': true,
        'import-meta': true
      }
    }
  },
  
  // Enhanced development performance
  esbuild: {
    target: 'es2020',
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // Removed auto-inject to avoid conflicts with explicit imports
  },
  server: {
    host: true, // Allow external connections
    cors: true, // Enable CORS
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            // Ensure cookies are properly forwarded to backend
            if (req.headers.cookie) {
              proxyReq.setHeader('cookie', req.headers.cookie);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            // Forward Set-Cookie headers from backend to frontend
            if (proxyRes.headers['set-cookie']) {
              res.setHeader('set-cookie', proxyRes.headers['set-cookie']);
            }
          });
        }
      }
    }
  }
})