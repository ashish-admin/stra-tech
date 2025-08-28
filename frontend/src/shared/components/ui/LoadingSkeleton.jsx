/**
 * LoadingSkeleton Component
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Provides consistent loading states across all components with different variants
 * for charts, cards, tables, and other UI elements.
 */

import React from 'react';

/**
 * LoadingSkeleton - Animated loading placeholder
 * 
 * @param {Object} props
 * @param {string} props.type - Skeleton type: 'chart', 'card', 'table', 'list', 'text'
 * @param {string} props.title - Optional title for the skeleton
 * @param {string} props.subtitle - Optional subtitle for the skeleton
 * @param {Object} props.dimensions - Dimensions for chart skeletons
 * @param {number} props.rows - Number of rows for table/list skeletons
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSkeleton = ({
  type = 'card',
  title,
  subtitle,
  dimensions = { width: '100%', height: 400 },
  rows = 5,
  className = ''
}) => {
  const baseSkeletonClass = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  const renderChartSkeleton = () => (
    <div className={`space-y-4 ${className}`} style={dimensions}>
      {/* Chart Title Skeleton */}
      {title && (
        <div className="space-y-2">
          <div className={`${baseSkeletonClass} h-6 w-3/4`}></div>
          {subtitle && <div className={`${baseSkeletonClass} h-4 w-1/2`}></div>}
        </div>
      )}
      
      {/* Chart Body Skeleton */}
      <div className="flex items-end space-x-2 h-64">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`${baseSkeletonClass} w-8`}
            style={{ 
              height: `${Math.random() * 60 + 20}%`,
              animationDelay: `${i * 0.1}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* Chart Legend Skeleton */}
      <div className="flex justify-center space-x-4 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <div className={`${baseSkeletonClass} w-4 h-4 rounded-full`}></div>
            <div className={`${baseSkeletonClass} h-4 w-16`}></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCardSkeleton = () => (
    <div className={`space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Card Header */}
      <div className="space-y-2">
        <div className={`${baseSkeletonClass} h-6 w-3/4`}></div>
        <div className={`${baseSkeletonClass} h-4 w-1/2`}></div>
      </div>
      
      {/* Card Content */}
      <div className="space-y-3">
        <div className={`${baseSkeletonClass} h-4 w-full`}></div>
        <div className={`${baseSkeletonClass} h-4 w-5/6`}></div>
        <div className={`${baseSkeletonClass} h-4 w-4/6`}></div>
      </div>
      
      {/* Card Footer */}
      <div className="flex justify-between pt-4">
        <div className={`${baseSkeletonClass} h-8 w-20`}></div>
        <div className={`${baseSkeletonClass} h-8 w-24`}></div>
      </div>
    </div>
  );

  const renderTableSkeleton = () => (
    <div className={`space-y-4 ${className}`}>
      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${baseSkeletonClass} h-5 w-3/4`}></div>
        ))}
      </div>
      
      {/* Table Rows */}
      <div className="space-y-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b dark:border-gray-600">
            <div className={`${baseSkeletonClass} h-4 w-full`}></div>
            <div className={`${baseSkeletonClass} h-4 w-5/6`}></div>
            <div className={`${baseSkeletonClass} h-4 w-4/6`}></div>
            <div className={`${baseSkeletonClass} h-4 w-3/6`}></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className={`space-y-3 ${className}`}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className={`${baseSkeletonClass} w-12 h-12 rounded-full`}></div>
          <div className="flex-1 space-y-2">
            <div className={`${baseSkeletonClass} h-5 w-3/4`}></div>
            <div className={`${baseSkeletonClass} h-4 w-1/2`}></div>
          </div>
          <div className={`${baseSkeletonClass} h-8 w-16 rounded-full`}></div>
        </div>
      ))}
    </div>
  );

  const renderTextSkeleton = () => (
    <div className={`space-y-2 ${className}`}>
      <div className={`${baseSkeletonClass} h-6 w-3/4`}></div>
      <div className={`${baseSkeletonClass} h-4 w-full`}></div>
      <div className={`${baseSkeletonClass} h-4 w-5/6`}></div>
      <div className={`${baseSkeletonClass} h-4 w-4/6`}></div>
    </div>
  );

  const renderChartContentSkeleton = () => (
    <div className="flex items-end justify-center space-x-1 h-full">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className={`${baseSkeletonClass} w-6`}
          style={{ 
            height: `${Math.random() * 70 + 10}%`,
            animationDelay: `${i * 0.05}s`
          }}
        ></div>
      ))}
    </div>
  );

  switch (type) {
    case 'chart':
      return renderChartSkeleton();
    case 'chart-content':
      return renderChartContentSkeleton();
    case 'card':
      return renderCardSkeleton();
    case 'table':
      return renderTableSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'text':
      return renderTextSkeleton();
    default:
      return renderCardSkeleton();
  }
};

export default LoadingSkeleton;