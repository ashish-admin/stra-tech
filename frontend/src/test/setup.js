import '@testing-library/jest-dom'
import { setupFastMocks, setTestTimeouts } from './test-recovery.js'

// Set up fast test environment
setTestTimeouts();
setupFastMocks();

// Mock environment variables
globalThis.process = {
  env: {
    NODE_ENV: 'test',
    VITE_API_BASE_URL: 'http://localhost:5000',
  }
}

// Mock console methods for cleaner test output (preserve important ones)
const originalError = console.error;
const originalWarn = console.warn;

globalThis.console = {
  ...console,
  warn: vi.fn((msg) => {
    // Log actual warnings in development
    if (msg.includes('componentDidCatch') || msg.includes('Error')) {
      originalWarn(msg);
    }
  }),
  error: vi.fn((msg) => {
    // Log actual errors in development  
    if (msg.includes('componentDidCatch') || msg.includes('Error')) {
      originalError(msg);
    }
  }),
}

// Mock fetch for API calls
globalThis.fetch = vi.fn()

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
globalThis.localStorage = localStorageMock