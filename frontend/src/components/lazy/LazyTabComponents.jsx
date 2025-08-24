import { lazy, Suspense } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

// Lazy load tab components for code splitting
const OverviewTab = lazy(() => import('../tabs/OverviewTab'));
const SentimentTab = lazy(() => import('../tabs/SentimentTab'));
const CompetitiveTab = lazy(() => import('../tabs/CompetitiveTab'));
const GeographicTab = lazy(() => import('../tabs/GeographicTab'));
const StrategistTab = lazy(() => import('../tabs/StrategistTab'));

// Lazy load heavy components
const StrategicWorkbench = lazy(() => import('../../features/strategist/components/StrategicWorkbench'));
const ScenarioSimulator = lazy(() => import('../../features/strategist/components/ScenarioSimulator'));
const LocationMap = lazy(() => import('../LocationMap'));

// Create wrapper components with suspense
const LazyTabComponent = ({ Component, fallback = <LoadingSpinner />, ...props }) => (
  <Suspense fallback={fallback}>
    <Component {...props} />
  </Suspense>
);

export const LazyOverviewTab = (props) => (
  <LazyTabComponent Component={OverviewTab} {...props} />
);

export const LazySentimentTab = (props) => (
  <LazyTabComponent Component={SentimentTab} {...props} />
);

export const LazyCompetitiveTab = (props) => (
  <LazyTabComponent Component={CompetitiveTab} {...props} />
);

export const LazyGeographicTab = (props) => (
  <LazyTabComponent Component={GeographicTab} {...props} />
);

export const LazyStrategistTab = (props) => (
  <LazyTabComponent 
    Component={StrategistTab} 
    fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-2 text-sm text-gray-600">Loading Political Strategist Suite...</p>
        </div>
      </div>
    }
    {...props} 
  />
);

export const LazyStrategicWorkbench = (props) => (
  <LazyTabComponent 
    Component={StrategicWorkbench}
    fallback={
      <div className="bg-white border rounded-md p-8">
        <div className="flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2 text-sm text-gray-600">Loading Strategic Workbench...</span>
        </div>
      </div>
    }
    {...props} 
  />
);

export const LazyScenarioSimulator = (props) => (
  <LazyTabComponent 
    Component={ScenarioSimulator}
    fallback={
      <div className="bg-white border rounded-md p-8">
        <div className="flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2 text-sm text-gray-600">Loading Scenario Simulator...</span>
        </div>
      </div>
    }
    {...props} 
  />
);

export const LazyLocationMap = (props) => (
  <LazyTabComponent 
    Component={LocationMap}
    fallback={
      <div className="bg-gray-50 border rounded-md p-8 h-96">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-2 text-sm text-gray-600">Loading Interactive Map...</p>
          </div>
        </div>
      </div>
    }
    {...props} 
  />
);