import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [react()],
  
  // Environment variable configuration
  define: {
    // Expose environment variables to the app
    __APP_ENV__: JSON.stringify(env.VITE_APP_ENV || mode),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __TELEMETRY_ENABLED__: JSON.stringify(env.VITE_TELEMETRY_ENABLED === 'true'),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  
  // Enhanced environment variable handling
  envPrefix: ['VITE_', 'TELEMETRY_'],
  
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
          
          // Political intelligence features - route-based splitting
          if (id.includes('/features/strategist/')) {
            return 'strategist-features';
          }
          
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
    // Enable source maps based on environment and telemetry needs
    sourcemap: env.VITE_APP_ENV === 'development' || env.VITE_TELEMETRY_DEBUG === 'true' ? 'inline' : false,
    // Enhanced minification for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: env.VITE_APP_ENV === 'production' && env.VITE_TELEMETRY_DEBUG !== 'true',
        drop_debugger: env.VITE_APP_ENV === 'production',
        passes: 2, // Multiple passes for better compression
        pure_funcs: env.VITE_APP_ENV === 'production' && env.VITE_TELEMETRY_DEBUG !== 'true' 
          ? ['console.log', 'console.info', 'console.debug'] 
          : [], // Keep console methods for telemetry debugging
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
  }
})