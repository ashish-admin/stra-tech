# ADR-002: Feature Flag System Architecture

Date: 2025-08-26
Status: Accepted

## Context

The LokDarpan frontend enhancement project involves significant architectural changes that must be deployed safely without risking the stability of the production system during critical campaign periods. We need:
- Zero-risk deployment strategy
- Progressive feature rollout capability
- Emergency rollback mechanisms
- A/B testing capabilities
- Runtime configuration without redeployment

## Decision

We will implement a comprehensive feature flag management system with runtime control and phase-based organization.

### System Architecture

```javascript
class FeatureFlagManager {
  flags = { ...enhancementFlags }  // All start as false
  listeners = new Set()             // React component subscriptions
  
  isEnabled(flagName)              // Check flag status
  setFlag(flagName, value)         // Runtime toggle (dev only)
  enablePhase(phase)                // Enable all flags for a phase
  subscribe(callback)               // React hook integration
}
```

### Flag Organization

1. **Phase-Based Grouping**
   ```javascript
   // Phase 1: Error Boundaries
   enableComponentErrorBoundaries: false
   enableTabErrorBoundaries: false
   enableSSEErrorBoundaries: false
   
   // Phase 2: Component Reorganization
   useNewComponentStructure: false
   useSharedBaseChart: false
   
   // Phase 3: SSE Integration
   enableSSEManager: false
   enableCircuitBreaker: false
   ```

2. **Global Kill Switch**
   ```javascript
   enableFrontendEnhancements: false  // Master control
   ```

3. **Safety-First Defaults**
   - ALL flags start as `false`
   - Production changes require explicit activation
   - CI/CD validates all flags are false

### Runtime Control Mechanisms

1. **URL Parameters** (Development)
   ```
   ?ff_enablePerformanceMonitor=true
   ```

2. **LocalStorage** (Development)
   ```javascript
   localStorage.setItem('lokdarpan_feature_flags', JSON.stringify({
     enableComponentErrorBoundaries: true
   }))
   ```

3. **Server Configuration** (Production)
   ```javascript
   GET /api/v1/feature-flags
   Response: { enablePhase1: true, ... }
   ```

4. **Development Console**
   ```javascript
   featureFlags.enablePhase(1)  // Enable all Phase 1 features
   featureFlags.getAllFlags()    // View current state
   featureFlags.reset()          // Reset to defaults
   ```

### React Integration

```javascript
// Hook usage
function MyComponent() {
  const isEnabled = useFeatureFlag('enablePerformanceMonitor');
  
  if (!isEnabled) return null;
  return <PerformanceMonitor />;
}

// Context integration
<FeatureFlagProvider>
  <App />
</FeatureFlagProvider>
```

### Progressive Rollout Strategy

1. **Development**: All flags can be toggled freely
2. **Staging**: Server-controlled flags, 100% rollout
3. **Production**: 
   - Week 1: 5% of users (canary)
   - Week 2: 25% of users (early adopters)
   - Week 3: 50% of users (wider release)
   - Week 4: 100% of users (general availability)

## Consequences

### Positive
- **Zero-Risk Deployment**: Features can be deployed but not activated
- **Instant Rollback**: Disable features without redeployment
- **Progressive Enhancement**: Gradual rollout with monitoring
- **A/B Testing**: Compare feature performance with control group
- **Developer Experience**: Easy testing of feature combinations

### Negative
- **Code Complexity**: Conditional logic throughout codebase
- **Bundle Size**: Includes code for disabled features (~5KB overhead)
- **Testing Burden**: Must test all flag combinations
- **Technical Debt**: Flag cleanup needed after full rollout

### Risk Mitigation

1. **CI/CD Validation**
   ```yaml
   - name: Validate feature flags
     run: |
       node -e "
       const flags = require('./src/config/features.js');
       // Verify all flags start as false
       "
   ```

2. **Monitoring Integration**
   - Track feature flag changes
   - Monitor performance impact per flag
   - Alert on unexpected flag states

3. **Documentation Requirements**
   - Each flag must document purpose and impact
   - Removal timeline defined at creation
   - Dependencies between flags documented

## Implementation Details

### Phase Management
```javascript
featureFlagManager.enablePhase(1)   // Enable all Phase 1 features
featureFlagManager.disablePhase(1)  // Disable all Phase 1 features
featureFlagManager.getPhaseFlags(1) // Get Phase 1 flag status
```

### Subscription Pattern
```javascript
const unsubscribe = featureFlagManager.subscribe((flag, value) => {
  console.log(`Flag ${flag} changed to ${value}`);
  // React components auto-rerender
});
```

### Server Sync
```javascript
// Polls every 5 minutes in production
async fetchServerFlags() {
  const flags = await fetch('/api/v1/feature-flags');
  Object.assign(this.flags, flags);
  this.notifyAllListeners();
}
```

## Rollback Procedures

1. **Client-Side Emergency Rollback**
   ```javascript
   // In browser console
   featureFlags.reset();
   localStorage.setItem('lokdarpan_feature_flags_override', 'reset');
   ```

2. **Server-Side Rollback**
   ```bash
   curl -X POST /api/v1/feature-flags/reset \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

3. **CDN-Level Rollback**
   - Update CDN configuration to serve previous bundle
   - No application deployment required

## Success Metrics

- **Adoption Rate**: % of users with features enabled
- **Error Rate**: Errors per feature flag state
- **Performance Impact**: Load time per feature combination
- **Rollback Frequency**: Number of emergency rollbacks
- **Developer Velocity**: Time from development to production

## References

- LaunchDarkly Best Practices: https://docs.launchdarkly.com/guides/best-practices
- Feature Toggles (Martin Fowler): https://martinfowler.com/articles/feature-toggles.html
- React Feature Flags: https://react-feature-flags.js.org/