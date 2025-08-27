# Phase 2: Component Reorganization Plan

## Overview
Transform the current mixed component structure into a feature-based architecture with clear separation of concerns.

## Current State Analysis
```
frontend/src/
├── components/           # 50+ mixed components
├── features/            # Partially organized
├── lib/                 # Some utilities
├── shared/              # Some shared services
└── app/                 # Alternative dashboard
```

## Target State
```
frontend/src/
├── features/
│   ├── overview/
│   │   ├── components/
│   │   │   ├── ExecutiveSummary.jsx
│   │   │   ├── StrategicSummary.jsx
│   │   │   ├── PredictionSummary.jsx
│   │   │   └── DashboardHealthIndicator.jsx
│   │   ├── hooks/
│   │   │   └── useOverviewData.js
│   │   └── index.js
│   │
│   ├── analytics/
│   │   ├── components/
│   │   │   ├── TimeSeriesChart.jsx
│   │   │   ├── EmotionChart.jsx
│   │   │   ├── TopicAnalysis.jsx
│   │   │   ├── CompetitorTrendChart.jsx
│   │   │   └── CompetitorBenchmark.jsx
│   │   ├── hooks/
│   │   │   ├── useChartData.js
│   │   │   └── useAnalytics.js
│   │   └── utils/
│   │       └── chartHelpers.js
│   │
│   ├── strategist/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   │
│   ├── wards/
│   │   ├── components/
│   │   │   ├── LocationMap.jsx
│   │   │   ├── WardMetaPanel.jsx
│   │   │   ├── EpaperFeed.jsx
│   │   │   └── WardSearchModal.jsx
│   │   └── context/
│   │       └── WardContext.jsx
│   │
│   └── alerts/
│       ├── components/
│       │   ├── AlertsPanel.jsx
│       │   └── NotificationSystem.jsx
│       └── services/
│           └── alertService.js
│
├── shared/
│   ├── ui/
│   │   ├── BaseChart.jsx
│   │   ├── LoadingSkeleton.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── ErrorFallback.jsx
│   │   └── MetricCard.jsx
│   ├── services/
│   │   ├── api.js
│   │   └── sse_client.js
│   ├── hooks/
│   │   ├── useApi.js
│   │   └── useDebounce.js
│   └── utils/
│       ├── formatters.js
│       └── validators.js
│
└── layouts/
    ├── DashboardLayout.jsx
    └── TabLayout.jsx
```

## Week 3: Analysis & Planning

### Day 1-2: Dependency Analysis
```bash
# Commands to execute
npm run analyze:dependencies
npm run analyze:imports
npm run analyze:duplicates

# Generate migration map
node scripts/generate-migration-map.js
```

### Day 3-4: Create Feature Structure
```bash
# Create feature directories
mkdir -p frontend/src/features/{overview,analytics,strategist,wards,alerts}/{components,hooks,services,utils}
mkdir -p frontend/src/shared/{ui,services,hooks,utils}
mkdir -p frontend/src/layouts

# Create index files for barrel exports
touch frontend/src/features/*/index.js
```

### Day 5: Setup Migration Scripts
```javascript
// scripts/migrate-components.js
const migrations = {
  'components/ExecutiveSummary.jsx': 'features/overview/components/',
  'components/TimeSeriesChart.jsx': 'features/analytics/components/',
  'components/LocationMap.jsx': 'features/wards/components/',
  // ... complete mapping
};

// Auto-update imports
const updateImports = (file) => {
  // Parse and update import paths
};
```

## Week 4: Migration Execution

### Day 1-2: Shared Components Migration
Priority: Create shared base components first

1. **BaseChart Component**
```javascript
// shared/ui/BaseChart.jsx
export const BaseChart = ({ 
  data, 
  type, 
  options, 
  loading, 
  error,
  fallback 
}) => {
  // Common chart wrapper with error boundary
};
```

2. **Common UI Components**
- LoadingSkeleton
- ErrorFallback  
- MetricCard
- ActionButton

### Day 3-4: Feature Migration (Parallel)
Execute in parallel branches:

**Branch: feature/p2-overview**
- Move ExecutiveSummary, StrategicSummary, PredictionSummary
- Update imports
- Add barrel exports

**Branch: feature/p2-analytics**
- Move all chart components
- Extract common chart logic
- Create useChartData hook

**Branch: feature/p2-wards**
- Move LocationMap, WardMetaPanel, EpaperFeed
- Relocate WardContext
- Update context providers

### Day 5: Import Resolution
```javascript
// Before
import ExecutiveSummary from '../../../components/ExecutiveSummary';
import { api } from '../../../lib/api';

// After  
import { ExecutiveSummary } from '@/features/overview';
import { api } from '@/shared/services';
```

## Testing Strategy

### Unit Tests
```javascript
// Each feature gets its own test directory
features/
├── overview/
│   └── __tests__/
│       ├── ExecutiveSummary.test.jsx
│       └── useOverviewData.test.js
```

### Integration Tests
```javascript
// Test feature interactions
describe('Feature Integration', () => {
  it('should update analytics when ward changes', () => {
    // Test WardContext → Analytics update
  });
});
```

### Migration Validation
```bash
# Validation script
npm run validate:migration

# Checks:
# - No broken imports
# - All tests pass
# - Bundle size unchanged
# - No runtime errors
```

## Rollback Plan

### Feature Flags
```javascript
// config/features.js
export const features = {
  useNewStructure: process.env.REACT_APP_NEW_STRUCTURE === 'true',
  useSharedChart: process.env.REACT_APP_SHARED_CHART === 'true',
};

// Component usage
import { features } from '@/config/features';

const ChartComponent = features.useSharedChart 
  ? SharedChart 
  : LegacyChart;
```

### Git Strategy
```bash
# Tag before migration
git tag pre-phase2-migration

# If rollback needed
git checkout pre-phase2-migration
git checkout -b hotfix/rollback-phase2
```

## Success Criteria

### Metrics
- [ ] Zero broken imports
- [ ] 100% test pass rate
- [ ] Bundle size ≤ current + 5%
- [ ] No performance regression
- [ ] All features functional

### Code Quality
- [ ] No circular dependencies
- [ ] Clear feature boundaries
- [ ] Consistent naming patterns
- [ ] Proper barrel exports
- [ ] Documentation updated

## Risk Mitigation

### High Risk Areas
1. **WardContext dependencies** - Test thoroughly
2. **Chart component refactoring** - Maintain backwards compatibility
3. **Import path updates** - Use automated tools

### Mitigation Strategies
1. **Incremental migration** - One feature at a time
2. **Parallel branches** - Isolate changes
3. **Automated testing** - Run on every commit
4. **Feature flags** - Quick rollback capability

## Documentation Updates

### Update Files
- README.md - New structure documentation
- CONTRIBUTING.md - Component creation guidelines  
- docs/architecture.md - Architecture decisions
- .github/pull_request_template.md - Migration checklist

### Developer Guide
```markdown
## Component Creation Guide

### Creating a New Feature Component
1. Place in appropriate feature directory
2. Create accompanying test file
3. Export from feature index
4. Use shared components when possible

### Import Guidelines
- Use path aliases (@/features, @/shared)
- Prefer named exports
- Group imports by type
```

## Team Coordination

### Daily Standup Topics
- Migration progress
- Blocker identification
- Import conflict resolution
- Test status

### Code Review Focus
- Import path correctness
- Feature boundary respect
- Shared component usage
- Test coverage

## Automated Checks

### Pre-commit Hooks
```yaml
pre-commit:
  - lint-staged
  - import-sorter
  - circular-dependency-check
  - test-affected
```

### CI/CD Pipeline
```yaml
migration-validation:
  - build-check
  - import-validation
  - feature-boundary-check
  - bundle-analysis
  - performance-test
```