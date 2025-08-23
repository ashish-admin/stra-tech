# LokDarpan Frontend Architecture Documentation

## Executive Summary

LokDarpan frontend is a production-ready React 18 + Vite 7 political intelligence dashboard optimized for real-time campaign operations. The architecture prioritizes **component resilience** with granular error boundaries ensuring single component failures never crash the entire application - a critical requirement for high-stakes political campaigns.

**Architecture Philosophy**: Component isolation + real-time intelligence + mobile-first responsiveness + political UX optimization

---

## Table of Contents

1. [Technical Stack & Configuration](#technical-stack--configuration)
2. [Application Architecture](#application-architecture)
3. [Component Organization](#component-organization)
4. [State Management Patterns](#state-management-patterns)
5. [Error Boundary System](#error-boundary-system)
6. [Real-time Features (SSE Integration)](#real-time-features-sse-integration)
7. [API Integration Layer](#api-integration-layer)
8. [Performance Optimization](#performance-optimization)
9. [Mobile Responsiveness](#mobile-responsiveness)
10. [Build & Deployment](#build--deployment)
11. [Development Workflow](#development-workflow)
12. [Quality & Testing](#quality--testing)
13. [Technical Debt & Future Improvements](#technical-debt--future-improvements)

---

## Technical Stack & Configuration

### Core Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "vite": "^7.0.6",
  "tailwindcss": "^3.3.3",
  "@tanstack/react-query": "^5.85.3",
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "chart.js": "^4.5.0",
  "react-chartjs-2": "^5.3.0",
  "recharts": "^2.10.3",
  "lucide-react": "^0.536.0"
}
```

### Build Configuration

**Vite Configuration** (`frontend/vite.config.js`):
- **API Proxy**: All `/api` requests routed to `http://localhost:5000`
- **Cookie Forwarding**: Session cookies properly forwarded between frontend/backend
- **WebSocket Support**: `ws: true` for SSE connections
- **CORS Handling**: Proxy handles CORS issues in development

**TailwindCSS Configuration** (`frontend/tailwind.config.js`):
- **Content Scanning**: `./src/**/*.{js,jsx,ts,tsx}`
- **Mobile-First**: Default responsive breakpoints
- **Minimal Extensions**: Clean baseline without custom theme overrides

### Environment Configuration

```env
# Development
VITE_API_BASE_URL=http://127.0.0.1:5000
NODE_ENV=development
```

---

## Application Architecture

### Directory Structure

```
frontend/src/
├── main.jsx                    # Application entry point
├── App.jsx                     # Root component with auth logic
├── index.css                   # Global styles
├── components/                 # Core reusable components
│   ├── Dashboard.jsx          # Main dashboard coordinator
│   ├── LocationMap.jsx        # Leaflet-based ward mapping
│   ├── StrategicSummary.jsx   # AI analysis display
│   ├── ErrorBoundary.jsx      # Basic error boundary
│   └── ComponentErrorBoundary.jsx  # Enhanced error boundaries
├── context/                   # React Context providers
│   └── WardContext.jsx        # Ward selection state management
├── features/                  # Feature-based organization
│   ├── analytics/            # Chart and analysis components
│   ├── auth/                 # Authentication components
│   ├── strategist/           # Political Strategist AI module
│   └── wards/                # Ward-specific components
├── hooks/                    # Custom React hooks
│   ├── useErrorReporting.js  # Error reporting utilities
│   └── useViewport.js        # Responsive utilities
├── lib/                      # Core utilities
│   ├── api.js               # API client with fetchJson
│   └── SSEClient.js         # Server-Sent Events client
├── shared/                   # Shared utilities and components
└── test/                     # Test files
```

### Application Flow

1. **Authentication Check** (`App.jsx:26-50`):
   ```javascript
   async function checkSession() {
     const data = await fetchJson("api/v1/status");
     setIsAuthed(!!data?.authenticated);
     setUser(data?.user || null);
   }
   ```

2. **Context Initialization**:
   - `QueryClientProvider` for server state management
   - `WardProvider` for global ward selection state
   - URL synchronization for deep linking

3. **Component Tree**:
   ```
   App
   ├── LoginPage (if not authenticated)
   └── WardProvider
       └── QueryClientProvider
           └── ErrorBoundary
               └── Dashboard (main interface)
   ```

---

## Component Organization

### Component Architecture Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Error Isolation**: Critical components wrapped in individual error boundaries
3. **Props Interface**: Consistent prop patterns across similar components
4. **Responsive Design**: Mobile-first responsive patterns

### Core Components

#### Dashboard.jsx (Main Coordinator)
**Role**: Central hub coordinating all dashboard components and data flow

**Key Features**:
- **Ward Selection Sync**: Keeps map clicks ↔ dropdown selection ↔ URL in sync
- **Data Fetching**: Manages posts, geojson, and competitive analysis data
- **Filtering Logic**: Client-side emotion and keyword filtering
- **Component Orchestration**: Manages loading states across child components

**Critical Code Patterns**:
```javascript
// Ward normalization (Dashboard.jsx:33-41)
function normalizeWardLabel(label) {
  let s = String(label).trim();
  s = s.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
  s = s.replace(/^ward\s*\d+\s*/i, "");
  return s.replace(/\s+/g, " ").trim();
}

// Error boundary wrapping (Dashboard.jsx:246-257)
<ComponentErrorBoundary
  componentName="Interactive Map"
  fallbackMessage="The interactive ward map is temporarily unavailable."
>
  <LocationMap geojson={geojson} selectedWard={selectedWard} />
</ComponentErrorBoundary>
```

#### LocationMap.jsx (Geospatial Intelligence)
**Role**: Interactive Leaflet-based ward mapping with selection capabilities

**Key Features**:
- **Dynamic Height Matching**: Auto-sizes to match adjacent component heights
- **Ward Click Selection**: Updates global ward context on polygon clicks
- **Choropleth Visualization**: Color-coded metrics visualization
- **Responsive Adaptation**: Mobile-optimized touch interactions

**Technical Implementation**:
- **Leaflet Integration**: Native Leaflet with React lifecycle management
- **GeoJSON Processing**: Efficient polygon rendering and interaction
- **Mobile Optimization**: Touch-friendly selection and zoom controls

#### Error Boundary System
**Two-Tier Error Handling**:

1. **ErrorBoundary.jsx** (Basic):
   - Catches JavaScript errors in component tree
   - Simple fallback UI
   - Console logging for development

2. **ComponentErrorBoundary.jsx** (Enhanced):
   - **Retry Mechanism**: Up to 3 automatic retry attempts
   - **Health Monitoring**: Integration with component health tracking
   - **Detailed Error Reporting**: Structured error data for monitoring
   - **User-Friendly UI**: Clear fallback messages with action buttons

### Feature-Based Components

#### Political Strategist Module (`features/strategist/`)
**Architecture**: Modular AI analysis system with real-time capabilities

**Key Components**:
- **PoliticalStrategist.jsx**: Main coordinator with settings and controls
- **StrategistBriefing.jsx**: AI analysis results display
- **IntelligenceFeed.jsx**: Real-time intelligence updates
- **ActionCenter.jsx**: Recommended actions interface
- **AnalysisControls.jsx**: Analysis depth and context controls

**Integration Points**:
- **SSE Client**: Real-time streaming analysis updates
- **React Query**: Caching and synchronization of AI responses
- **Preference Management**: User preference persistence

---

## State Management Patterns

### Three-Layer State Architecture

#### 1. Global State (React Context)
**WardContext.jsx** - Ward selection state management:

```javascript
// URL synchronization (WardContext.jsx:19-27)
useEffect(() => {
  const url = new URL(window.location.href);
  if (ward && ward !== "All") url.searchParams.set("ward", ward);
  else url.searchParams.delete("ward");
  window.history.replaceState({}, "", url);
}, [ward]);
```

**Features**:
- **URL Synchronization**: Deep-linkable ward selection
- **Global Access**: `useWard()` hook available throughout app
- **Browser History**: Proper browser back/forward navigation

#### 2. Server State (React Query)
**Configuration** (`main.jsx:11-20`):

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30 seconds for political data
      refetchOnWindowFocus: false, // Prevent excessive API calls
      retry: 1,                    // Single retry for failed requests
    },
  },
});
```

**Usage Patterns**:
- **Strategic Analysis**: 5-minute stale time for AI analysis
- **Political Data**: 30-second stale time for dynamic content
- **Geographic Data**: Infinite stale time for static ward boundaries

#### 3. Local State (useState)
**Component-Level State**:
- UI interactions (dropdowns, modals, loading states)
- Form data and temporary user input
- Component-specific display preferences

### State Flow Diagram

```
User Action (Map Click/Dropdown Selection)
         ↓
   WardContext.setWard()
         ↓
   URL Update (History API)
         ↓
   React Query Refetch
         ↓
   Component Re-render
         ↓
   UI Update Across Dashboard
```

---

## Error Boundary System

### Component Resilience Strategy

**Design Principle**: Single component failure must NEVER crash the entire application.

### Implementation Architecture

#### Enhanced Error Boundary Pattern

```javascript
// ComponentErrorBoundary.jsx core pattern
class ComponentErrorBoundary extends React.Component {
  state = { hasError: false, retryCount: 0, isRetrying: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Health monitoring integration
    healthMonitor.reportError(this.props.componentName, error);
    
    // Structured error reporting
    console.error(`LokDarpan Component Error in ${componentName}:`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
```

#### Retry Mechanism

**Automatic Recovery** (ComponentErrorBoundary.jsx:58-80):
- **Exponential Backoff**: 1s delay between retry attempts
- **Max Attempts**: 3 retries before permanent fallback
- **Health Reporting**: Recovery notifications to monitoring system

#### Error Boundary Coverage

**Critical Components Wrapped**:
```javascript
// Every critical component individually wrapped
<ComponentErrorBoundary componentName="Interactive Map">
  <LocationMap />
</ComponentErrorBoundary>

<ComponentErrorBoundary componentName="Strategic Analysis">
  <StrategicSummary />
</ComponentErrorBoundary>

<ComponentErrorBoundary componentName="Sentiment Chart">
  <EmotionChart />
</ComponentErrorBoundary>
```

### Error Monitoring Integration

**Health Monitoring System** (`utils/componentHealth.js`):
- Component error tracking and metrics
- Recovery success rate monitoring  
- Performance impact assessment
- User experience degradation tracking

---

## Real-time Features (SSE Integration)

### Server-Sent Events Architecture

**SSEClient.js** - Production-ready SSE client with reconnection logic:

#### Core Features

1. **Connection Management**:
   ```javascript
   // Automatic reconnection with exponential backoff
   attemptReconnect() {
     const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
     setTimeout(() => this.connect(), delay);
   }
   ```

2. **Event Type Handling**:
   - `strategist-analysis`: AI analysis results
   - `analysis-progress`: Real-time progress updates
   - `analysis-complete`: Completion notifications
   - `heartbeat`: Connection health monitoring

3. **Connection Recovery**:
   - **Exponential Backoff**: 3s → 6s → 12s → 24s delay progression
   - **Max Attempts**: 5 reconnection attempts before giving up
   - **Heartbeat Monitoring**: 30-second timeout detection

#### React Integration

**useSSE Hook** (SSEClient.js:216-275):
```javascript
export const useSSE = (url, options = {}) => {
  const [client] = useState(() => new SSEClient(options));
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  // Auto-cleanup on unmount
  useEffect(() => {
    client.connect(url);
    return () => client.disconnect();
  }, [url, client]);
};
```

### Political Strategist SSE Integration

**Real-time Analysis Streaming**:
- **Progress Updates**: Live analysis progress for long-running AI operations
- **Intelligence Alerts**: Real-time political developments and sentiment shifts
- **Strategic Notifications**: Immediate alerts for significant political events

**Implementation Example** (PoliticalStrategist.jsx:27-32):
```javascript
const { 
  intelligence, 
  isConnected: isFeedConnected, 
  error: feedError 
} = useIntelligenceFeed(selectedWard, preferences.priorityFilter);
```

---

## API Integration Layer

### Unified API Client

**lib/api.js** - Centralized API communication:

#### Core Features

1. **Environment-Aware Base URL**:
   ```javascript
   const apiBase = normalizeApiBase(
     import.meta.env.VITE_API_BASE_URL || 
     import.meta.env.VITE_API_URL || ""
   );
   ```

2. **Vite Proxy Integration**:
   ```javascript
   export function joinApi(path) {
     if (!apiBase) {
       return `/${path}`; // Use Vite proxy for relative paths
     }
     return `${apiBase}/${path}`;
   }
   ```

3. **Consistent Error Handling**:
   ```javascript
   export async function fetchJson(path, init = {}) {
     const res = await fetch(url, {
       credentials: "include", // Session cookies
       headers: { "Content-Type": "application/json" },
       ...init,
     });

     if (!res.ok) {
       const err = new Error(message);
       err.status = res.status;
       throw err;
     }
   }
   ```

### API Endpoint Integration

**Key Endpoints Used**:
- `GET /api/v1/status` - Authentication status
- `GET /api/v1/geojson` - Ward boundary polygons
- `GET /api/v1/posts?city={ward}` - Political content by ward
- `GET /api/v1/trends?ward={ward}&days={n}` - Time-series analytics
- `GET /api/v1/pulse/{ward}` - Strategic briefings
- `GET /api/v1/strategist/{ward}` - AI analysis (Phase 3)

### Authentication Integration

**Session-based Authentication**:
- **Cookie Management**: Automatic cookie handling via `credentials: "include"`
- **Session Persistence**: Maintains authentication across browser sessions
- **Proxy Cookie Forwarding**: Vite proxy properly forwards session cookies

---

## Performance Optimization

### Bundle Optimization

**Current State**: Standard Vite configuration without advanced optimization

**Implemented Optimizations**:
1. **React Query Caching**: 30-second stale time prevents excessive API calls
2. **Conditional Rendering**: Empty states and loading patterns
3. **Efficient Re-renders**: `useMemo` for expensive computations in Dashboard.jsx

### React Query Optimization

**Stale Time Strategy**:
```javascript
// Political data (frequently changing)
staleTime: 30_000, // 30 seconds

// Geographic data (static)
staleTime: Infinity, // Cache until manual invalidation

// AI analysis (computationally expensive)
staleTime: 300_000, // 5 minutes
```

**Background Refetching**:
- Disabled on window focus to prevent excessive API calls during campaign usage
- Manual refresh controls for user-initiated updates

### Component Performance

**Memoization Patterns** (Dashboard.jsx:161-176):
```javascript
const filteredPosts = useMemo(() => {
  let arr = Array.isArray(posts) ? posts : [];
  
  // Client-side filtering for immediate response
  if (emotionFilter && emotionFilter !== "All") {
    arr = arr.filter(/* emotion filtering logic */);
  }
  
  if (keyword) {
    arr = arr.filter(/* keyword filtering logic */);
  }
  
  return arr;
}, [posts, emotionFilter, keyword]);
```

---

## Mobile Responsiveness

### Responsive Design Strategy

**Mobile-First Approach**: TailwindCSS default mobile-first breakpoints

**Responsive Grid Layouts**:
```javascript
// Dashboard.jsx responsive grid example
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  <div className="lg:col-span-7 xl:col-span-8">
    {/* Map component */}
  </div>
  <div className="lg:col-span-5 xl:col-span-4">
    {/* Strategic summary */}
  </div>
</div>
```

**Breakpoint Strategy**:
- **Mobile (default)**: Single column layout, stacked components
- **Large (lg: 1024px+)**: 12-column grid system for desktop layouts
- **Extra Large (xl: 1280px+)**: Enhanced spacing and larger components

### Touch Optimization

**LocationMap.jsx Mobile Features**:
- **Touch-friendly Interactions**: Optimized polygon selection for touch devices
- **Zoom Controls**: Mobile-optimized Leaflet control positioning
- **Gesture Support**: Pinch-to-zoom and pan gestures

**Component Sizing**:
- **Dynamic Height Matching**: Map auto-sizes to match adjacent components
- **Minimum Heights**: Ensures usable interface on small screens
- **Viewport-aware Rendering**: `useViewport` hook for responsive behavior

### Progressive Web App (PWA) Readiness

**Current State**: Basic PWA groundwork in place

**Implemented Features**:
- Service Worker-ready build configuration
- Mobile-optimized meta tags and viewport settings
- Responsive image handling

**Future PWA Enhancements**:
- Offline capability for core political data
- Push notifications for urgent intelligence alerts
- App-like installation experience for campaign teams

---

## Build & Deployment

### Development Build

**Start Development Server**:
```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

**Development Features**:
- **Hot Module Replacement (HMR)**: Instant updates during development
- **API Proxy**: Development server proxies all `/api` requests to backend
- **Source Maps**: Full debugging support

### Production Build

**Build Process**:
```bash
npm run build    # Creates dist/ directory
npm run preview  # Preview production build locally
```

**Build Output**:
- **Static Assets**: Optimized CSS, JS, and image files
- **Index Template**: Pre-configured HTML with proper meta tags
- **Asset Hashing**: Cache-busting for efficient updates

### Deployment Configuration

**Static Site Deployment** (`public/_redirects`):
```
/* /index.html 200
```

**Environment Variables**:
```env
VITE_API_BASE_URL=https://api.lokdarpan.com  # Production API URL
```

---

## Development Workflow

### Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Production build
npm run build
npm run preview
```

### Code Quality Tools

**Current State**: Basic ESLint configuration

**Testing Framework**: Vitest + React Testing Library

**Test Configuration** (`vitest.config.js`):
```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
```

### Development Best Practices

1. **Error Boundary Testing**: Always test component failures don't crash the app
2. **Mobile-First Development**: Test responsive layouts during development
3. **API Integration Testing**: Use backend API during development, not mocks
4. **Real-time Feature Testing**: Test SSE connections with actual backend streams

---

## Quality & Testing

### Test Architecture

**Testing Strategy**:
- **Unit Tests**: Individual component behavior
- **Integration Tests**: Component interaction and data flow
- **Error Boundary Tests**: Failure isolation verification

**Current Test Files**:
```
src/test/
├── Dashboard.test.jsx         # Main dashboard functionality
├── ErrorBoundary.test.jsx     # Error handling verification
├── WardContext.test.jsx       # State management testing
├── setup.js                   # Test environment setup
└── strategist/                # Political Strategist module tests
    ├── AnalysisControls.test.jsx
    ├── IntelligenceFeed.test.jsx
    └── PoliticalStrategist.test.jsx
```

### Testing Patterns

**Error Boundary Testing**:
```javascript
// Verify component failures don't crash the app
test('error boundary prevents app crash', () => {
  const ThrowError = () => { throw new Error('Test error'); };
  
  render(
    <ComponentErrorBoundary componentName="Test">
      <ThrowError />
    </ComponentErrorBoundary>
  );
  
  expect(screen.getByText(/Test Unavailable/)).toBeInTheDocument();
});
```

**Context Testing**:
```javascript
// Verify ward selection state management
test('ward context updates URL', () => {
  const { result } = renderHook(() => useWard(), {
    wrapper: ({ children }) => <WardProvider>{children}</WardProvider>
  });
  
  act(() => result.current.setWard('Jubilee Hills'));
  
  expect(window.location.search).toContain('ward=Jubilee%20Hills');
});
```

### Code Quality Metrics

**Current Coverage**: Basic test coverage for critical paths

**Quality Standards**:
- Component isolation: 100% critical components have error boundaries
- State management: URL synchronization working correctly  
- API integration: Error handling for all API calls
- Responsive design: Mobile-first layouts implemented

---

## Technical Debt & Future Improvements

### Phase 4 Enhancement Roadmap

**Current Implementation Status**: Phase 3 complete, Phase 4 planned

#### Phase 4.1: Component Resilience (Completed)
✅ **Enhanced Error Boundary System**: Granular error boundaries implemented
✅ **Component Isolation**: Critical components individually wrapped
✅ **Retry Mechanisms**: Automatic recovery with exponential backoff
✅ **Health Monitoring**: Component health tracking system

#### Phase 4.2: SSE Integration (Completed)
✅ **Real-time Analysis Streaming**: SSE client with reconnection logic
✅ **Political Strategist Integration**: Live AI analysis updates
✅ **Connection Recovery**: Robust error handling and reconnection

#### Phase 4.3: Advanced Data Visualization (Planned)
🚧 **Enhanced Political Data Charts**: Multi-dimensional sentiment analysis
🚧 **Interactive Map Enhancements**: Real-time data overlays
🚧 **Strategic Timeline Visualization**: Event-based political tracking

#### Phase 4.4: Performance Optimization (Planned)
🚧 **Bundle Optimization**: Component lazy loading and code splitting
🚧 **State Management Optimization**: Advanced React Query patterns
🚧 **Long-running Session Optimization**: Memory leak prevention

#### Phase 4.5: Enhanced UX & Accessibility (Planned)
🚧 **WCAG 2.1 AA Compliance**: Full accessibility implementation
🚧 **PWA Implementation**: Offline capability and app-like experience
🚧 **Campaign Team UX**: Streamlined political intelligence workflows

### Immediate Technical Debt

#### High Priority
1. **TypeScript Migration**: Gradual migration for better type safety
2. **Advanced Testing**: E2E tests with Playwright for critical workflows
3. **Performance Monitoring**: Core Web Vitals tracking and optimization
4. **Bundle Analysis**: Webpack bundle analyzer for optimization opportunities

#### Medium Priority
1. **Component Library**: Extract reusable components into shared library
2. **Advanced Caching**: Service worker for offline capability
3. **Error Monitoring**: Integration with production error tracking service
4. **Code Splitting**: Route-based and component-based lazy loading

#### Low Priority
1. **CSS-in-JS Migration**: Consider styled-components or emotion
2. **State Management Evolution**: Consider Zustand or RTK Query migration
3. **Design System**: Implement comprehensive design tokens
4. **Storybook Integration**: Component documentation and testing

### Performance Targets

**Current Performance** (Development):
- Initial load time: ~2-3 seconds
- API response handling: <500ms for cached data
- Component error recovery: <1 second
- SSE connection establishment: <2 seconds

**Target Performance** (Production):
- Initial load time: <2 seconds
- Time to Interactive: <3 seconds
- API response handling: <200ms for cached data
- Core Web Vitals: All "Good" ratings
- 99.9% component availability (error boundary success)

---

## Conclusion

The LokDarpan frontend represents a mature, production-ready political intelligence dashboard optimized for high-stakes campaign environments. The architecture prioritizes **component resilience** and **real-time intelligence delivery** while maintaining excellent mobile responsiveness and user experience.

**Key Architectural Strengths**:
1. **Component Isolation**: Single component failures cannot crash the entire application
2. **Real-time Capabilities**: SSE integration provides live political intelligence updates
3. **Mobile-First Design**: Optimized for campaign team mobile workflows
4. **Robust Error Handling**: Multi-tier error boundary system with automatic recovery
5. **Performance-Conscious**: React Query caching and efficient state management

**Production Readiness**: The current implementation successfully handles the demanding requirements of political campaign environments with high availability, responsive performance, and resilient operation under failure conditions.

The planned Phase 4 enhancements will further elevate the platform to enterprise-grade standards while maintaining the core architectural principles that make LokDarpan a reliable tool for political intelligence gathering and strategic decision-making.