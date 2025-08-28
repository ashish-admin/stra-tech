/**
 * Feature Modules Barrel Exports
 * LokDarpan Phase 2: Component Reorganization
 * 
 * This file provides centralized exports for all feature modules,
 * enabling clean imports throughout the application.
 */

// Dashboard Feature
export { default as Dashboard } from './dashboard/components/Dashboard';
export { default as DashboardTabs } from './dashboard/components/DashboardTabs';
export { default as OverviewTab } from './dashboard/components/OverviewTab';

// Analytics Feature
export { default as TimeSeriesChart } from './analytics/components/TimeSeriesChart';
export { default as CompetitorTrendChart } from './analytics/components/CompetitorTrendChart';
export { default as EmotionChart } from './analytics/components/EmotionChart';

// Geographic Feature
export { default as LocationMap } from './geographic/components/LocationMap';
export { default as WardMetaPanel } from './geographic/components/WardMetaPanel';

// Strategist Feature
export { default as PoliticalStrategist } from './strategist/components/PoliticalStrategist';
export { default as StrategistStream } from './strategist/components/StrategistStream';
export { default as AnalysisControls } from './strategist/components/AnalysisControls';

// Auth Feature
export { default as LoginPage } from './auth/components/LoginPage';

// Shared Components
export * from '../shared/components';
export * from '../shared/hooks';
export * from '../shared/services';