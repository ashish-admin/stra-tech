# LokDarpan Error Testing Development Guide

This guide explains how to use the development-only error testing utilities in LokDarpan to validate error boundaries and error handling systems.

## Overview

The error testing system provides comprehensive utilities for simulating various error scenarios in development to ensure that:
- Error boundaries correctly catch and handle component failures
- User experience remains stable when individual components fail
- Error recovery mechanisms work as expected
- Logging and telemetry systems capture error data properly

## Quick Start

### 1. Enable Error Testing

Error testing is automatically enabled in development mode when:
```bash
# Environment variable is set (already configured)
VITE_ENABLE_ERROR_TESTING=true

# Or URL parameter is used
http://localhost:5173?dev-tools=true
```

### 2. Access the Dev Toolbar

- **Visual Interface**: Purple 🧪 button in bottom-left corner
- **Keyboard Shortcut**: `Ctrl+Shift+E` to toggle toolbar

### 3. Quick Error Test

Click any error scenario button in the toolbar to trigger that error type.

## Error Scenarios Available

### Component Render Errors
**Purpose**: Test React error boundaries
**Trigger**: `triggerRenderError(componentName)`
**Shortcut**: `Ctrl+Shift+R`

Simulates a React component throwing an error during render, which should be caught by error boundaries.

### Async/Promise Errors  
**Purpose**: Test unhandled promise rejections
**Trigger**: `triggerAsyncError(componentName)`
**Shortcut**: `Ctrl+Shift+A`

Creates promise rejections that might not be caught by standard error boundaries.

### Network Failures
**Purpose**: Test API error handling
**Trigger**: `triggerNetworkFailure(endpoint)`
**Shortcut**: `Ctrl+Shift+N`

Simulates network request failures by temporarily overriding fetch for specific endpoints.

### API Timeouts
**Purpose**: Test timeout handling
**Trigger**: `triggerApiTimeout(endpoint)`
**Shortcut**: `Ctrl+Shift+T`

Simulates slow API responses that exceed timeout thresholds.

### SSE Connection Failures
**Purpose**: Test Server-Sent Events error recovery
**Trigger**: `triggerSSEFailure(endpoint)`
**Shortcut**: `Ctrl+Shift+S`

Simulates SSE connection drops and reconnection scenarios.

### ChunkLoad Errors
**Purpose**: Test code splitting failures
**Trigger**: `triggerChunkLoadError(chunkName)`
**Shortcut**: `Ctrl+Shift+K`

Simulates failures when loading dynamically imported code chunks.

### Memory Leaks (Temporary)
**Purpose**: Test memory pressure handling
**Trigger**: `triggerMemoryLeak(componentName)`
**Shortcut**: `Ctrl+Shift+M`

Creates temporary memory pressure (auto-cleans after 3 seconds).

### Infinite Loop Detection
**Purpose**: Test performance monitoring
**Trigger**: `triggerInfiniteLoop(componentName)`
**Shortcut**: `Ctrl+Shift+L`

Simulates infinite loop detection with timeout protection.

## Using the Development Interfaces

### 1. Global Dev Toolbar

The main error testing interface appears as a purple 🧪 button in the bottom-left corner.

**Features**:
- Visual error scenario buttons
- Error history tracking (when expanded)
- Custom error creation form
- Error storm testing (multiple errors)
- Keyboard shortcut reference

**Controls**:
- `Ctrl+Shift+E` - Toggle toolbar visibility
- `Ctrl+Shift+C` - Clear error history
- Individual shortcuts for each error type

### 2. Component-Level Testing

Wrap specific components for targeted testing:

```jsx
import ComponentErrorTester from '@/components/ui/ComponentErrorTester';

// Wrap any component for testing
<ComponentErrorTester 
  componentName="LocationMap"
  position="top-right"
  showByDefault={false}
>
  <LocationMap {...props} />
</ComponentErrorTester>
```

### 3. Hook-Based Testing

Use hooks for programmatic error testing:

```jsx
import { useErrorTesting } from '@/hooks/useErrorTesting';

function MyComponent() {
  const { 
    triggerTestError,
    getErrorStats,
    clearAllErrors
  } = useErrorTesting();

  const handleTestClick = () => {
    triggerTestError('MyComponent', 'TestError');
  };

  // Component implementation...
}
```

## Programmatic API

### Core Functions

```javascript
import devTools from '@/utils/devTools';

// Trigger specific error types
devTools.triggerRenderError('ComponentName');
devTools.triggerAsyncError('ComponentName');
devTools.triggerNetworkFailure('/api/endpoint');

// Utility functions
devTools.getErrorRegistry(); // Get error history
devTools.clearErrorHistory(); // Clear all errors
devTools.showErrorTestingHelp(); // Display help
devTools.isDevToolsEnabled(); // Check if enabled
```

### Custom Error Scenarios

```javascript
import { triggerCustomError } from '@/utils/devTools';

// Create custom error scenarios
triggerCustomError(
  'ValidationError',
  'Custom validation failed',
  'MyComponent'
);
```

### Error Storm Testing

```javascript
import { triggerErrorStorm } from '@/utils/devTools';

// Trigger multiple errors for stress testing
triggerErrorStorm(5, 1000); // 5 errors, 1 second apart
```

## Expected Error Boundary Behavior

### Proper Error Boundary Response

When you trigger an error, you should see:

1. **Console Output**: Error details logged with component context
2. **UI Fallback**: Graceful fallback UI instead of blank screen
3. **Isolated Failure**: Only the failing component affected, rest of dashboard functional
4. **Error Reporting**: Error captured in telemetry (if enabled)

### Signs of Poor Error Handling

- **White screen of death**: Entire dashboard crashes
- **Silent failures**: Errors not logged or reported
- **Cascading failures**: One error crashes multiple components
- **Poor user experience**: No fallback UI or recovery options

## Testing Checklist

### Component Error Boundaries
- [ ] Component render errors are caught
- [ ] Fallback UI displays properly
- [ ] Error doesn't crash parent components
- [ ] Error boundary logs error details
- [ ] User can continue using other parts of dashboard

### Async Error Handling
- [ ] Promise rejections are handled
- [ ] Loading states handle errors gracefully
- [ ] Network failures show appropriate messages
- [ ] Retry mechanisms work when available

### SSE Error Recovery
- [ ] Connection drops are detected
- [ ] Reconnection attempts are made
- [ ] User is notified of connection status
- [ ] Data integrity maintained during reconnection

### Performance Under Stress
- [ ] Multiple simultaneous errors handled
- [ ] Memory usage remains stable
- [ ] UI remains responsive during error scenarios
- [ ] Error logging doesn't impact performance

## Integration with Error Boundaries

### Verify Error Boundary Coverage

1. **Component Level**: Each major component wrapped in ComponentErrorBoundary
2. **Tab Level**: Each tab has specialized error boundaries
3. **Application Level**: Top-level ProductionErrorBoundary catches unhandled errors
4. **SSE Level**: SSE connections have dedicated error boundaries

### Expected Error Boundary Hierarchy

```
ProductionErrorBoundary (Application Level)
├── TabErrorBoundary (Tab Level)
│   ├── ComponentErrorBoundary (LocationMap)
│   ├── ComponentErrorBoundary (StrategicSummary)
│   └── ComponentErrorBoundary (TimeSeriesChart)
├── SSEErrorBoundary (Real-time Features)
└── ComponentErrorBoundary (NotificationSystem)
```

## Troubleshooting

### Error Testing Not Working

1. Check environment variables:
```bash
echo $VITE_ENABLE_ERROR_TESTING  # Should be 'true'
```

2. Verify development mode:
```bash
echo $NODE_ENV  # Should be 'development'
```

3. Check browser console for dev tools initialization message

### Error Boundaries Not Catching Errors

1. Verify error boundary implementation
2. Check that components are wrapped correctly
3. Test with React DevTools to inspect error boundary tree
4. Ensure error boundaries are not disabled by feature flags

### Console Warnings

Some expected console warnings during testing:
- "Error boundary caught an error" - This is expected
- "Component error occurred" - Part of error testing
- "Network request failed" - Expected for network failure tests

## Best Practices

### Development Workflow

1. **Before Implementing New Features**:
   - Test existing error boundaries with relevant error scenarios
   - Ensure new components have appropriate error boundary coverage

2. **After Adding Components**:
   - Test component-specific error scenarios
   - Verify error isolation (component failure doesn't crash dashboard)
   - Check error logging and telemetry

3. **Before Deployment**:
   - Run error storm testing to verify system resilience
   - Test error recovery mechanisms
   - Verify production error boundaries are enabled

### Error Boundary Design

1. **Granular Boundaries**: Wrap individual components rather than large sections
2. **Meaningful Fallbacks**: Provide helpful fallback UI, not just error messages
3. **Recovery Options**: Allow users to retry or navigate around errors when possible
4. **Context Preservation**: Maintain user context (selected ward, filters) during errors

### Security Considerations

- Error testing utilities are **development-only**
- All functions are no-ops in production builds
- No sensitive data exposed in error messages
- Error telemetry excludes user data

## Advanced Usage

### Component-Specific Testing

```jsx
// Test specific component scenarios
import { withErrorTesting } from '@/components/ui/ComponentErrorTester';

const ErrorTestedLocationMap = withErrorTesting(LocationMap, 'LocationMap', {
  position: 'top-left',
  testOnMount: false
});
```

### Custom Error Scenarios

```javascript
// Create domain-specific error scenarios
const triggerPoliticalDataError = () => {
  triggerCustomError(
    'PoliticalDataError',
    'Political analysis service unavailable',
    'StrategistTab'
  );
};
```

### Automated Error Testing

```javascript
// Integrate with test suites
describe('Error Boundary Testing', () => {
  it('should handle component render errors', () => {
    triggerRenderError('TestComponent');
    expect(getErrorRegistry().getErrorHistory()).toHaveLength(1);
  });
});
```

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+E` | Toggle dev toolbar |
| `Ctrl+Shift+R` | Trigger render error |
| `Ctrl+Shift+A` | Trigger async error |
| `Ctrl+Shift+N` | Trigger network failure |
| `Ctrl+Shift+T` | Trigger API timeout |
| `Ctrl+Shift+S` | Trigger SSE failure |
| `Ctrl+Shift+K` | Trigger chunk load error |
| `Ctrl+Shift+M` | Trigger memory leak |
| `Ctrl+Shift+L` | Trigger infinite loop |
| `Ctrl+Shift+C` | Clear error history |

## Support

For issues with error testing utilities:

1. Check browser console for error messages
2. Verify environment configuration
3. Ensure components have proper error boundary coverage
4. Review error boundary implementation patterns

Remember: This system is designed to help you build more resilient components. Use it regularly during development to ensure your error handling is robust!