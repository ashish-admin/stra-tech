/**
 * DashboardTabs Component
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Enhanced tab navigation with lazy loading indicators and accessibility features.
 */

import React, { memo } from 'react';
import { LoadingSkeleton } from '@shared/components/ui';

/**
 * DashboardTabs - Enhanced tab navigation component
 */
const DashboardTabs = memo(({
  tabs = [],
  activeTab,
  onTabChange,
  loading = false,
  className = ''
}) => {
  if (loading && !activeTab) {
    return <LoadingSkeleton type="text" className="h-12" />;
  }

  return (
    <div className={`dashboard-tabs ${className}`}>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Dashboard tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={loading}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
              {loading && activeTab === tab.id && (
                <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
});

DashboardTabs.displayName = 'DashboardTabs';

export default DashboardTabs;