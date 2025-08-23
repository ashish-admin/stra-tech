import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,  // Disable CSS parsing for speed
    globals: true,
    testTimeout: 10000,  // 10 second timeout per test
    hookTimeout: 5000,   // 5 second timeout for hooks
    teardownTimeout: 3000,
    isolate: false,      // Faster test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,     // Limit threads to prevent hanging
        minThreads: 1
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  esbuild: {
    target: 'node18'  // Speed up build
  }
})