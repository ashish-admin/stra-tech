# Enhanced LocationMap Component

A production-ready, enhanced version of the LokDarpan LocationMap with real-time political intelligence overlays, comprehensive accessibility features, and mobile optimization.

## Features

### 🚀 **Real-time Data Overlays**
- **Sentiment Analysis Overlays**: Visual representation of ward-level sentiment intensity
- **Urgency Indicators**: Color-coded urgency levels (Normal, Elevated, Critical)  
- **Mention Volume**: Visualization of political mention activity
- **Issue Tracking**: Trending political issues by ward

### 🛡️ **Component Resilience**
- **Error Boundaries**: Comprehensive error handling with graceful degradation
- **Retry Mechanisms**: Intelligent retry logic with exponential backoff
- **Fallback UI**: Ward selector dropdown when map fails
- **Progressive Enhancement**: Core functionality works even when advanced features fail

### ♿ **Accessibility & Mobile**
- **Keyboard Navigation**: Full keyboard support with arrow keys, Enter, Escape
- **Screen Reader**: ARIA labels and live regions for accessibility
- **High Contrast**: Automatic detection and support for high contrast mode
- **Touch Optimized**: Enhanced touch interactions for mobile devices
- **Responsive Design**: Mobile-first approach with adaptive UI

### ⚡ **Performance Optimization**
- **Three Performance Modes**: Battery, Balanced, High performance
- **Lazy Loading**: Code splitting for non-critical components
- **Memory Management**: Proper cleanup and memory leak prevention
- **SSE Throttling**: Configurable update intervals based on performance mode
- **Ward Limiting**: Performance-based ward count limiting

## Usage

### Basic Implementation

```jsx
import EnhancedLocationMap from '@/features/geographic/components/LocationMap.jsx';

function PoliticalDashboard() {
  return (
    <EnhancedLocationMap
      geojson={wardBoundaryData}
      selectedWard={selectedWard}
      onWardSelect={handleWardSelect}
      enableRealTimeOverlays={true}
      overlayMode="sentiment"
    />
  );
}
```

### Advanced Configuration

```jsx
<EnhancedLocationMap
  // Core Props
  geojson={wardGeojson}
  selectedWard={selectedWard}
  onWardSelect={handleWardSelect}
  
  // Real-time Intelligence
  enableRealTimeOverlays={true}
  overlayMode="sentiment" // 'sentiment' | 'urgency' | 'mentions' | 'issues'
  showUrgencyIndicators={true}
  
  // Performance & Mobile
  performanceMode="balanced" // 'high' | 'balanced' | 'battery'
  className="h-96 lg:h-[600px]"
  
  // Accessibility
  enableKeyboardNavigation={true}
  accessibilityMode={false}
  onWardHover={handleWardHover}
  
  // Layout
  minHeight={320}
  maxHeight={900}
  matchHeightRef={panelRef}
  preferredDvh={62}
/>
```

### Ward Context Integration

```jsx
import { useWard } from '@/shared/context/WardContext';

function Dashboard() {
  const { ward, setWard } = useWard();
  
  return (
    <EnhancedLocationMap
      selectedWard={ward}
      onWardSelect={setWard}
      enableRealTimeOverlays={true}
      overlayMode="sentiment"
    />
  );
}
```

## Props API

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `geojson` | `Object` | - | Ward boundary GeoJSON data |
| `selectedWard` | `string` | - | Currently selected ward name |
| `onWardSelect` | `function` | - | Ward selection callback |
| `metricField` | `string` | `null` | Field name for metric-based coloring |
| `getMetric` | `function` | `null` | Custom metric accessor function |
| `showLabels` | `boolean` | `true` | Show ward name labels |

### Real-time Overlay Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableRealTimeOverlays` | `boolean` | `true` | Enable real-time data overlays |
| `overlayMode` | `string` | `'sentiment'` | Overlay visualization mode |
| `showUrgencyIndicators` | `boolean` | `true` | Show urgency level indicators |

### Performance Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `performanceMode` | `string` | `'balanced'` | Performance optimization level |
| `minHeight` | `number` | `320` | Minimum map height in pixels |
| `maxHeight` | `number` | `900` | Maximum map height in pixels |
| `matchHeightRef` | `React.RefObject` | `null` | Match height of referenced element |
| `preferredDvh` | `number` | - | Preferred viewport height percentage |

### Accessibility Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableKeyboardNavigation` | `boolean` | `true` | Enable keyboard navigation |
| `accessibilityMode` | `boolean` | `false` | Enhanced accessibility features |
| `onWardHover` | `function` | `null` | Ward hover callback |

### Styling Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes |

## Overlay Modes

### 1. Sentiment Mode (`overlayMode="sentiment"`)
- Visualizes political sentiment intensity across wards
- Color scale from neutral to high sentiment
- Shows primary emotion and sentiment percentage in tooltips
- Real-time updates from SSE sentiment analysis

### 2. Urgency Mode (`overlayMode="urgency"`)
- Displays political urgency levels by ward
- Color coding: Green (Normal), Amber (Elevated), Red (Critical)
- Shows number of priority alerts in tooltips
- Automated urgency calculation based on multiple factors

### 3. Mentions Mode (`overlayMode="mentions"`)
- Shows political mention volume by ward
- Logarithmic scale for mention count visualization
- Useful for tracking political activity hotspots
- Updates with real-time mention tracking

### 4. Issues Mode (`overlayMode="issues"`)
- Visualizes trending political issues by ward
- Color intensity based on issue count
- Shows top trending issues in tooltips
- Tracks emerging political topics

## Performance Modes

### Battery Mode (`performanceMode="battery"`)
- Minimal resource usage
- Limited to 15 wards maximum
- 30-second update intervals
- Reduced animations and effects
- Ideal for mobile devices with battery constraints

### Balanced Mode (`performanceMode="balanced"`) - Default
- Balanced performance and features
- Up to 30 wards displayed
- 15-second update intervals
- Standard animations and effects
- Recommended for most use cases

### High Performance Mode (`performanceMode="high"`)
- Maximum features and responsiveness
- Up to 50 wards displayed  
- 10-second update intervals
- Full animations and effects
- Best for desktop with good hardware

## Keyboard Navigation

When `enableKeyboardNavigation={true}`:

| Key | Action |
|-----|---------|
| `↑` / `↓` | Navigate through wards |
| `Enter` / `Space` | Select focused ward |
| `Escape` | Clear ward focus |
| `Ctrl+H` / `Alt+H` | Show ward list |

## Accessibility Features

### Screen Reader Support
- ARIA labels and roles
- Live region announcements for ward changes
- Descriptive tooltip content
- Keyboard navigation announcements

### High Contrast Mode
- Automatic detection of OS high contrast preference
- Enhanced color contrast ratios
- Bold borders and increased opacity
- Yellow/black selection colors

### Mobile Accessibility
- Touch-friendly target sizes (minimum 44px)
- Responsive tooltip positioning
- Simplified mobile interface
- Gesture-based interactions

## Error Handling

### Error Types
- **Initialization Errors**: Map fails to create
- **GeoJSON Errors**: Invalid or missing boundary data
- **Polygon Rendering Errors**: Feature processing failures
- **Network Errors**: Real-time data fetch failures

### Recovery Mechanisms
- Automatic retry with exponential backoff
- Maximum retry limits (default: 3 attempts)
- Fallback ward selector interface
- Graceful degradation to basic functionality

### Error Boundary
Wraps component with error boundary that:
- Catches JavaScript errors
- Prevents cascade failures
- Shows user-friendly error messages
- Provides retry mechanisms
- Maintains ward selection functionality

## Real-time Updates

### SSE Integration
- Connects to Political Strategist SSE endpoint
- Processes multiple message types:
  - `analysis`: Sentiment analysis updates
  - `intelligence`: Political intelligence briefs
  - `confidence`: Confidence score updates
  - `progress`: Multi-stage analysis progress

### Update Throttling
Performance-aware update throttling:
- Battery mode: 30 seconds minimum between updates
- Balanced mode: 15 seconds minimum
- High performance: 10 seconds minimum

### Connection Recovery
- Automatic reconnection on connection loss
- Exponential backoff retry strategy
- Connection health monitoring
- Network quality assessment

## Testing

### Unit Tests
```bash
npm test -- EnhancedLocationMap.test.jsx
```

### Integration Tests
```bash
npm run test:integration -- geographic
```

### Visual Regression Tests
```bash
npm run test:visual -- enhanced-location-map
```

## Migration from Original LocationMap

### Breaking Changes
- None - fully backward compatible

### Enhanced Features
- All original functionality preserved
- New real-time overlay system
- Enhanced accessibility
- Improved mobile support
- Better error handling

### Migration Example
```jsx
// Before
import LocationMap from './LocationMap';

<LocationMap
  geojson={data}
  selectedWard={ward}
  onWardSelect={setWard}
/>

// After (no changes required, enhanced features available)
import EnhancedLocationMap from './LocationMap';

<EnhancedLocationMap
  geojson={data}
  selectedWard={ward}
  onWardSelect={setWard}
  // Optional: Enable new features
  enableRealTimeOverlays={true}
  overlayMode="sentiment"
  performanceMode="balanced"
/>
```

## Browser Support

### Modern Browsers
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

### Mobile Browsers
- Chrome Mobile 88+
- Safari iOS 14+
- Samsung Internet 15+
- Firefox Mobile 85+

### Required Features
- ES2020 support
- CSS Grid and Flexbox
- Intersection Observer API
- ResizeObserver API
- EventSource (SSE) support

## Performance Metrics

### Rendering Performance
- Initial render: <200ms (balanced mode)
- Ward update: <50ms
- Overlay switch: <100ms
- Memory usage: <50MB sustained

### Network Performance
- GeoJSON cache: 1 hour TTL
- Real-time data: 2 minute cache
- SSE connection: Auto-recovery
- API calls: <500ms typical response

## Contributing

### Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Run tests: `npm test`

### Code Standards
- TypeScript/JSDoc comments required
- 90%+ test coverage for new features
- Accessibility testing with screen readers
- Mobile testing on real devices
- Performance testing with Chrome DevTools

### Component Architecture
- React 18+ with hooks
- Error boundaries for resilience
- Lazy loading for performance
- Context API integration
- Custom hooks for reusability

For technical questions or feature requests, see the [main project documentation](../../../README.md).