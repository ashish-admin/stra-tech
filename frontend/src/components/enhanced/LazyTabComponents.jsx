import React, { Suspense, lazy } from 'react';
import { LoadingWrapper, DataTableLoader, StatsLoader, FormLoader, AlertLoader } from './LoadingAwareComponent.jsx';
import { ChartSkeleton, MapSkeleton } from '../ui/LoadingSkeleton.jsx';

/**
 * Lazy-loaded tab components with enhanced loading states
 * Optimized for LokDarpan dashboard performance
 */

// Lazy imports with proper loading states - use existing tab structure
const OverviewTabComponent = lazy(() => import('../tabs/OverviewTab.jsx'));
const SentimentTabComponent = lazy(() => import('../tabs/SentimentTab.jsx'));  
const CompetitiveTabComponent = lazy(() => import('../tabs/CompetitiveTab.jsx'));
const GeographicTabComponent = lazy(() => import('../tabs/GeographicTab.jsx'));
const StrategistTabComponent = lazy(() => import('../tabs/StrategistTab.jsx'));

// Overview Tab with comprehensive loading state
export const LazyOverviewTab = (props) => (
  <Suspense fallback={
    <div className="space-y-6">
      <StatsLoader stats={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height="h-80" showLegend={true} />
        <AlertLoader alerts={5} />
      </div>
    </div>
  }>
    <LoadingWrapper
      loading={props.loading}
      skeleton="card" 
      skeletonProps={{ content: 6, className: "h-96" }}
    >
      <OverviewTabComponent {...props} />
    </LoadingWrapper>
  </Suspense>
);

// Sentiment Tab with chart-focused loading
export const LazySentimentTab = (props) => (
  <Suspense fallback={
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height="h-64" showLegend={true} />
        <ChartSkeleton height="h-64" showLegend={false} />
      </div>
      <ChartSkeleton height="h-80" showLegend={true} />
    </div>
  }>
    <LoadingWrapper
      loading={props.loading}
      skeleton="chart"
      skeletonProps={{ height: "h-64", showLegend: true }}
    >
      <SentimentTabComponent {...props} />
    </LoadingWrapper>
  </Suspense>
);

// Competitive Tab with analytics loading
export const LazyCompetitiveTab = (props) => (
  <Suspense fallback={
    <div className="space-y-6">
      <StatsLoader stats={3} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartSkeleton height="h-72" showLegend={true} />
        <ChartSkeleton height="h-72" showLegend={true} />
      </div>
    </div>
  }>
    <LoadingWrapper
      loading={props.loading}
      skeleton="chart"
      skeletonProps={{ height: "h-72", showLegend: true }}
    >
      <CompetitiveTabComponent {...props} />
    </LoadingWrapper>
  </Suspense>
);

// Geographic Tab with map-specific loading
export const LazyGeographicTab = (props) => (
  <Suspense fallback={
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MapSkeleton height={400} />
      <div className="space-y-4">
        <StatsLoader stats={2} />
        <AlertLoader alerts={3} />
      </div>
    </div>
  }>
    <LoadingWrapper
      loading={props.loading}
      skeleton="card"
      skeletonProps={{ content: 4, className: "h-96" }}
    >
      <GeographicTabComponent {...props} />
    </LoadingWrapper>
  </Suspense>
);

// Strategist Tab with progressive loading
export const LazyStrategistTab = (props) => (
  <Suspense fallback={
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-6 w-6 bg-blue-200 rounded-full animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${90 - i * 10}%` }} />
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AlertLoader alerts={4} className="lg:col-span-2" />
        <StatsLoader stats={1} />
      </div>
    </div>
  }>
    <LoadingWrapper
      loading={props.loading}
      skeleton="card"
      skeletonProps={{ content: 5, className: "h-80" }}
    >
      <StrategistTabComponent {...props} />
    </LoadingWrapper>
  </Suspense>
);

/**
 * Enhanced Loading States for Specific Tab Content
 */

// Ward Profile Loading Component
export const WardProfileLoader = ({ className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
    <div className="flex items-center space-x-4 mb-6">
      <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse" />
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="text-center">
          <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-12 mx-auto animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

// Strategic Summary Loading Component
export const StrategicSummaryLoader = ({ className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
      <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
    </div>
    
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <div className="h-4 bg-blue-200 rounded w-full mb-2 animate-pulse" />
        <div className="h-4 bg-blue-200 rounded w-3/4 animate-pulse" />
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="h-4 w-4 bg-gray-200 rounded mt-0.5 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${85 - i * 15}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// News Feed Loading Component  
export const NewsFeedLoader = ({ items = 5, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }, (_, i) => (
      <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse" />
            </div>
            <div className="flex items-center space-x-4 mt-3">
              <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-14 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);