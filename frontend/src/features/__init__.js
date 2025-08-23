/**
 * Feature Modules
 * 
 * Export main components from each feature module.
 */

// Authentication
export { default as LoginPage } from './auth/LoginPage';

// Analytics
export { default as StrategicSummary } from './analytics/StrategicSummary';
export { default as TimeSeriesChart } from './analytics/TimeSeriesChart'; 
export { default as CompetitorTrendChart } from './analytics/CompetitorTrendChart';

// Dashboard
export { default as AlertsPanel } from './dashboard/AlertsPanel';

// Wards
export { default as LocationMap } from './wards/LocationMap';

// Strategist
export { default as PoliticalStrategist } from './strategist/components/PoliticalStrategist';