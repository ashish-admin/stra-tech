import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  timeout: 60000,
  expect: { timeout: 30000 },
  reporter: [
    ['html', { outputFolder: './test-results/html' }],
    ['junit', { outputFile: './test-results/junit.xml' }],
    ['json', { outputFile: './test-results/test-results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/.auth/user.json'
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: './tests/e2e/.auth/user.json'
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: './tests/e2e/.auth/user.json'
      },
      dependencies: ['setup'],
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: './tests/e2e/.auth/user.json'
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: './tests/e2e/.auth/user.json'
      },
      dependencies: ['setup'],
    },
    
    // Performance testing project
    {
      name: 'performance',
      testMatch: /.*\.perf\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/.auth/user.json'
      },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'cd backend && source venv/bin/activate && flask run',
      port: 5000,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});