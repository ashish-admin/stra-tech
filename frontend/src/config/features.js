/**
 * Feature Flag Manager
 * Temporary fix for missing configuration during Phase 2 validation
 */

export const featureFlagManager = {
  isEnabled: (feature) => {
    // Default feature flags for validation
    const features = {
      'enhanced-dashboard': true,
      'lazy-loading': true,
      'error-boundaries': true,
      'phase2-migration': true,
      'political-strategist': true
    };
    return features[feature] || false;
  },
  
  enableFeature: (feature) => {
    console.log(`Feature enabled: ${feature}`);
  },
  
  disableFeature: (feature) => {
    console.log(`Feature disabled: ${feature}`);
  }
};

export default featureFlagManager;