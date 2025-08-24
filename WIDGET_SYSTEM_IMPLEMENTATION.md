# Widget System & Heat Maps Implementation Guide

## Overview

This document provides a comprehensive guide to the newly implemented widget system and heat map components for the LokDarpan Political Intelligence Dashboard. The system enables drag-and-drop widget management with specialized political data visualizations.

## Architecture Overview

### Core Components

#### 1. Widget Infrastructure
```
frontend/src/components/widgets/
├── WidgetRegistry.js          # Central widget type registry
├── BaseWidget.jsx             # Abstract base component for all widgets
├── WidgetManager.jsx          # Drag-and-drop widget orchestration
└── WidgetDashboard.jsx        # Enhanced dashboard integration
```

#### 2. Heat Map Components
```
frontend/src/components/heatmaps/
├── SentimentHeatMap.jsx       # Emotional intensity over time
├── PartyActivityHeatMap.jsx   # Political party engagement patterns
├── IssueIntensityHeatMap.jsx  # Political issue discussion intensity
├── WardEngagementHeatMap.jsx  # Geographic political activity
├── CompetitiveHeatMap.jsx     # Multi-party comparative analysis
└── CalendarHeatMap.jsx        # GitHub-style political calendar
```

#### 3. Backend API Support
```
backend/app/heatmap_api.py     # Specialized heat map data endpoints
```

## Installation & Setup

### 1. Frontend Dependencies

Install required npm packages:

```bash
cd frontend
npm install react-grid-layout react-resizable react-calendar-heatmap date-fns
```

### 2. CSS Styles

Add the following CSS imports to your main CSS file or component:

```css
/* Required for react-grid-layout */
@import 'react-grid-layout/css/styles.css';
@import 'react-resizable/css/styles.css';

/* Required for react-calendar-heatmap */
@import 'react-calendar-heatmap/dist/styles.css';

/* Heat Map Custom Styles */
.react-calendar-heatmap .color-empty { fill: #ebedf0; }
.react-calendar-heatmap .color-scale-1 { fill: #9be9a8; }
.react-calendar-heatmap .color-scale-2 { fill: #40c463; }
.react-calendar-heatmap .color-scale-3 { fill: #30a14e; }
.react-calendar-heatmap .color-scale-4 { fill: #216e39; }

/* Party-specific Heat Map Colors */
.party-bjp-1 { fill: #fff3e0; }
.party-bjp-2 { fill: #ffcc80; }
.party-bjp-3 { fill: #ff9800; }
.party-bjp-4 { fill: #f57c00; }

.party-inc-1 { fill: #e3f2fd; }
.party-inc-2 { fill: #90caf9; }
.party-inc-3 { fill: #2196f3; }
.party-inc-4 { fill: #1565c0; }

.party-brs-1 { fill: #fce4ec; }
.party-brs-2 { fill: #f48fb1; }
.party-brs-3 { fill: #e91e63; }
.party-brs-4 { fill: #ad1457; }

.party-aimim-1 { fill: #e8f5e8; }
.party-aimim-2 { fill: #a5d6a7; }
.party-aimim-3 { fill: #4caf50; }
.party-aimim-4 { fill: #2e7d32; }
```

### 3. Backend Integration

The heat map API endpoints are automatically registered when the Flask app starts. Ensure the following import is added to `backend/app/__init__.py`:

```python
from .heatmap_api import heatmap_bp
app.register_blueprint(heatmap_bp)
```

## Usage Guide

### 1. Basic Widget Dashboard Integration

Replace the existing Dashboard component with the new WidgetDashboard:

```jsx
import WidgetDashboard from './components/widgets/WidgetDashboard.jsx';

function App() {
  return <WidgetDashboard />;
}
```

### 2. Adding Custom Widgets

Register new widget types in the WidgetRegistry:

```javascript
import { widgetRegistry } from './components/widgets/WidgetRegistry.js';

widgetRegistry.register({
  id: 'custom-widget',
  name: 'Custom Widget',
  component: () => import('./components/CustomWidget.jsx'),
  category: 'custom',
  defaultSize: { w: 4, h: 3 },
  description: 'Custom widget description',
  apiEndpoints: ['/api/v1/custom-data'],
  dependencies: ['ward-data']
});
```

### 3. Widget Configuration

Each widget supports configuration through props:

```jsx
<SentimentHeatMap
  title="Political Sentiment Analysis"
  refreshInterval={300}  // 5 minutes
  widgetId="sentiment-heatmap"
  instanceId="sentiment-1"
/>
```

### 4. Heat Map Data Integration

Heat map components automatically integrate with the following API endpoints:

- `/api/v1/heatmap/sentiment` - Sentiment analysis data
- `/api/v1/heatmap/party-activity` - Party activity data  
- `/api/v1/heatmap/issues` - Issue intensity data
- `/api/v1/heatmap/geographic` - Geographic activity data
- `/api/v1/heatmap/calendar` - Calendar-based activity data

## Available Widget Types

### Heat Map Widgets

#### 1. Sentiment Heat Map
- **Purpose**: Visualize emotional intensity patterns over time
- **Data Source**: Post sentiment analysis with 7 emotion categories
- **Configuration**: Time range, emotion filters, aggregation methods
- **Use Cases**: Track public mood, identify emotional trends

#### 2. Party Activity Heat Map  
- **Purpose**: Track political party engagement levels
- **Data Source**: Party mentions, sentiment scores, share of voice
- **Configuration**: Party selection, view modes (single/comparative/aggregate)
- **Use Cases**: Compare party performance, identify activity patterns

#### 3. Issue Intensity Heat Map
- **Purpose**: Monitor political issue discussion intensity
- **Data Source**: Keyword-based topic analysis
- **Configuration**: Custom keywords, aggregation methods
- **Use Cases**: Track hot topics, identify emerging issues

#### 4. Ward Engagement Heat Map
- **Purpose**: Geographic visualization of political activity
- **Data Source**: Ward-based activity aggregation
- **Configuration**: Activity metrics, party dominance
- **Use Cases**: Geographic campaign planning, resource allocation

#### 5. Calendar Heat Map
- **Purpose**: GitHub-style calendar of daily political activity
- **Data Source**: Daily activity counts and patterns
- **Configuration**: Time range, activity metrics
- **Use Cases**: Long-term trend analysis, activity pattern identification

### Intelligence Widgets

#### 6. Strategic Pulse Monitor
- **Purpose**: Real-time strategic intelligence and recommendations
- **Integration**: SSE streaming, AI analysis pipeline
- **Features**: Live updates, confidence scoring, strategic alerts

#### 7. Intelligence Alert Stream
- **Purpose**: Live feed of political intelligence alerts
- **Integration**: Real-time alert system with filtering
- **Features**: Priority levels, custom filters, alert history

### Analytics Widgets

#### 8. Trend Analytics Dashboard
- **Purpose**: Comprehensive trend analysis and forecasting
- **Features**: Time-series analysis, predictive modeling
- **Integration**: Historical data, trend algorithms

#### 9. Demographic Insights
- **Purpose**: Ward demographic analysis with political correlation
- **Features**: Population demographics, political alignment analysis
- **Integration**: Census data, electoral results

## API Endpoints

### Heat Map Data Endpoints

All heat map endpoints support the following common parameters:
- `ward`: Ward filter (default: 'All')
- `days`: Time range in days (default: varies by endpoint)

#### `/api/v1/heatmap/sentiment`
```
GET /api/v1/heatmap/sentiment?ward=Jubilee Hills&days=90&emotions=hopeful,angry&aggregation=sum
```

**Parameters:**
- `emotions`: Comma-separated emotion list
- `aggregation`: sum, average, max, count

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "count": 25,
      "emotions": {"hopeful": 15, "angry": 10},
      "details": {"dominant_emotion": "hopeful"}
    }
  ],
  "metadata": {
    "ward": "Jubilee Hills",
    "time_range": 90,
    "aggregation": "sum"
  }
}
```

#### `/api/v1/heatmap/party-activity`
```
GET /api/v1/heatmap/party-activity?ward=All&days=60&parties=BJP,INC&metric=mentions&view_mode=comparative
```

**Parameters:**
- `parties`: Comma-separated party list
- `metric`: mentions, sentiment_score, engagement, share_of_voice, activity_score
- `view_mode`: single, comparative, aggregate
- `focus_party`: Required for single mode

#### `/api/v1/heatmap/issues`
```
GET /api/v1/heatmap/issues?ward=All&days=30&keywords=development,infrastructure&aggregation=mentions
```

**Parameters:**
- `keywords`: Comma-separated keyword list
- `aggregation`: mentions, posts, diversity

#### `/api/v1/heatmap/geographic`
```
GET /api/v1/heatmap/geographic?days=30&metric=activity
```

**Parameters:**
- `metric`: activity, sentiment, party_dominance

#### `/api/v1/heatmap/calendar`
```
GET /api/v1/heatmap/calendar?ward=All&days=365&metric=posts
```

**Parameters:**
- `metric`: posts, mentions, alerts, activity

## Widget Presets

The system includes predefined widget layouts for common use cases:

### 1. Political Overview
- Sentiment Heat Map (6x4)
- Party Activity Heat Map (6x4)
- Strategic Pulse Monitor (4x5)
- Alert Stream (4x5)
- Trend Analytics (4x5)

### 2. Heat Map Analysis
- All major heat map widgets in grid layout
- Focus on visual pattern analysis
- Calendar heat map for temporal overview

### 3. Strategic Intelligence
- Strategic Pulse Monitor (6x6)
- Alert Stream (6x6)
- Competitive Heat Map (8x4)
- Trend Analytics (4x4)

### 4. Monitoring & Alerts
- Alert Stream (4x8)
- Calendar Heat Map (8x3)
- Trend Analytics (4x5)
- Demographic Insights (4x5)

## Error Handling & Resilience

### 1. Component-Level Error Boundaries
Each widget is wrapped in error boundaries to prevent cascade failures:

```jsx
<WidgetErrorBoundary widgetId={widgetId} onRemove={handleRemove}>
  <WidgetComponent />
</WidgetErrorBoundary>
```

### 2. Graceful Degradation
- Failed widgets show error states with retry options
- Missing data shows empty states with helpful messages
- API failures fallback to cached data when available

### 3. Loading States
- Skeleton loading animations during data fetch
- Progressive loading for large datasets
- Configurable refresh intervals

## Performance Considerations

### 1. Lazy Loading
- Widget components are dynamically imported
- Large datasets are paginated or virtualized
- Images and charts are optimized for performance

### 2. Caching Strategy
- API responses cached with React Query
- Widget configurations persisted in localStorage
- Layout state auto-saved with debouncing

### 3. Resource Management
- Automatic cleanup of intervals and subscriptions
- Memory leak prevention for long-running widgets
- Efficient re-rendering with React.memo and useMemo

## Development Guidelines

### 1. Creating New Widgets

Follow the BaseWidget pattern:

```jsx
import BaseWidget, { useBaseWidget } from '../widgets/BaseWidget.jsx';

function CustomWidget({ widgetId, instanceId, title, ...props }) {
  const {
    isLoading,
    error,
    handleRefresh
  } = useBaseWidget({
    widgetId,
    title,
    onDataUpdate: fetchData
  });

  return (
    <BaseWidget
      widgetId={widgetId}
      title={title}
      onRefresh={handleRefresh}
      isLoading={isLoading}
      error={error}
    >
      {/* Widget content */}
    </BaseWidget>
  );
}
```

### 2. Widget Registration

Register in WidgetRegistry with proper metadata:

```javascript
widgetRegistry.register({
  id: 'unique-widget-id',
  name: 'Human Readable Name',
  component: () => import('./WidgetComponent.jsx'),
  category: 'category-name',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 8, h: 6 },
  description: 'Widget description for users',
  apiEndpoints: ['/api/v1/widget-data'],
  dependencies: ['required-data-types']
});
```

### 3. API Endpoint Development

Follow the heat map API patterns:

```python
@heatmap_bp.route('/custom-data', methods=['GET'])
@login_required
def custom_heatmap():
    try:
        # Parse parameters
        ward = request.args.get('ward', 'All')
        days = int(request.args.get('days', 30))
        
        # Process data
        data = process_custom_data(ward, days)
        
        return jsonify({
            'success': True,
            'data': data,
            'metadata': {
                'ward': ward,
                'time_range': days
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

## Testing Strategy

### 1. Component Testing
- Unit tests for widget components
- Integration tests for widget manager
- E2E tests for complete workflows

### 2. API Testing
- Heat map endpoint validation
- Data format verification
- Error handling validation

### 3. Performance Testing
- Widget rendering performance
- Large dataset handling
- Memory usage optimization

## Deployment Considerations

### 1. Production Optimization
- Bundle splitting for widget components
- CDN optimization for static assets
- Gzip compression for API responses

### 2. Environment Configuration
- Configurable widget refresh intervals
- Environment-specific API endpoints
- Feature flags for widget availability

### 3. Monitoring & Analytics
- Widget usage analytics
- Error tracking and reporting
- Performance monitoring

## Future Enhancements

### 1. Advanced Features
- Real-time collaboration on widget layouts
- Advanced widget configuration UI
- Custom widget themes and styling

### 2. Additional Widget Types
- Interactive geographic maps
- Advanced chart types (sankey, network graphs)
- AI-powered insight widgets

### 3. Performance Improvements
- WebGL-based visualizations for large datasets
- Service worker caching
- Progressive Web App features

## Support & Troubleshooting

### Common Issues

#### 1. Widget Not Loading
- Check console for import errors
- Verify widget registration in WidgetRegistry
- Ensure required dependencies are installed

#### 2. Heat Map Data Issues
- Verify API endpoint availability
- Check data format and schema
- Validate ward normalization

#### 3. Layout Persistence Issues
- Clear localStorage cache
- Check browser compatibility
- Verify layout validation

### Debug Mode

Enable debug logging:

```javascript
localStorage.setItem('widget-debug', 'true');
```

This enables detailed logging for widget lifecycle, data fetching, and error handling.

## Conclusion

The Widget System & Heat Maps implementation provides LokDarpan with a powerful, flexible dashboard framework that scales from simple visualizations to complex political intelligence workflows. The modular architecture ensures maintainability while the comprehensive error handling provides production-ready reliability.

For additional support or questions, refer to the component documentation within each widget file or contact the development team.