# LokDarpan Interactive Component Testing Suite

Comprehensive interactive testing and validation for the LokDarpan political intelligence dashboard, focusing on user experience, performance, and component resilience.

## Overview

This test suite validates all interactive behaviors of the LokDarpan dashboard components to ensure smooth user experience for political intelligence gathering workflows. The tests are designed to catch issues that would impact real-world usage during campaign periods.

## Test Structure

### 1. LocationMap Interactive Testing (`LocationMap.interactive.test.jsx`)

**Focus**: Geographic interaction and map functionality
- **Polygon Click Detection**: Validates ward selection through map clicks
- **Map Controls**: Zoom, pan, reset, search functionality  
- **Tooltip Integration**: Ward metadata display on hover with API integration
- **Search & Focus**: Ward search with autocomplete and jump functionality
- **Error Recovery**: Fallback UI behavior and retry mechanisms
- **Responsive Heights**: Map sizing and responsive behavior

**Key Test Scenarios**:
- Map initialization with Leaflet configuration
- Polygon click handlers and ward selection propagation
- Search input with Enter key and focus button functionality
- Tooltip metadata enrichment from API calls
- Error states with graceful fallback and retry logic
- Responsive height matching with reference elements

### 2. Filter Interaction Validation (`FilterInteraction.validation.test.jsx`)

**Focus**: Filter synchronization and real-time updates
- **Emotion Filters**: All 12 emotion categories with case-insensitive matching
- **Ward Selection**: Dropdown synchronization with map interactions
- **Keyword Search**: Real-time filtering with debouncing
- **Combined Filters**: Multiple active filters with conflict resolution
- **State Persistence**: Filter state across tab changes
- **Performance**: Sub-100ms filter response times

**Key Test Scenarios**:
- Emotion filter dropdown with all categories (Anger, Joy, Hopeful, etc.)
- Ward selection synchronization between dropdown and map
- Real-time keyword search with progressive filtering
- Combined filter scenarios and conflict handling
- Rapid filter changes without race conditions
- Filter state preservation across navigation

### 3. Chart Component Interactivity (`ChartInteractivity.test.jsx`)

**Focus**: Chart interactions and data visualization
- **TimeSeriesChart**: Hover interactions, tooltips, legend toggling
- **EmotionChart**: Data updates and responsive rendering
- **Chart Performance**: Large dataset handling and optimization
- **Error Boundaries**: Graceful failure and fallback displays
- **Animation Control**: Smooth transitions and reduced motion support

**Key Test Scenarios**:
- Chart hover interactions with tooltip display
- Legend clicking for series toggling
- Large dataset rendering performance
- Chart error states with retry mechanisms
- Fallback data table display when charts fail
- Animation toggling and performance optimization

### 4. Data Synchronization Testing (`DataSynchronization.test.jsx`)

**Focus**: Cross-component state management
- **Ward Selection**: Propagation across all components
- **Real-time Updates**: API data synchronization without refresh
- **State Persistence**: localStorage and URL parameter updates
- **Component Isolation**: Partial failure handling
- **Concurrent Interactions**: Race condition prevention

**Key Test Scenarios**:
- Ward selection propagation to all tabs and components
- API call synchronization and cancellation
- State persistence across browser refresh
- Component isolation during API failures
- Concurrent user interactions without state corruption
- SSE data updates reflecting ward changes

### 5. User Experience Testing (`UserExperience.test.jsx`)

**Focus**: User-centric interaction patterns
- **Loading States**: Progressive loading and skeleton components
- **Keyboard Navigation**: Full accessibility support
- **Touch Interactions**: Mobile-friendly gesture handling
- **Error Messaging**: User-friendly error states
- **Progressive Disclosure**: Lazy loading and performance

**Key Test Scenarios**:
- Loading skeleton display during data fetching
- Keyboard navigation through all controls
- Touch gestures and mobile interactions
- Accessible labels and screen reader support
- Error states with actionable recovery options
- Progressive loading of heavy components

### 6. Performance Testing (`Performance.test.jsx`)

**Focus**: Performance validation and optimization
- **Response Times**: <100ms interaction targets
- **Memory Management**: Memory leak detection and cleanup
- **Animation Performance**: 60fps animation validation
- **Scroll Performance**: Large dataset scroll optimization
- **Bundle Impact**: Lazy loading and code splitting validation

**Key Test Scenarios**:
- Filter interaction response times under 100ms
- Memory usage stability during extended interaction
- Animation frame rate monitoring for smooth transitions
- Virtual scrolling for large datasets
- Component lazy loading and bundle size optimization
- Mobile performance optimization validation

## Running the Tests

### Prerequisites

```bash
cd frontend
npm install
```

### Individual Test Suites

```bash
# Run all interactive tests
npm run test:interactive

# Run specific test suites
npm test -- LocationMap.interactive.test.jsx
npm test -- FilterInteraction.validation.test.jsx
npm test -- ChartInteractivity.test.jsx
npm test -- DataSynchronization.test.jsx
npm test -- UserExperience.test.jsx
npm test -- Performance.test.jsx
```

### Coverage and Reporting

```bash
# Run with coverage
npm run test:coverage

# Run with UI for interactive debugging
npm run test:ui

# Watch mode for development
npm run test:watch
```

## Performance Targets

### Response Time Targets
- **Filter Changes**: <100ms
- **Ward Selection**: <200ms  
- **Chart Interactions**: <50ms
- **Tab Navigation**: <200ms
- **Keyboard Input**: <10ms per keystroke

### Memory Usage Targets
- **Extended Usage**: <20MB growth over 1 hour
- **Large Datasets**: <50MB peak usage
- **Component Cleanup**: >90% memory recovery on unmount

### Animation Targets
- **Chart Animations**: 55-60 FPS
- **Transitions**: <500ms duration
- **Loading States**: <2s initial load
- **Progressive Loading**: <100ms incremental

## Test Environment Configuration

### Mock Configuration

The test suite includes comprehensive mocks for:
- **Leaflet**: Map library with interactive behavior simulation
- **Recharts**: Chart library with hover and tooltip simulation
- **Axios**: HTTP requests with configurable responses
- **Performance APIs**: Memory monitoring and timing measurements
- **Browser APIs**: Touch events, keyboard navigation, media queries

### Test Data

Realistic test data includes:
- **Political Posts**: Sample content with emotions and ward assignments
- **GeoJSON**: Ward boundary data for map testing
- **Time Series**: Historical trend data for chart testing
- **Large Datasets**: Performance testing with 1K-10K records

### Browser Compatibility

Tests validate functionality across:
- **Desktop**: Modern browsers with full feature support
- **Mobile**: Touch interactions and responsive behavior
- **Accessibility**: Screen readers and keyboard navigation
- **Performance**: Various device capabilities and network conditions

## Validation Criteria

### Functional Validation
- ✅ All interactive elements respond correctly
- ✅ Data synchronization across components
- ✅ Error states handled gracefully
- ✅ Accessibility requirements met

### Performance Validation
- ✅ Response times meet targets
- ✅ Memory usage remains stable
- ✅ Animations run smoothly
- ✅ Large datasets handled efficiently

### User Experience Validation
- ✅ Loading states provide feedback
- ✅ Error messages are actionable
- ✅ Navigation is intuitive
- ✅ Mobile experience is optimal

## Common Issues and Solutions

### Performance Issues
**Issue**: Slow filter response
**Solution**: Implement debouncing and memoization

**Issue**: Memory leaks during navigation
**Solution**: Proper cleanup in useEffect hooks

### Interaction Issues  
**Issue**: Race conditions in API calls
**Solution**: Request cancellation and abort controllers

**Issue**: Touch events not working
**Solution**: Add touch event listeners and gesture handling

### Data Issues
**Issue**: State desynchronization
**Solution**: Centralized state management and proper prop drilling

**Issue**: Stale data display
**Solution**: React Query cache invalidation strategies

## Continuous Monitoring

The interactive testing suite is designed for:
- **CI/CD Integration**: Automated testing on every commit
- **Performance Regression**: Baseline comparisons and alerts  
- **User Experience Monitoring**: Real-world usage pattern validation
- **Accessibility Compliance**: WCAG 2.1 AA validation

## Contributing

When adding new interactive features:

1. **Add Tests First**: Write interaction tests before implementation
2. **Performance Baseline**: Establish performance targets
3. **Error Scenarios**: Test failure modes and recovery
4. **Accessibility**: Validate keyboard and screen reader support
5. **Mobile Compatibility**: Test touch interactions and responsive behavior

## Related Documentation

- [Component Architecture](../README.md)
- [Performance Guidelines](../../docs/performance.md)
- [Accessibility Standards](../../docs/accessibility.md)
- [Testing Strategy](../../docs/testing.md)